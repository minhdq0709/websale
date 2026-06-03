const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const compression = require('compression');

const { loggerMiddleware, logger } = require('./middleware/logger.middleware');
const { apiLimiter, authLimiter, orderLimiter } = require('./middleware/rateLimiter.middleware');
const sanitizeMiddleware = require('./middleware/sanitize.middleware');
const secureHeaders = require('./middleware/secureHeaders.middleware');
const apiRouter = require('./routes');

const app = express();

// ==========================================
// MIDDLEWARES NỀN TẢNG (SECURITY & PARSING)
// ==========================================

// 0. Gzip / Deflate Compression — giảm 60–70% kích thước response
// Áp dụng cho text/html, text/css, application/javascript, application/json...
// threshold: 1kb — không compress file rất nhỏ (overhead không đáng)
app.use(compression({ threshold: 1024 }));

// 1. Helmet bảo mật HTTP headers
// CSP: loại bỏ unsafe-eval (cho phép XSS qua eval). unsafe-inline giữ lại tạm thời
// cho các CDN script inline ở môi trường dev — cân nhắc dùng nonce ở production.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // unsafe-eval đã được xóa — ngăn chặn eval() / Function() tấn công XSS
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://img.vietqr.io", "https://lh3.googleusercontent.com"],
      // connectSrc chỉ cho phép chính mình — không mở wildcard *
      connectSrc: ["'self'"],
      // Chặn tải frame từ bên ngoài (chống clickjacking)
      frameAncestors: ["'none'"],
      // Chỉ cho phép submit form về chính domain
      formAction: ["'self'"],
    },
  },
  // HSTS: bắt buộc HTTPS trong 1 năm, bao gồm subdomain, sẵn sàng preload
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Chính sách referrer an toàn — không lộ URL nội bộ sang bên ngoài
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Chặn Adobe/PDF cross-domain — phòng thủ theo chiều sâu
  permittedCrossDomainPolicies: false,
  // X-Content-Type-Options: nosniff — ngăn MIME sniffing
  noSniff: true,
  crossOriginResourcePolicy: { policy: "same-site" }
}));

// 1b. Secure Response Headers bổ sung (Cache-Control + Permissions-Policy)
// Helmet không tự set những header này — cần đặt trước CORS để áp dụng cho mọi response
app.use(secureHeaders);

// 2. CORS — chỉ cho phép các origin được cấu hình trong biến môi trường
// origin: true + credentials: true = bất kỳ site nào cũng có thể gọi API kèm cookie → CSRF risk
const rawOrigins = process.env.CLIENT_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép các request không có origin (Postman, mobile app, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin '${origin}' không được phép truy cập.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Giới hạn tần suất chung cho toàn bộ API
app.use('/api', apiLimiter);

// Rate limiter đặc biệt cho các endpoint nhạy cảm (Được cấu hình cục bộ trong routes)
// Auth: 15 lần / 15 phút (đã áp dụng tại route level trong auth.routes.js)
// Order/Payment: rate limiter riêng áp dụng cụ thể tại order.routes.js cho giao dịch thực tế


// 4. Phân tích cú pháp request body & cookies
// Giảm từ 10mb → 100kb để phòng chống DoS / Memory exhaustion
// Upload ảnh sản phẩm nên đi qua route riêng với multer + giới hạn riêng
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// 5. Làm sạch dữ liệu đầu vào chống XSS toàn cầu
app.use(sanitizeMiddleware);

// 6. Ghi log tự động mọi request tới hệ thống
app.use(loggerMiddleware);

// ==========================================
// TÀI NGUYÊN TĨNH & ROUTING
// ==========================================

// Phục vụ các file tĩnh ở thư mục public (Frontend)
// Cache-Control thông minh:
//   - .html           → no-cache (browser revalidate bằng ETag, không cache cứng)
//   - .js / .css      → 1 năm immutable (tên file thường không đổi trừ khi deploy mới)
//   - ảnh / font      → 1 ngày
app.use(express.static(path.join(__dirname, '../public'), {
  etag: true,        // ETag để revalidate hiệu quả (304 Not Modified)
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      // HTML: revalidate mỗi lần nhưng dùng ETag — tránh nội dung stale
      res.setHeader('Cache-Control', 'no-cache');
    } else if (ext === '.js' || ext === '.css') {
      // JS/CSS: cache 1 năm — immutable vì khi deploy mới tên file giữ nguyên
      // Nếu sau này bạn thêm content hash vào tên file, đây là tối ưu hoàn hảo
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (['.png','.jpg','.jpeg','.webp','.gif','.svg','.ico'].includes(ext)) {
      // Ảnh: cache 1 ngày
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (['.woff','.woff2','.ttf','.otf'].includes(ext)) {
      // Font: cache 1 năm
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

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
