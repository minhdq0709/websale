const crypto = require('crypto');

// Lấy key từ env — PHẢI đúng 32 bytes cho AES-256
// Nếu PAYMENT_ENCRYPTION_KEY chưa đủ 32 bytes thì hash bằng SHA-256 để đảm bảo đúng độ dài
function deriveKey() {
  const raw = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('PAYMENT_ENCRYPTION_KEY environment variable is required');
  }
  // SHA-256 luôn cho ra 32 bytes — an toàn bất kể độ dài key gốc
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Mã hóa chuỗi bằng AES-256-GCM (authenticated encryption)
 * Output: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * @param {string} text
 * @returns {string}
 */
function encrypt(text) {
  if (!text) return '';
  const key = deriveKey();
  const iv = crypto.randomBytes(12); // 96-bit IV cho GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 128-bit authentication tag
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Giải mã chuỗi đã mã hóa bằng AES-256-GCM
 * Sẽ ném lỗi nếu dữ liệu bị tamper (authTag không khớp)
 * @param {string} encoded — định dạng "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * @returns {string}
 */
function decrypt(encoded) {
  if (!encoded) return '';
  const key = deriveKey();
  const parts = String(encoded).split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
// LƯU Ý: Không export SECRET_KEY ra ngoài — tránh lộ key
