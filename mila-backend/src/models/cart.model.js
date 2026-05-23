const pool = require('../config/db');

const CartModel = {
  /**
   * Lay gio hang cua user, join voi thong tin san pham
   */
  async getCart(userId) {
    const [rows] = await pool.query(
      `SELECT ci.id as cart_item_id, ci.product_id, ci.quantity, 
              p.name, p.slug, p.price, p.sale_price, p.unit, p.images, p.stock, p.is_active
       FROM cart_items ci
       INNER JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?
       ORDER BY ci.created_at DESC`,
      [userId]
    );

    return rows.map(item => {
      // Parse images neu la string JSON
      if (typeof item.images === 'string') {
        try { item.images = JSON.parse(item.images); } catch (_) { item.images = []; }
      }
      return item;
    });
  },

  /**
   * Them san pham vao gio hang
   */
  async addItem(userId, { product_id, quantity }) {
    // 1. Kiem tra san pham co dang hoat dong va co du kho khong
    const [products] = await pool.query(
      'SELECT id, stock, is_active FROM products WHERE id = ?',
      [product_id]
    );

    if (products.length === 0) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const product = products[0];
    if (!product.is_active) {
      throw new Error('PRODUCT_INACTIVE');
    }

    // 2. Check xem san pham da co trong gio cua user chua
    const [existingItems] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    let newQuantity = quantity;
    if (existingItems.length > 0) {
      newQuantity += existingItems[0].quantity;
      
      // Kiem tra so luong tong cong co vuot qua stock khong
      if (newQuantity > product.stock) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      await pool.query(
        'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );
      return { action: 'updated', id: existingItems[0].id, quantity: newQuantity };
    } else {
      // Kiem tra so luong co vuot qua stock khong
      if (newQuantity > product.stock) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      const [result] = await pool.query(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, product_id, quantity]
      );
      return { action: 'inserted', id: result.insertId, quantity };
    }
  },

  /**
   * Cap nhat so luong cua 1 item trong gio hang (theo ID cua item hoac cap product_id/user_id)
   */
  async updateItem(userId, cartItemId, quantity) {
    // 1. Tim thong tin gio hang va san pham lien quan
    const [rows] = await pool.query(
      `SELECT ci.id, ci.product_id, p.stock 
       FROM cart_items ci
       INNER JOIN products p ON ci.product_id = p.id
       WHERE ci.id = ? AND ci.user_id = ?`,
      [cartItemId, userId]
    );

    if (rows.length === 0) {
      throw new Error('CART_ITEM_NOT_FOUND');
    }

    const item = rows[0];

    // 2. Kiem tra so luong co vuot qua ton kho hien tai khong
    if (quantity > item.stock) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    // 3. Cap nhat so luong
    const [result] = await pool.query(
      'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [quantity, cartItemId, userId]
    );

    return result.affectedRows > 0;
  },

  /**
   * Xoa san pham khoi gio hang
   */
  async removeItem(userId, cartItemId) {
    const [result] = await pool.query(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
      [cartItemId, userId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Xoa toan bo gio hang (xay ra khi thanh toan thanh cong)
   */
  async clearCart(userId) {
    const [result] = await pool.query(
      'DELETE FROM cart_items WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }
};

module.exports = CartModel;
