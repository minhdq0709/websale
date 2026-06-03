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
  max: 10, // Toi da 10 lan thu trong 15 phut (giam tu 15 xuong 10 theo best practice)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Thử quá nhiều lần thất bại. Vui lòng đợi 15 phút trước khi thử lại.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

// Limiter cho cac route dat hang / giao dich thanh toan
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 gio
  max: 20, // Toi da 20 giao dich / gio moi IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã thực hiện quá nhiều giao dịch. Vui lòng thử lại sau 1 giờ.',
    code: 'ORDER_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  orderLimiter
};
