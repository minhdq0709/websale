const OrderModel = require('../models/order.model');
const UserModel = require('../models/user.model');
const crypto = require('crypto');
const paymentCrypto = require('../utils/payment-crypto.util');
const { URL } = require('url');

const OrderController = {
  /**
   * YÊU CẦU GỬI MÃ OTP THANH TOÁN (Mã hóa bất đối xứng thuần toán học - Không ghi DB)
   */
  async requestOTP(req, res) {
    try {
      const userId = req.user.id;

      // 1. Lay thong tin user de tim hoac tao Private Key (otp_secret)
      const user = await UserModel.findByIdWithOtp(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin người dùng.'
        });
      }

      // 2. Tao khoa bi mat rieng biet (Private Key) neu chua co
      let otpSecret = user.otp_secret;
      if (!otpSecret) {
        otpSecret = crypto.randomBytes(32).toString('hex');
        await UserModel.updateOtpSecret(userId, otpSecret);
      }

      // 3. Sinh ma OTP 6 chu so thuan toan hoc dua tren Private Key va chu ky thoi gian 3 phut
      // [C5 FIX] Giam thoi gian song OTP tu 5 phut xuong 3 phut
      const OTP_TIME_STEP = 3 * 60 * 1000;
      const timeBlock = Math.floor(Date.now() / OTP_TIME_STEP);

      const hmac = crypto.createHmac('sha256', otpSecret);
      hmac.update(timeBlock.toString());
      const hash = hmac.digest('hex');
      const otpCode = (parseInt(hash.substring(0, 8), 16) % 1000000).toString().padStart(6, '0');

      // 4. Ghi log gia lap gui tin nhan SMS toi so dien thoai khach hang (Khong luu DB!)
      // [C4 FIX] Khong tra ve OTP cho client o bat ky moi truong nao
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📬 [SMS Simulator to ${user.phone || 'customer'}] (TOTP) Mã OTP thanh toán của bạn là: ${otpCode}. Mã có hiệu lực trong 3 phút.\n`);
      }

      return res.status(200).json({
        success: true,
        message: 'Mã xác thực OTP đã được gửi thành công.'
        // [C4 FIX] Da xoa `demoOtp` khoi response payload
      });
    } catch (error) {
      console.error('Lỗi yêu cầu OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo mã OTP. Vui lòng thử lại.',
        code: 'OTP_GEN_ERROR'
      });
    }
  },

  /**
   * LẤY THÔNG TIN TÀI KHOẢN NGÂN HÀNG (ĐÃ MÃ HÓA)
   */
  async getPaymentInfo(req, res) {
    try {
      const bankName = process.env.BANK_NAME || 'Vietcombank (VCB)';
      const bankAccount = process.env.BANK_ACCOUNT || '1023456789';
      const bankOwner = process.env.BANK_OWNER || 'CONG TY TNHH PURE VITALITY MARKET';
      const bankCode = process.env.BANK_CODE || 'VCB';

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin thanh toán thành công.',
        data: {
          bankName,
          bankAccount: bankAccount,
          bankOwner,
          bankCode: bankCode
        }
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin ngân hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải thông tin thanh toán.',
        code: 'PAYMENT_INFO_ERROR'
      });
    }
  },

  /**
   * TẢI ẢNH QR CODE TỪ VIETQR QUA PROXY ĐỂ TRÁNH LỖI CORS
   */
  async downloadQR(req, res) {
    try {
      const { url, code } = req.query;
      
      // [M1 FIX] Validate URL chặt chẽ hơn để chống SSRF
      if (!url) {
        return res.status(400).json({ success: false, message: 'URL tải ảnh không hợp lệ.' });
      }

      try {
        const parsedUrl = new URL(url);
        // Kiem tra ca hostname va protocol: chi cho phep HTTPS tu img.vietqr.io
        // Chong HTTP downgrade va SSRF bypass qua userinfo (http://img.vietqr.io@evil.com)
        if (parsedUrl.hostname !== 'img.vietqr.io' || parsedUrl.protocol !== 'https:') {
          return res.status(403).json({ success: false, message: 'Chỉ hỗ trợ tải ảnh HTTPS từ img.vietqr.io' });
        }
      } catch (e) {
        return res.status(400).json({ success: false, message: 'URL định dạng không hợp lệ.' });
      }

      // [M1 FIX] Sanitize code parameter
      const safeCode = (code || 'order').replace(/[^a-zA-Z0-9-]/g, '');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Không thể fetch ảnh từ VietQR.');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const filename = `MilaMarket-QR-ThanhToan-${safeCode}.png`;
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error) {
      console.error('Lỗi tải QR qua proxy:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải ảnh QR.'
      });
    }
  },

  /**
   * DAT HANG (TAO DON HANG TU GIO HANG - XÁC THỰC OTP THUẦN TOÁN HỌC)
   */
  async createOrder(req, res) {
    try {
      const userId = req.user.id;
      const { shipping_address, note, otp } = req.body;

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: 'Mã xác thực OTP là bắt buộc để xác nhận đơn hàng.',
          code: 'OTP_REQUIRED'
        });
      }

      // 1. Lay thong tin email, so dien thoai, va Private Key (otp_secret) cua nguoi dung
      const user = await UserModel.findByIdWithOtp(req.user.id);
      if (!user || !user.otp_secret) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy yêu cầu gửi mã OTP hợp lệ. Vui lòng yêu cầu mã OTP mới.',
          code: 'OTP_NOT_FOUND'
        });
      }

      // 2. Tái tính toán mã OTP hợp lệ thuần toán học theo chu kỳ hiện tại và chu kỳ liền trước
      // [C5 FIX] Giảm thời gian sống OTP từ 5 phút xuống 3 phút
      const OTP_TIME_STEP = 3 * 60 * 1000;
      const timeBlock = Math.floor(Date.now() / OTP_TIME_STEP);

      // Tính mã OTP của khối thời gian hiện tại
      const hmacCurrent = crypto.createHmac('sha256', user.otp_secret);
      hmacCurrent.update(timeBlock.toString());
      const hashCurrent = hmacCurrent.digest('hex');
      const otpCurrent = (parseInt(hashCurrent.substring(0, 8), 16) % 1000000).toString().padStart(6, '0');

      // Tính mã OTP của khối thời gian liền trước (sai số lệch múi giờ tối đa 3 phút)
      const hmacPrev = crypto.createHmac('sha256', user.otp_secret);
      hmacPrev.update((timeBlock - 1).toString());
      const hashPrev = hmacPrev.digest('hex');
      const otpPrev = (parseInt(hashPrev.substring(0, 8), 16) % 1000000).toString().padStart(6, '0');

      // 3. So khớp trực tiếp OTP người dùng gửi lên
      if (String(otp) !== otpCurrent && String(otp) !== otpPrev) {
        return res.status(400).json({
          success: false,
          message: 'Mã xác thực OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại.',
          code: 'INVALID_OTP'
        });
      }

      // [C5 FIX] Doi otp_secret ngay lap tuc de chong Replay Attack (OTP khong the dung lai)
      const newOtpSecret = crypto.randomBytes(32).toString('hex');
      await UserModel.updateOtpSecret(userId, newOtpSecret);

      // 4. Tiến hành tạo đơn hàng và trừ kho hàng trong Database
      // [L6 FIX] Truyền IP và User-Agent để ghi Audit Log
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const orderId = await OrderModel.createOrder(userId, { shipping_address, note }, ipAddress, userAgent);

      return res.status(201).json({
        success: true,
        message: 'Đặt hàng thành công. Đơn hàng của bạn đã được khởi tạo.',
        data: {
          orderId
        }
      });


    } catch (error) {
      console.error('Lỗi đặt hàng:', error);

      if (error.message === 'CART_EMPTY') {
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt hàng do giỏ hàng của bạn đang trống.',
          code: 'CART_EMPTY'
        });
      }
      if (error.message.startsWith('PRODUCT_INACTIVE:')) {
        const productName = error.message.split(':')[1];
        return res.status(400).json({
          success: false,
          message: `Sản phẩm '${productName}' hiện tại đã ngừng kinh doanh. Vui lòng xóa khỏi giỏ hàng trước khi đặt hàng.`,
          code: 'PRODUCT_INACTIVE'
        });
      }
      if (error.message.startsWith('INSUFFICIENT_STOCK:')) {
        const productName = error.message.split(':')[1];
        return res.status(400).json({
          success: false,
          message: `Sản phẩm '${productName}' không đủ số lượng hàng trong kho. Vui lòng điều chỉnh lại số lượng giỏ hàng.`,
          code: 'INSUFFICIENT_STOCK'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.',
        code: 'ORDER_CREATE_ERROR'
      });
    }
  },

  /**
   * LAY DANH SACH DON HANG CUA KHACH HANG DANG DANG NHAP
   */
  async getMyOrders(req, res) {
    try {
      const userId = req.user.id;
      // Pagination: mac dinh 10 don/trang, toi da 50 de tranh response qua lon
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

      const result = await OrderModel.findByUserId(userId, { page, limit });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng thành công.',
        data: result
      });
    } catch (error) {
      console.error('Lỗi lấy đơn hàng cá nhân:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải lịch sử mua hàng.',
        code: 'MY_ORDERS_FETCH_ERROR'
      });
    }
  },

  /**
   * LAY CHI TIET DON HANG THEO ID (Co check phan quyen)
   */
  async getOrderById(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { id } = req.params;

      const order = await OrderModel.findById(parseInt(id));

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng yêu cầu.',
          code: 'ORDER_NOT_FOUND'
        });
      }

      if (order.user_id !== userId && userRole !== 'admin' && userRole !== 'staff') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập thông tin đơn hàng này.',
          code: 'FORBIDDEN_ACCESS'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết đơn hàng thành công.',
        data: order
      });
    } catch (error) {
      console.error('Lỗi lấy chi tiết đơn hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải thông tin đơn hàng.',
        code: 'ORDER_DETAIL_ERROR'
      });
    }
  },

  /**
   * KHACH HANG HUY DON HANG (Chi ap dung khi trang thai la pending hoac processing)
   */
  async cancelOrder(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const order = await OrderModel.findById(parseInt(id));
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng yêu cầu.',
          code: 'ORDER_NOT_FOUND'
        });
      }

      if (order.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền hủy đơn hàng này.',
          code: 'FORBIDDEN_ACCESS'
        });
      }

      if (order.status !== 'pending' && order.status !== 'processing') {
        return res.status(400).json({
          success: false,
          message: 'Không thể hủy đơn hàng do đơn đã được giao đi hoặc đã hoàn thành.',
          code: 'ORDER_FINALIZED'
        });
      }

      // [L6 FIX] Truyền IP và User-Agent để ghi Audit Log
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'Unknown';
      
      await OrderModel.updateStatus(parseInt(id), 'cancelled', userId, ipAddress, userAgent);

      return res.status(200).json({
        success: true,
        message: 'Hủy đơn hàng thành công. Các mặt hàng đã được hoàn trả lại kho.'
      });
    } catch (error) {
      console.error('Lỗi hủy đơn hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra trong quá trình hủy đơn hàng.',
        code: 'ORDER_CANCEL_ERROR'
      });
    }
  }
};

module.exports = OrderController;
