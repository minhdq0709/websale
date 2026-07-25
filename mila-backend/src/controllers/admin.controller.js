const ProductModel = require('../models/product.model');
const OrderModel = require('../models/order.model');
const UserModel = require('../models/user.model');
const cache = require('../config/cache');

const AdminController = {
  // ==========================================
  // QUẢN LÝ SAN PHẨM (PRODUCT CRUD)
  // ==========================================
  
  async createProduct(req, res) {
    try {
      const { category_id, name, price, sale_price, unit, stock, description, images, is_active } = req.body;

      const productId = await ProductModel.create({
        category_id,
        name,
        price,
        sale_price,
        unit,
        stock,
        description,
        images,
        is_active
      });

      const newProduct = await ProductModel.findById(productId);

      return res.status(201).json({
        success: true,
        message: 'Thêm sản phẩm mới thành công.',
        data: newProduct
      });
    } catch (error) {
      console.error('Lỗi Admin createProduct:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi tạo sản phẩm.',
        code: 'ADMIN_CREATE_PRODUCT_ERROR'
      });
    }
  },

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const isUpdated = await ProductModel.update(parseInt(id), req.body);

      if (!isUpdated) {
        return res.status(404).json({
          success: false,
          message: 'Sản phẩm không tồn tại hoặc dữ liệu cập nhật không thay đổi.',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      const updatedProduct = await ProductModel.findById(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công.',
        data: updatedProduct
      });
    } catch (error) {
      console.error('Lỗi Admin updateProduct:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi cập nhật sản phẩm.',
        code: 'ADMIN_UPDATE_PRODUCT_ERROR'
      });
    }
  },

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const isDeleted = await ProductModel.delete(parseInt(id));

      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Sản phẩm không tồn tại.',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Xóa sản phẩm thành công.'
      });
    } catch (error) {
      console.error('Lỗi Admin deleteProduct:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi xóa sản phẩm.',
        code: 'ADMIN_DELETE_PRODUCT_ERROR'
      });
    }
  },

  // ==========================================
  // QUẢN LÝ DANH MỤC (CATEGORY CRUD)
  // ==========================================

  async createCategory(req, res) {
    try {
      const { name, parent_id } = req.body;
      const categoryId = await ProductModel.createCategory({ name, parent_id });

      const [categories] = await ProductModel.findCategories();
      
      return res.status(201).json({
        success: true,
        message: 'Tạo danh mục mới thành công.',
        data: {
          id: categoryId,
          name,
          parent_id
        }
      });
    } catch (error) {
      console.error('Lỗi Admin createCategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi tạo danh mục.',
        code: 'ADMIN_CREATE_CATEGORY_ERROR'
      });
    }
  },

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, parent_id } = req.body;

      const isUpdated = await ProductModel.updateCategory(parseInt(id), { name, parent_id });

      if (!isUpdated) {
        return res.status(404).json({
          success: false,
          message: 'Danh mục không tồn tại hoặc dữ liệu cập nhật không đổi.',
          code: 'CATEGORY_NOT_FOUND'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật danh mục thành công.'
      });
    } catch (error) {
      console.error('Lỗi Admin updateCategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi cập nhật danh mục.',
        code: 'ADMIN_UPDATE_CATEGORY_ERROR'
      });
    }
  },

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const isDeleted = await ProductModel.deleteCategory(parseInt(id));

      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Danh mục không tồn tại.',
          code: 'CATEGORY_NOT_FOUND'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Xóa danh mục thành công.'
      });
    } catch (error) {
      console.error('Lỗi Admin deleteCategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi xóa danh mục.',
        code: 'ADMIN_DELETE_CATEGORY_ERROR'
      });
    }
  },

  // ==========================================
  // QUẢN LÝ ĐƠN HÀNG (ORDER MANAGEMENT)
  // ==========================================

  async getAllOrders(req, res) {
    try {
      const { status, page, limit } = req.query;
      const parsedLimit = limit ? parseInt(limit) : 10;
      const result = await OrderModel.findAll({
        status: status || null,
        page: page ? parseInt(page) : 1,
        limit: parsedLimit > 100 ? 100 : parsedLimit
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng toàn hệ thống thành công.',
        data: result
      });
    } catch (error) {
      console.error('Lỗi Admin getAllOrders:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi tải danh sách đơn hàng.',
        code: 'ADMIN_FETCH_ORDERS_ERROR'
      });
    }
  },

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminUserId = req.user.id;

      await OrderModel.updateStatus(parseInt(id), status, adminUserId);

      return res.status(200).json({
        success: true,
        message: `Đã cập nhật trạng thái đơn hàng sang '${status}' thành công.`
      });
    } catch (error) {
      console.error('Lỗi Admin updateOrderStatus:', error);

      if (error.message === 'ORDER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Đơn hàng không tồn tại trên hệ thống.',
          code: 'ORDER_NOT_FOUND'
        });
      }
      if (error.message === 'ORDER_FINALIZED') {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng đã hoàn thành hoặc đã bị hủy trước đó. Không thể thay đổi trạng thái nữa.',
          code: 'ORDER_FINALIZED'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi cập nhật trạng thái đơn hàng.',
        code: 'ADMIN_UPDATE_ORDER_ERROR'
      });
    }
  },

  // ==========================================
  // QUẢN LÝ TÀI KHOẢN (USER MANAGEMENT)
  // ==========================================

  async getAllUsers(req, res) {
    try {
      const { role, page, limit } = req.query;
      const parsedLimit = limit ? parseInt(limit) : 10;
      const result = await UserModel.findAll({
        role: role || null,
        page: page ? parseInt(page) : 1,
        limit: parsedLimit > 100 ? 100 : parsedLimit
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách người dùng thành công.',
        data: result
      });
    } catch (error) {
      console.error('Lỗi Admin getAllUsers:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi tải danh sách người dùng.',
        code: 'ADMIN_FETCH_USERS_ERROR'
      });
    }
  },

  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { role, is_active } = req.body;

      // Không cho phép tự khóa tài khoản của chính mình
      if (parseInt(id) === req.user.id && is_active === false) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không được phép tự khóa tài khoản của chính mình!',
          code: 'SELF_LOCK_PREVENTED'
        });
      }

      const isUpdated = await UserModel.updateStatus(parseInt(id), { role, is_active });

      if (!isUpdated) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng hoặc dữ liệu cập nhật không đổi.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Xóa cache của user bị ảnh hưởng để cập nhật quyền hoặc khóa ngay lập tức
      await cache.del(`user:${id}`);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin và trạng thái người dùng thành công.'
      });
    } catch (error) {
      console.error('Lỗi Admin updateUserStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi cập nhật trạng thái người dùng.',
        code: 'ADMIN_UPDATE_USER_ERROR'
      });
    }
  },

  // ==========================================
  // THỐNG KÊ (DASHBOARD STATS)
  // ==========================================

  async getDashboardStats(req, res) {
    try {
      const stats = await OrderModel.getDashboardStats();
      return res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu báo cáo thống kê thành công.',
        data: stats
      });
    } catch (error) {
      console.error('Lỗi Admin getDashboardStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi tạo báo cáo thống kê.',
        code: 'ADMIN_REPORT_ERROR'
      });
    }
  }
};

module.exports = AdminController;
