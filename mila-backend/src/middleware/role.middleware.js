/**
 * Middleware kiem tra quyen truy cap dua tren Role cua User
 * @param {string[]} allowedRoles - Danh sach cac role duoc phep truy cap (e.g. ['admin', 'staff'])
 */
const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Không tìm thấy thông tin xác thực người dùng.',
          code: 'UNAUTHORIZED'
        });
      }

      const { role } = req.user;

      // Neu khong truyen role nao, hoac role cua user nam trong danh sach cho phep
      if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này.',
        code: 'FORBIDDEN_ACCESS'
      });
    } catch (error) {
      console.error('Lỗi Role Middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống trong quá trình kiểm tra quyền hạn.',
        code: 'ROLE_ERROR'
      });
    }
  };
};

module.exports = roleMiddleware;
