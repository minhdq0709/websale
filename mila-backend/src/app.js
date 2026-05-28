const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const { loggerMiddleware, logger } = require('./middleware/logger.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const sanitizeMiddleware = require('./middleware/sanitize.middleware');
const apiRouter = require('./routes');

const app = express();

// ==========================================
// MIDDLEWARES NỀN TẢNG (SECURITY & PARSING)
// ==========================================

// 1. Helmet bảo mật HTTP headers (Tùy chỉnh CSP để chạy mượt mà trên môi trường dev)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "*"],
      connectSrc: ["'self'", "*"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS chia sẻ tài nguyên nguồn chéo
app.use(cors({
  origin: true, // Cho phép mọi nguồn ở dev, có thể cấu hình cụ thể ở prod
  credentials: true // Cho phép truyền cookies
}));

// 3. Giới hạn tần suất chung cho toàn bộ API
app.use('/api', apiLimiter);

// 4. Phân tích cú pháp request body & cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. Làm sạch dữ liệu đầu vào chống XSS toàn cầu
app.use(sanitizeMiddleware);

// 6. Ghi log tự động mọi request tới hệ thống
app.use(loggerMiddleware);

// ==========================================
// TÀI NGUYÊN TĨNH & ROUTING
// ==========================================

// Phục vụ các file tĩnh ở thư mục public (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Gắn cụm API chính thức
app.use('/api/v1', apiRouter);

// Fallback phục vụ file index.html cho mọi route không khớp ở public (để SPA hoạt động nếu cần)
app.get('*', (req, res, next) => {
  // Nếu là request API bị sai, trả về 404 JSON thay vì trả về HTML
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ==========================================
// XỬ LÝ LỖI TOÀN HỆ THỐNG
// ==========================================

// 1. Bắt các API route không tồn tại (404 Not Found)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' không tồn tại.`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// 2. Middleware xử lý lỗi tập trung (500 Internal Server Error)
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  // Ghi nhận lỗi chi tiết vào Winston logs
  logger.error(`${req.method} ${req.originalUrl} - Lỗi hệ thống: ${err.message}`, err);

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Có lỗi hệ thống nghiêm trọng xảy ra. Vui lòng thử lại sau.' 
      : err.message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    // Chỉ hiển thị stack trace lỗi ở môi trường phát triển (dev)
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

module.exports = app;
