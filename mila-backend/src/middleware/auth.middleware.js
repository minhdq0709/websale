const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const cache = require('../config/cache');

const JWT_SECRET = process.env.JWT_SECRET || 'mila_secret_jwt_key_2026';

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // 1. Lay token tu Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // [M2 FIX] Không lấy accessToken từ cookie nữa để tránh CSRF

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.',
        code: 'UNAUTHORIZED'
      });
    }

    // 3. Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ.',
        code: 'INVALID_TOKEN'
      });
    }

    // 4. Check blacklisted/revoked token trong cache neu co (cho tinh nang logout)
    const isBlacklisted = await cache.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Phiên làm việc đã đăng xuất.',
        code: 'REVOKED_TOKEN'
      });
    }

    // 5. Lay user tu DB/Cache va kiem tra trang thai hoat dong
    const userId = decoded.id;
    const cacheKey = `user:${userId}`;
    let user = await cache.get(cacheKey);

    if (!user) {
      const [rows] = await pool.query(
        'SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?',
        [userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tài khoản không tồn tại trên hệ thống.',
          code: 'USER_NOT_FOUND'
        });
      }
      user = rows[0];
      // Cache user info trong 30 giay
      await cache.set(cacheKey, user, 30);
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa.',
        code: 'USER_BLOCKED'
      });
    }

    // Gan thong tin user vao request
    req.user = user;
    req.token = token; // De dung khi can blacklist token nay o route logout
    next();
  } catch (error) {
    console.error('Lỗi Auth Middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống trong quá trình xác thực.',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = authMiddleware;
