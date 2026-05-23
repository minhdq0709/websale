const pool = require('../config/db');

const ProductModel = {
  /**
   * Lay danh sach san pham co bo loc, sap xep va phan trang
   */
  async findAll({ categorySlug, search, minPrice, maxPrice, sortBy = 'newest', page = 1, limit = 12, isActive = true } = {}) {
    const offset = (page - 1) * limit;
    let params = [];
    let whereClauses = [];

    if (isActive !== undefined) {
      whereClauses.push('p.is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (categorySlug) {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (minPrice !== undefined) {
      whereClauses.push('COALESCE(p.sale_price, p.price) >= ?');
      params.push(minPrice);
    }

    if (maxPrice !== undefined) {
      whereClauses.push('COALESCE(p.sale_price, p.price) <= ?');
      params.push(maxPrice);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Sap xep
    let orderSql = 'ORDER BY p.created_at DESC'; // default newest
    if (sortBy === 'price-asc') {
      orderSql = 'ORDER BY COALESCE(p.sale_price, p.price) ASC';
    } else if (sortBy === 'price-desc') {
      orderSql = 'ORDER BY COALESCE(p.sale_price, p.price) DESC';
    } else if (sortBy === 'name-asc') {
      orderSql = 'ORDER BY p.name ASC';
    } else if (sortBy === 'popular') {
      orderSql = 'ORDER BY p.stock DESC'; // Tam thoi sap xep theo luong kho de test
    }

    // Truy van san pham
    const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    // Append limit va offset cho prepared statement
    const queryParams = [...params, parseInt(limit), parseInt(offset)];
    const [rows] = await pool.query(query, queryParams);

    // Dem tong so san pham phu hop de phan trang
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `;
    const [[{ total }]] = await pool.query(countQuery, params);

    // Convert kieu JSON neu co
    const products = rows.map(r => {
      if (typeof r.images === 'string') {
        try { r.images = JSON.parse(r.images); } catch (_) { r.images = []; }
      }
      return r;
    });

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Lay chi tiet mot san pham theo ID
   */
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    
    const product = rows[0];
    if (typeof product.images === 'string') {
      try { product.images = JSON.parse(product.images); } catch (_) { product.images = []; }
    }
    return product;
  },

  /**
   * Lay danh sach san pham noi bat (featured) - can lay cac san pham giam gia hoac nhieu stock nhat
   */
  async findFeatured(limit = 8) {
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = true
       ORDER BY (p.sale_price IS NOT NULL) DESC, p.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    
    return rows.map(r => {
      if (typeof r.images === 'string') {
        try { r.images = JSON.parse(r.images); } catch (_) { r.images = []; }
      }
      return r;
    });
  },

  /**
   * Helper de sinh slug tu ten san pham
   */
  generateSlug(text) {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
      .replace(/\s+/g, '-') // collapse whitespace and replace by -
      .replace(/-+/g, '-'); // collapse dashes
  },

  /**
   * [ADMIN] Them san pham moi
   */
  async create({ category_id, name, price, sale_price = null, unit, stock = 0, description = '', images = [], is_active = true }) {
    const slug = this.generateSlug(name) + '-' + Date.now();
    const imagesJson = JSON.stringify(images);

    const [result] = await pool.query(
      `INSERT INTO products (category_id, name, slug, price, sale_price, unit, stock, description, images, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, name, slug, price, sale_price, unit, stock, description, imagesJson, is_active ? 1 : 0]
    );
    return result.insertId;
  },

  /**
   * [ADMIN] Cap nhat san pham
   */
  async update(id, data) {
    let updates = [];
    let params = [];

    // Danh sach cac field hop le de update
    const fields = ['category_id', 'name', 'price', 'sale_price', 'unit', 'stock', 'description', 'images', 'is_active'];
    
    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'images') {
          params.push(JSON.stringify(data[field]));
        } else if (field === 'is_active') {
          params.push(data[field] ? 1 : 0);
        } else {
          params.push(data[field]);
        }
      }
    });

    if (data.name) {
      updates.push('slug = ?');
      params.push(this.generateSlug(data.name) + '-' + id);
    }

    if (updates.length === 0) return false;

    params.push(id);
    const [result] = await pool.query(
      `UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
    return result.affectedRows > 0;
  },

  /**
   * [ADMIN] Xoa san pham (Hoac chuyen trang thai hoat dong bang is_active = 0)
   */
  async delete(id) {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // CATEGORY METHODS

  /**
   * Lay tat ca danh muc
   */
  async findCategories() {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY parent_id ASC, name ASC');
    return rows;
  },

  /**
   * [ADMIN] Tao danh muc moi
   */
  async createCategory({ name, parent_id = null }) {
    const slug = this.generateSlug(name);
    const [result] = await pool.query(
      'INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)',
      [name, slug, parent_id]
    );
    return result.insertId;
  },

  /**
   * [ADMIN] Cap nhat danh muc
   */
  async updateCategory(id, { name, parent_id }) {
    let updates = [];
    let params = [];

    if (name) {
      updates.push('name = ?');
      updates.push('slug = ?');
      params.push(name, this.generateSlug(name));
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?');
      params.push(parent_id);
    }

    if (updates.length === 0) return false;

    params.push(id);
    const [result] = await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return result.affectedRows > 0;
  },

  /**
   * [ADMIN] Xoa danh muc
   */
  async deleteCategory(id) {
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = ProductModel;
