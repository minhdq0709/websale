const DOMPurify = require('isomorphic-dompurify');

/**
 * XSS Sanitization Middleware
 * Tự động quét và làm sạch tất cả dữ liệu chuỗi đầu vào trong req.body, req.query, req.params
 * giúp ngăn ngừa các cuộc tấn công Stored XSS và Reflected XSS.
 */
const sanitizeMiddleware = (req, res, next) => {
  // Hàm đệ quy làm sạch các object lồng nhau
  const sanitizeObject = (obj) => {
    if (!obj) return;
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string') {
          // Lọc nội dung HTML độc hại từ chuỗi string
          obj[key] = DOMPurify.sanitize(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Xử lý đệ quy cho object con hoặc mảng
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  // Làm sạch các payload gửi từ client lên
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = sanitizeMiddleware;
