const rateLimit = require('express-rate-limit');

// Limiter chung cho tat ca cac API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phut
  max: 300, // Gioi han 300 requests moi IP tren 15 phut
  standardHeaders: true, // Tra ve thong tin rate limit trong headers `RateLimit-*`
  legacyHeaders: false, // Tat headers `X-RateLimit-*` cu
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.',
    code: 'TOO_MANY_REQUESTS'
  }
});

// Limiter nghiem ngat cho dang nhap / dang ky / lay lai mat khau
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phut
  max: 15, // Toi da 15 lan thu trong 15 phut
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Thử quá nhiều lần thất bại. Vui lòng đợi 15 phút trước khi thử lại.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
