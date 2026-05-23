const pool = require('../config/db');
const crypto = require('crypto');

const TokenModel = {
  /**
   * Bam token bang SHA256 de bao ve trong database khoi cac cuoc tan cong doc trom DB
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Luu Refresh Token vao database
   */
  async create({ userId, token, ipAddress, expiresAt }) {
    const tokenHash = this.hashToken(token);
    
    // Xoa bot cac refresh token cu da het han cua user do de don dep DB
    try {
      await pool.query(
        'DELETE FROM refresh_tokens WHERE user_id = ? AND (expires_at < NOW() OR revoked_at IS NOT NULL)',
        [userId]
      );
    } catch (e) {
      console.warn('Lỗi dọn dẹp refresh token cũ:', e.message);
    }

    const [result] = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip_address, expires_at) 
       VALUES (?, ?, ?, ?)`,
      [userId, tokenHash, ipAddress || null, expiresAt]
    );

    return result.insertId;
  },

  /**
   * Tim kiem refresh token con hieu luc va chua bi thu hoi
   */
  async find(token) {
    const tokenHash = this.hashToken(token);
    
    const [rows] = await pool.query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at 
       FROM refresh_tokens 
       WHERE token_hash = ? AND expires_at > NOW() AND revoked_at IS NULL`,
      [tokenHash]
    );

    return rows[0] || null;
  },

  /**
   * Thu hoi (revoked) refresh token (khi user dang xuat)
   */
  async revoke(token) {
    const tokenHash = this.hashToken(token);
    
    const [result] = await pool.query(
      `UPDATE refresh_tokens 
       SET revoked_at = CURRENT_TIMESTAMP 
       WHERE token_hash = ?`,
      [tokenHash]
    );

    return result.affectedRows > 0;
  },

  /**
   * Thu hoi tat ca cac refresh token cua 1 user (cho tinh nang bao mat: dang xuat khoi tat ca thiet bi)
   */
  async revokeAllUserTokens(userId) {
    const [result] = await pool.query(
      `UPDATE refresh_tokens 
       SET revoked_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND revoked_at IS NULL`,
      [userId]
    );

    return result.affectedRows > 0;
  }
};

module.exports = TokenModel;
