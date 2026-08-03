const ProductModel = require('../models/product.model');
const cache = require('../config/cache');

const ProductController = {
  /**
   * LAY DANH SACH SAN PHAM CO LOC & PHAN TRANG
   * Khong cache vi co qua nhieu to hop filter/sort/page
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
   * Cache 10 phut — san pham cu the khong thay doi thuong xuyen
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `product:${id}`;

      let product = await cache.get(cacheKey);
      if (!product) {
        product = await ProductModel.findById(parseInt(id));
        // Chi cache san pham dang hoat dong
        if (product && product.is_active) {
          await cache.set(cacheKey, product, 600); // 10 phut
        }
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm yêu cầu.',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      // [FIX] Tra ve 404 thay vi 403: voi nguoi dung thuong, san pham an = "khong ton tai"
      // 403 (Forbidden) chi dung cho loi phan quyen, khong phu hop o day
      if (!product.is_active) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm yêu cầu.',
          code: 'PRODUCT_NOT_FOUND'
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
   * Cache 1 gio — san pham noi bat rat it thay doi
   */
  async getFeaturedProducts(req, res) {
    try {
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 8));
      const cacheKey = `featured:products:${limit}`;

      let products = await cache.get(cacheKey);
      if (!products) {
        products = await ProductModel.findFeatured(limit);
        await cache.set(cacheKey, products, 3600); // 1 gio
      }

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
   * Cache 1 gio — danh muc rat it thay doi
   */
  async getAllCategories(req, res) {
    try {
      const cacheKey = 'categories:all';

      let categories = await cache.get(cacheKey);
      if (!categories) {
        categories = await ProductModel.findCategories();
        await cache.set(cacheKey, categories, 3600); // 1 gio
      }

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

