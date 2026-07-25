const ProductModel = require('../models/product.model');

const ProductController = {
  /**
   * LAY DANH SACH SAN PHAM CO LOC & PHAN TRANG
   */
  async getAllProducts(req, res) {
    try {
      const { category, search, minPrice, maxPrice, sortBy, page, limit } = req.query;

      const parsedLimit = limit ? parseInt(limit) : 12;
      const filter = {
        categorySlug: category || null,
        search: search || null,
        minPrice: minPrice !== undefined ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice !== undefined ? parseFloat(maxPrice) : undefined,
        sortBy: sortBy || 'newest',
        page: page ? parseInt(page) : 1,
        limit: parsedLimit > 100 ? 100 : parsedLimit,
        isActive: true // Chỉ lấy sản phẩm đang kinh doanh ở public API
      };

      const result = await ProductModel.findAll(filter);

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách sản phẩm thành công.',
        data: result
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách sản phẩm:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải danh sách sản phẩm.',
        code: 'PRODUCT_FETCH_ERROR'
      });
    }
  },

  /**
   * LAY CHI TIET SAN PHAM THEO ID
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await ProductModel.findById(parseInt(id));

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm yêu cầu.',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      // Kiểm tra xem sản phẩm có hoạt động không
      if (!product.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Sản phẩm này đã ngừng kinh doanh.',
          code: 'PRODUCT_INACTIVE'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin sản phẩm thành công.',
        data: product
      });
    } catch (error) {
      console.error('Lỗi lấy chi tiết sản phẩm:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải chi tiết sản phẩm.',
        code: 'PRODUCT_DETAIL_ERROR'
      });
    }
  },

  /**
   * LAY DANH SACH SAN PHAM NOI BAT
   */
  async getFeaturedProducts(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 8;
      const products = await ProductModel.findFeatured(limit);

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách sản phẩm nổi bật thành công.',
        data: products
      });
    } catch (error) {
      console.error('Lỗi lấy sản phẩm nổi bật:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải sản phẩm nổi bật.',
        code: 'FEATURED_PRODUCT_ERROR'
      });
    }
  },

  /**
   * LAY TOAN BO DANH MUC SAN PHAM
   */
  async getAllCategories(req, res) {
    try {
      const categories = await ProductModel.findCategories();

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách danh mục thành công.',
        data: categories
      });
    } catch (error) {
      console.error('Lỗi lấy danh mục sản phẩm:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải danh sách danh mục sản phẩm.',
        code: 'CATEGORY_FETCH_ERROR'
      });
    }
  }
};

module.exports = ProductController;
