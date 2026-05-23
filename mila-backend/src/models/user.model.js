const pool = require('../config/db');
const bcrypt = require('bcrypt');

const UserModel = {
  /**
   * Tim kiem user bang email
   */
  async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, password_hash, role, is_active, created_at FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Tim kiem user bang ID
   */
  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Tao tai khoan moi (tu dong bam mat khau)
   */
  async create({ name, email, phone, password, role = 'customer' }) {
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, true)',
      [name, email, phone, passwordHash, role]
    );
    return result.insertId;
  },

  /**
   * Cap nhat thong tin ho so
   */
  async updateProfile(id, { name, phone }) {
    const [result] = await pool.query(
      'UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, phone, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Cap nhat mat khau
   */
  async updatePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const [result] = await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * So sanh mat khau plain-text voi hash trong DB
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  /**
   * [ADMIN] Lay tat ca danh sach users
   */
  async findAll({ role, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT id, name, email, phone, role, is_active, created_at FROM users';
    let params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    // Dem tong so user de tinh phan trang
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let countParams = [];
    if (role) {
      countQuery += ' WHERE role = ?';
      countParams.push(role);
    }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return {
      users: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * [ADMIN] Cap nhat role hoac khoa/mo khoa tai khoan
   */
  async updateStatus(id, { role, is_active }) {
    let updates = [];
    let params = [];

    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) return false;

    params.push(id);
    const [result] = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
    return result.affectedRows > 0;
  }
};

module.exports = UserModel;
