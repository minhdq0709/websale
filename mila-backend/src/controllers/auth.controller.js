const UserModel = require('../models/user.model');
const TokenModel = require('../models/token.model');
const jwt = require('jsonwebtoken');

// [M3 FIX] Throw ngay khi khởi động nếu thiếu secrets — không dùng fallback yếu
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('[FATAL] JWT_SECRET và JWT_REFRESH_SECRET là bắt buộc. Kiểm tra file .env!');
}
// Bao ve chong brute-force JWT: secret qua ngan de bi crack
if (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32) {
  throw new Error('[FATAL] JWT_SECRET và JWT_REFRESH_SECRET phải có ít nhất 32 ký tự để đảm bảo bảo mật!');
}

// Cac thoi gian het han cua token
// [C3 FIX] Access token ngắn hơn (15 phút thay vì 1 giờ) — giảm cửa sổ tấn công
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 ngay

/**
 * Tao Access Token va Refresh Token cho user
 */
const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  
  const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { 
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` 
  });

  return { accessToken, refreshToken };
};

const AuthController = {
  /**
   * DANG KY TAI KHOAN MOI
   */
  async register(req, res) {
    try {
      // [C3 FIX] Không destructure 'role' từ req.body — client không được chọn role
      const { name, email, phone, password } = req.body;

      // 1. Kiem tra email da ton tai chua
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email này đã được sử dụng trên hệ thống.',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }

      // Kiem tra so dien thoai da ton tai chua
      const existingPhone = await UserModel.findByPhone(phone);
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'Số điện thoại này đã được sử dụng trên hệ thống.',
          code: 'PHONE_ALREADY_EXISTS'
        });
      }

      // 2. Tao user moi — [C3 FIX] role luôn là 'customer', không nhận từ client
      const userId = await UserModel.create({
        name,
        email,
        phone,
        password,
        role: 'customer'
      });

      // 3. Lay lai thong tin user vua tao
      const newUser = await UserModel.findById(userId);

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công.',
        data: {
          user: newUser
        }
      });
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra trong quá trình đăng ký tài khoản.',
        code: 'REGISTRATION_ERROR'
      });
    }
  },

  /**
   * DANG NHAP TAI KHOAN
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // 1. Kiem tra user ton tai theo email hoac so dien thoai
      const user = await UserModel.findByEmailOrPhone(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email, số điện thoại hoặc mật khẩu không chính xác.',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // 2. Kiem tra tai khoan co dang hoat dong khong
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị khóa.',
          code: 'USER_BLOCKED'
        });
      }

      // 3. So sanh mat khau
      const isMatch = await UserModel.comparePassword(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Email, số điện thoại hoặc mật khẩu không chính xác.',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // 4. Sinh tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // 5. Luu Refresh Token vao Database
      // [M6 FIX] TokenModel.create tự động giới hạn MAX_SESSIONS_PER_USER = 5
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

      // [L4 FIX] Lấy IP an toàn hơn — ưu tiên header chuẩn nếu đã tin tưởng proxy
      const ipAddress = req.ip || req.socket.remoteAddress;

      await TokenModel.create({
        userId: user.id,
        token: refreshToken,
        ipAddress,
        expiresAt
      });

      // 6. Set refresh token vao HttpOnly cookie de bao mat CSRF/XSS
      // sameSite: 'strict' — cookie không được gửi trong bất kỳ cross-site request nào
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,   // Không đọc được từ JavaScript
        secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS
        sameSite: 'strict', // Chặn gửi cookie trong cross-site request
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000 // 7 ngay
      });

      // Tra ve thong tin user & access token
      const userProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      };

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công.',
        data: {
          token: accessToken,
          user: userProfile
        }
      });
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra trong quá trình đăng nhập.',
        code: 'LOGIN_ERROR'
      });
    }
  },

  /**
   * LAM MOI ACCESS TOKEN BANG REFRESH TOKEN
   */
  async refresh(req, res) {
    try {
      // [M2 FIX] Chỉ lấy refresh token từ HttpOnly cookie, không chấp nhận từ body
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Không tìm thấy refresh token.',
          code: 'NO_REFRESH_TOKEN'
        });
      }

      // 1. Verify Refresh Token chu ky
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token đã hết hạn hoặc không hợp lệ.',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }

      // 2. Kiem tra Refresh Token trong DB co con han hay bi thu hoi chua
      const dbToken = await TokenModel.find(refreshToken);
      if (!dbToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token đã bị thu hồi hoặc không hợp lệ.',
          code: 'REVOKED_REFRESH_TOKEN'
        });
      }

      // 3. Lay user profile va kiem tra trang thai hoat dong
      const user = await UserModel.findById(dbToken.user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng.',
          code: 'USER_NOT_FOUND'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị khóa.',
          code: 'USER_BLOCKED'
        });
      }

      // 4. Sinh Access Token moi
      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      return res.status(200).json({
        success: true,
        message: 'Tạo mới phiên truy cập thành công.',
        data: {
          token: newAccessToken
        }
      });
    } catch (error) {
      console.error('Lỗi làm mới token:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra trong quá trình gia hạn phiên làm việc.',
        code: 'REFRESH_ERROR'
      });
    }
  },

  /**
   * DANG XUAT
   */
  async logout(req, res) {
    try {
      // [M2 FIX] Chỉ lấy refresh token từ HttpOnly cookie
      const refreshToken = req.cookies.refreshToken;

      // Thu hoi refresh token trong DB neu co truyen vao
      if (refreshToken) {
        await TokenModel.revoke(refreshToken);
      }

      // Xoa cookie refresh token o client
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' // Giữ nhất quán với thiết lập khi set cookie
      });

      return res.status(200).json({
        success: true,
        message: 'Đăng xuất tài khoản thành công.'
      });
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra trong quá trình đăng xuất.',
        code: 'LOGOUT_ERROR'
      });
    }
  }
};

module.exports = AuthController;
