const SECRET_KEY = process.env.PAYMENT_ENCRYPTION_KEY || 'MilaMarketSecretKey2026';

/**
 * Encrypt a text string using XOR Cipher with SECRET_KEY
 * @param {string} text 
 * @returns {string} hex string
 */
function encrypt(text) {
  if (!text) return '';
  let result = '';
  const textStr = String(text);
  for (let i = 0; i < textStr.length; i++) {
    const char = textStr.charCodeAt(i);
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    const xor = char ^ keyChar;
    result += xor.toString(16).padStart(2, '0');
  }
  return result;
}

/**
 * Decrypt a hex string using XOR Cipher with SECRET_KEY
 * @param {string} hex 
 * @returns {string} decrypted string
 */
function decrypt(hex) {
  if (!hex) return '';
  let result = '';
  const hexStr = String(hex);
  for (let i = 0; i < hexStr.length; i += 2) {
    const hexPart = hexStr.substring(i, i + 2);
    const charCode = parseInt(hexPart, 16);
    const keyChar = SECRET_KEY.charCodeAt((i / 2) % SECRET_KEY.length);
    const originalChar = charCode ^ keyChar;
    result += String.fromCharCode(originalChar);
  }
  return result;
}

module.exports = {
  encrypt,
  decrypt,
  SECRET_KEY
};
