const CartModel = require('../models/cart.model');

const CartController = {
  /**
   * LAY GIO HANG CUA NGUOI DUNG HIEN TAI
   */
  async getCart(req, res) {
    try {
      const userId = req.user.id;
      const cartItems = await CartModel.getCart(userId);

      // Tinh toan nhanh tong gia gio hang hien tai tren server de phan hoi tien loi
      let totalAmount = 0;
      let totalItems = 0;

      cartItems.forEach(item => {
        if (item.is_active) {
          const price = item.sale_price !== null ? item.sale_price : item.price;
          totalAmount += price * item.quantity;
          totalItems += item.quantity;
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin giỏ hàng thành công.',
        data: {
          items: cartItems,
          totalAmount,
          totalItems
        }
      });
    } catch (error) {
      console.error('Lỗi lấy giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải giỏ hàng của bạn.',
        code: 'CART_FETCH_ERROR'
      });
    }
  },

  /**
   * THEM SAN PHAM VAO GIO HANG
   */
  async addItem(req, res) {
    try {
      const userId = req.user.id;
      const { product_id, quantity } = req.body;

      const result = await CartModel.addItem(userId, { product_id, quantity });

      return res.status(200).json({
        success: true,
        message: result.action === 'updated' 
          ? 'Đã tăng số lượng sản phẩm trong giỏ hàng.' 
          : 'Đã thêm sản phẩm vào giỏ hàng thành công.',
        data: result
      });
    } catch (error) {
      console.error('Lỗi thêm giỏ hàng:', error);

      if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Sản phẩm này không tồn tại trên hệ thống.',
          code: 'PRODUCT_NOT_FOUND'
        });
      }
      if (error.message === 'PRODUCT_INACTIVE') {
        return res.status(400).json({
          success: false,
          message: 'Sản phẩm này hiện đang tạm ngưng kinh doanh.',
          code: 'PRODUCT_INACTIVE'
        });
      }
      if (error.message === 'INSUFFICIENT_STOCK') {
        return res.status(400).json({
          success: false,
          message: 'Số lượng yêu cầu vượt quá số lượng hàng còn trong kho.',
          code: 'INSUFFICIENT_STOCK'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng.',
        code: 'CART_ADD_ERROR'
      });
    }
  },

  /**
   * CAP NHAT SO LUONG SAN PHAM TRONG GIO
   */
  async updateItem(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params; // ID cua cart_items
      const { quantity } = req.body;

      const isUpdated = await CartModel.updateItem(userId, parseInt(id), parseInt(quantity));

      if (!isUpdated) {
        return res.status(404).json({
          success: false,
          message: 'Mục giỏ hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
          code: 'CART_ITEM_NOT_FOUND'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật số lượng sản phẩm thành công.'
      });
    } catch (error) {
      console.error('Lỗi cập nhật giỏ hàng:', error);

      if (error.message === 'CART_ITEM_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Mục giỏ hàng không tồn tại.',
          code: 'CART_ITEM_NOT_FOUND'
        });
      }
      if (error.message === 'INSUFFICIENT_STOCK') {
        return res.status(400).json({
          success: false,
          message: 'Số lượng cập nhật vượt quá số lượng tồn kho còn lại của sản phẩm.',
          code: 'INSUFFICIENT_STOCK'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật số lượng sản phẩm.',
        code: 'CART_UPDATE_ERROR'
      });
    }
  },

  /**
   * XOA MOT SAN PHAM KHOI GIO HANG
   */
  async removeItem(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params; // ID cua cart_items

      const isRemoved = await CartModel.removeItem(userId, parseInt(id));

      if (!isRemoved) {
        return res.status(404).json({
          success: false,
          message: 'Mục giỏ hàng không tồn tại hoặc không thuộc sở hữu của bạn.',
          code: 'CART_ITEM_NOT_FOUND'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đã xóa sản phẩm khỏi giỏ hàng.'
      });
    } catch (error) {
      console.error('Lỗi xóa giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa sản phẩm khỏi giỏ hàng.',
        code: 'CART_REMOVE_ERROR'
      });
    }
  },

  /**
   * XOA TOAN BO GIO HANG CUA USER
   */
  async clearCart(req, res) {
    try {
      const userId = req.user.id;
      await CartModel.clearCart(userId);

      return res.status(200).json({
        success: true,
        message: 'Đã dọn sạch giỏ hàng của bạn.'
      });
    } catch (error) {
      console.error('Lỗi dọn giỏ hàng:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi dọn giỏ hàng.',
        code: 'CART_CLEAR_ERROR'
      });
    }
  }
};

module.exports = CartController;
