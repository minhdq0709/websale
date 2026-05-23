const UserModel = require('../models/user.model');
const cache = require('../config/cache');

const UserController = {
  /**
   * XEM THONG TIN HO SO CA NHAN
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await UserModel.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin tài khoản.',
          code: 'USER_NOT_FOUND'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin tài khoản thành công.',
        data: user
      });
    } catch (error) {
      console.error('Lỗi lấy profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải thông tin cá nhân.',
        code: 'PROFILE_FETCH_ERROR'
      });
    }
  },

  /**
   * CAP NHAT HO SO CA NHAN
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, phone } = req.body;

      const isUpdated = await UserModel.updateProfile(userId, { name, phone });

      if (!isUpdated) {
        return res.status(400).json({
          success: false,
          message: 'Cập nhật thông tin cá nhân thất bại.',
          code: 'PROFILE_UPDATE_FAILED'
        });
      }

      // Xóa cache user cũ để middleware tự động load lại dữ liệu mới nhất
      await cache.del(`user:${userId}`);

      const updatedUser = await UserModel.findById(userId);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin cá nhân thành công.',
        data: updatedUser
      });
    } catch (error) {
      console.error('Lỗi cập nhật profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật thông tin.',
        code: 'PROFILE_UPDATE_ERROR'
      });
    }
  },

  /**
   * DOI MAT KHAU TAI KHOAN
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body;

      // 1. Lấy thông tin user (gồm password_hash để so sánh)
      const user = await UserModel.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Tài khoản không tồn tại.',
          code: 'USER_NOT_FOUND'
        });
      }

      // 2. Xác thực mật khẩu cũ
      const isMatch = await UserModel.comparePassword(oldPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại không chính xác.',
          code: 'OLD_PASSWORD_INCORRECT'
        });
      }

      // 3. Đổi mật khẩu mới
      const isUpdated = await UserModel.updatePassword(userId, newPassword);
      if (!isUpdated) {
        return res.status(400).json({
          success: false,
          message: 'Thay đổi mật khẩu thất bại.',
          code: 'PASSWORD_CHANGE_FAILED'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Thay đổi mật khẩu tài khoản thành công.'
      });
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi thay đổi mật khẩu.',
        code: 'PASSWORD_CHANGE_ERROR'
      });
    }
  }
};

module.exports = UserController;
