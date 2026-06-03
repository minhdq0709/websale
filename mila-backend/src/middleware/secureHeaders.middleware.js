// ==========================================
// SECURE RESPONSE HEADERS MIDDLEWARE
// ==========================================
// Bổ sung các header bảo mật mà Helmet chưa cover:
//   1. Cache-Control  — ngăn browser/proxy cache dữ liệu API nhạy cảm
//   2. Permissions-Policy — tắt các Web API browser không cần thiết

/**
 * Thêm response headers bảo mật bổ sung cho mọi response.
 * Đặt middleware này SAU helmet() trong app.js.
 */
const secureHeaders = (req, res, next) => {
  // --- Cache-Control cho API ---
  // Ngăn browser, CDN, proxy cache response chứa dữ liệu người dùng
  // (đơn hàng, giỏ hàng, thông tin tài khoản, token...)
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');   // Tương thích HTTP/1.0
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store'); // Cho Varnish / CDN
  }

  // --- Permissions Policy ---
  // Tắt các Web API browser không cần thiết để thu hẹp bề mặt tấn công.
  // payment=(self) — cho phép Payment Request API nếu sau này tích hợp
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()'
  );

  next();
};

module.exports = secureHeaders;
