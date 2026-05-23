const OrderModel = require('../models/order.model');

const OrderController = {
  /**
   * DAT HANG (TAO DON HANG TU GIO HANG)
   */
  async createOrder(req, res) {
    try {
      const userId = req.user.id;
      const { shipping_address, note } = req.body;

      const orderId = await OrderModel.createOrder(userId, { shipping_address, note });

      return res.status(201).json({
        success: true,
        message: 'Đặt hàng thành công. Đơn hàng của bạn đang được xử lý.',
        data: {
          orderId
        }
      });
    } catch (error) {
      console.error('Lỗi đặt hàng:', error);

      // Tra ve loi than thien tuy thuoc vao message nem ra tu model
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
      const orders = await OrderModel.findByUserId(userId);

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng thành công.',
        data: orders
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

      // Bao mat quyen truy cap:
      // Chi cho phep chu don hang HOAC Admin HOAC Staff xem thong tin chi tiet
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

      // 1. Kiem tra xem don hang co ton tai va thuoc ve user do khong
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

      // Chi cho phep huy neu dang pending hoac processing
      if (order.status !== 'pending' && order.status !== 'processing') {
        return res.status(400).json({
          success: false,
          message: 'Không thể hủy đơn hàng do đơn đã được giao đi hoặc đã hoàn thành.',
          code: 'ORDER_FINALIZED'
        });
      }

      // 2. Cap nhat trang thai thanh cancelled va tra lai ton kho
      await OrderModel.updateStatus(parseInt(id), 'cancelled', userId);

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
