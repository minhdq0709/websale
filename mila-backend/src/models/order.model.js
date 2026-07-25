const pool = require('../config/db');
const cache = require('../config/cache');

const OrderModel = {
  /**
   * TAO DON HANG (Su dung Transaction de dam bao toan ven du lieu)
   */
  async createOrder(userId, { shipping_address, note = '' }, ipAddress = null, userAgent = null) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Lay danh sach item tu gio hang kem thong tin san pham de tinh tien va check stock
      const [cartItems] = await conn.query(
        `SELECT ci.product_id, ci.quantity, p.name, p.price, p.sale_price, p.stock, p.is_active
         FROM cart_items ci
         INNER JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = ?`,
        [userId]
      );

      if (cartItems.length === 0) {
        throw new Error('CART_EMPTY');
      }

      let totalAmount = 0;
      const orderItemsToInsert = [];

      // 2. Kiem tra kho, trang thai va tinh gia
      for (const item of cartItems) {
        if (!item.is_active) {
          throw new Error(`PRODUCT_INACTIVE:${item.name}`);
        }
        if (item.quantity > item.stock) {
          throw new Error(`INSUFFICIENT_STOCK:${item.name}`);
        }

        const activePrice = item.sale_price !== null ? item.sale_price : item.price;
        const subtotal = activePrice * item.quantity;
        totalAmount += subtotal;

        orderItemsToInsert.push([null, item.product_id, item.quantity, activePrice]); // null placeholder for orderId later
      }

      // 3. Tao don hang
      const shippingAddressJson = JSON.stringify(shipping_address);
      const [orderResult] = await conn.query(
        `INSERT INTO orders (user_id, status, shipping_address, total_amount, note) 
         VALUES (?, 'pending', ?, ?, ?)`,
        [userId, shippingAddressJson, totalAmount, note]
      );
      
      const orderId = orderResult.insertId;

      // [B1 FIX] Batch INSERT order items
      orderItemsToInsert.forEach(item => item[0] = orderId); // Populate orderId
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ?`,
        [orderItemsToInsert]
      );

      // [B1 FIX] Batch UPDATE products stock using CASE-WHEN
      const caseWhen = cartItems.map(i => `WHEN id = ${i.product_id} THEN stock - ${i.quantity}`).join(' ');
      const ids = cartItems.map(i => i.product_id).join(',');
      await conn.query(`UPDATE products SET stock = CASE ${caseWhen} END, updated_at = CURRENT_TIMESTAMP WHERE id IN (${ids})`);

      // 5. Xoa sach gio hang cua user sau khi thanh toan thanh cong
      await conn.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);

      // 6. Luu log hanh dong vao audit_logs
      // [L6 FIX] Ghi IP và User-Agent vào log
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, payload) 
         VALUES (?, 'create_order', 'order', ?, ?, ?, ?)`,
        [userId, orderId, ipAddress, userAgent, JSON.stringify({ total_amount: totalAmount, items_count: orderItemsToInsert.length })]
      );

      // [B3 FIX] Invalidate dashboard cache sau khi có giao dịch mới
      await cache.del('dashboard_stats');

      await conn.commit();
      return orderId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Lay danh sach don hang cua 1 user (Customer)
   */
  async findByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT id, status, total_amount, shipping_address, note, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return rows.map(r => {
      if (typeof r.shipping_address === 'string') {
        try { r.shipping_address = JSON.parse(r.shipping_address); } catch (_) {}
      }
      return r;
    });
  },

  /**
   * Lay chi tiet mot don hang kem danh sach san pham ben trong (dung cho chu cua don hoac admin/staff)
   */
  async findById(orderId) {
    // 1. Lay thong tin don hang va ten user
    const [orders] = await pool.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       INNER JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) return null;
    const order = orders[0];

    // Parse shipping address
    if (typeof order.shipping_address === 'string') {
      try { order.shipping_address = JSON.parse(order.shipping_address); } catch (_) {}
    }

    // 2. Lay danh sach mat hang cua don do
    const [items] = await pool.query(
      `SELECT oi.id as item_id, oi.product_id, oi.quantity, oi.unit_price, 
              p.name, p.slug, p.unit, p.images
       FROM order_items oi
       INNER JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    order.items = items.map(item => {
      if (typeof item.images === 'string') {
        try { item.images = JSON.parse(item.images); } catch (_) { item.images = []; }
      }
      return item;
    });

    return order;
  },

  /**
   * Cap nhat trang thai don hang
   * dac biet: Neu don chuyen sang 'cancelled' (bi huy), tra lai stock cho san pham!
   */
  async updateStatus(orderId, status, updatedByUserId = null, ipAddress = null, userAgent = null) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Kiem tra trang thai don hang hien tai
      const [orders] = await conn.query('SELECT status, user_id FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orders.length === 0) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const currentStatus = orders[0].status;

      // [M4 FIX] Order Status State Machine — validate các bước chuyển đổi hợp lệ
      const VALID_TRANSITIONS = {
        pending:    ['confirmed', 'processing', 'cancelled'],
        confirmed:  ['processing', 'cancelled'],
        processing: ['shipping', 'cancelled'],
        shipping:   ['delivered'],
        delivered:  [],
        cancelled:  []
      };

      if (!VALID_TRANSITIONS[currentStatus] || !VALID_TRANSITIONS[currentStatus].includes(status)) {
        throw new Error('ORDER_FINALIZED'); // Hoặc trạng thái chuyển đổi không hợp lệ
      }

      // 2. Neu status moi la 'cancelled', thuc hien khoi phuc stock san pham
      if (status === 'cancelled') {
        // [B2 FIX] Batch UPDATE stock khi cancel order
        const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
        if (items.length > 0) {
          const caseWhen = items.map(i => `WHEN id = ${i.product_id} THEN stock + ${i.quantity}`).join(' ');
          const ids = items.map(i => i.product_id).join(',');
          await conn.query(`UPDATE products SET stock = CASE ${caseWhen} END, updated_at = CURRENT_TIMESTAMP WHERE id IN (${ids})`);
        }
      }

      // 3. Cap nhat trang thai don hang
      await conn.query(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, orderId]
      );

      // 4. Ghi audit log
      // [L6 FIX] Thêm IP và User-Agent vào log
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, payload) 
         VALUES (?, 'update_order_status', 'order', ?, ?, ?, ?)`,
        [updatedByUserId || orders[0].user_id, orderId, ipAddress, userAgent, JSON.stringify({ from: currentStatus, to: status })]
      );

      // [B3 FIX] Invalidate dashboard cache
      await cache.del('dashboard_stats');

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * [ADMIN/STAFF] Lay tat ca don hang hoac loc theo status + phan trang
   */
  async findAll({ status, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT o.id, o.user_id, o.status, o.total_amount, o.shipping_address, o.note, o.created_at,
             u.name as customer_name
      FROM orders o
      INNER JOIN users u ON o.user_id = u.id
    `;
    let params = [];

    if (status) {
      query += ' WHERE o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    const orders = rows.map(r => {
      if (typeof r.shipping_address === 'string') {
        try { r.shipping_address = JSON.parse(r.shipping_address); } catch (_) {}
      }
      return r;
    });

    // Count
    let countQuery = 'SELECT COUNT(*) as total FROM orders';
    let countParams = [];
    if (status) {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * [ADMIN] Lay bao cao doanh thu, tong don hang phuc vu dashboard
   */
  async getDashboardStats() {
    // [B3 FIX] Thêm layer Cache 5 phút để tránh nặng DB
    const cachedStats = await cache.get('dashboard_stats');
    if (cachedStats) return cachedStats;

    // 1. Tong doanh thu (chi tinh don hang da thanh toan hoac giao thanh cong)
    const [[{ revenue }]] = await pool.query(
      `SELECT SUM(total_amount) as revenue FROM orders WHERE status = 'delivered'`
    );

    // 2. So luong don hang theo tung trang thai
    const [statusStats] = await pool.query(
      'SELECT status, COUNT(*) as count, SUM(total_amount) as amount FROM orders GROUP BY status'
    );

    // 3. So luong nguoi dung
    const [[{ totalUsers }]] = await pool.query(
      `SELECT COUNT(*) as totalUsers FROM users WHERE role = 'customer'`
    );

    // 4. Doanh thu theo thang trong 6 thang gan nhat
    const [monthlyRevenue] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total_amount) as amount, COUNT(*) as count
       FROM orders
       WHERE status = 'delivered' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month
       ORDER BY month ASC`
    );

    const result = {
      totalRevenue: revenue || 0,
      totalCustomers: totalUsers || 0,
      statusBreakdown: statusStats,
      monthlyRevenue
    };

    // Cache kết quả trong 5 phút (300 giây)
    await cache.set('dashboard_stats', result, 300);
    return result;
  }
};

module.exports = OrderModel;
