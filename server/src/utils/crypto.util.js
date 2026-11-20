const crypto = require('node:crypto');
const env = require('../config/env');

const AES_ALGORITHM = 'aes-256-gcm';

function getAesKeyBuffer() {
  return Buffer.from(env.crypto.aes256SecretHex, 'hex');
}

/**
 * Mã hóa License Key bằng AES-256-GCM (trả về ciphertext, iv, authTag dạng hex).
 */
function encryptAesGcm(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, getAesKeyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Giải mã License Key AES-256-GCM. Ném lỗi ngay nếu dữ liệu bị sửa đổi (AuthTag mismatch).
 */
function decryptAesGcm({ encryptedKey, iv, authTag }) {
  const decipher = crypto.createDecipheriv(
    AES_ALGORITHM,
    getAesKeyBuffer(),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedKey, 'hex')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Tạo chữ ký HMAC-SHA256 chống giả mạo tổng tiền / chủ đơn hàng.
 */
function signOrderHmac({ orderId, userId, totalAmount, createdAt }) {
  const canonical = `${orderId}|${userId || 'guest'}|${Number(totalAmount)}|${new Date(createdAt).toISOString()}`;
  return crypto
    .createHmac('sha256', env.crypto.hmacOrderSecret)
    .update(canonical)
    .digest('hex');
}

/**
 * Kiểm chứng chữ ký HMAC-SHA256 bằng so sánh an toàn hằng thời gian (timingSafeEqual).
 */
function verifyOrderHmac({ orderId, userId, totalAmount, createdAt, integrityHmac }) {
  if (!integrityHmac || typeof integrityHmac !== 'string') return false;
  const expected = signOrderHmac({ orderId, userId, totalAmount, createdAt });
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(integrityHmac, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Tạo Signed Download Token (payload base64url + chữ ký HMAC-SHA256) hết hạn sau TTL giây.
 */
function createSignedDownloadToken({ licenseId, userId, filename, ttlSeconds = env.crypto.signedUrlTtlSeconds }) {
  const expiresAt = Math.floor(Date.now() / 1000) + Number(ttlSeconds);
  const payload = { licenseId, userId, filename, exp: expiresAt };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.crypto.signedUrlSecret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Xác thực Signed Download Token: kiểm tra chữ ký HMAC + hạn sử dụng.
 */
function verifySignedDownloadToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'Token không đúng định dạng' };
  }

  const [payloadB64, providedSig] = token.split('.');
  if (!payloadB64 || !providedSig) {
    return { valid: false, reason: 'Thiếu thành phần chữ ký token' };
  }

  const expectedSig = crypto
    .createHmac('sha256', env.crypto.signedUrlSecret)
    .update(payloadB64)
    .digest('base64url');

  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  const providedBuf = Buffer.from(providedSig, 'utf8');
  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: 'Chữ ký Signed URL không hợp lệ' };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'Payload Signed URL bị hỏng' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || nowSec > Number(payload.exp)) {
    return { valid: false, reason: 'Signed URL đã hết hạn (quá 300 giây)' };
  }

  return { valid: true, payload };
}

/**
 * Tính mã băm SHA-256 dạng hex cho tệp/buffer tài nguyên số.
 */
function computeSha256Hex(bufferOrString) {
  return crypto.createHash('sha256').update(bufferOrString).digest('hex');
}

/**
 * Chống Excel Formula Injection (CSV/XLSX Injection):
 * Thêm dấu nháy đơn (') vào trước các chuỗi bắt đầu bằng =, +, -, @, \t hoặc \r.
 */
function sanitizeExcelCell(value) {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

module.exports = {
  encryptAesGcm,
  decryptAesGcm,
  signOrderHmac,
  verifyOrderHmac,
  createSignedDownloadToken,
  verifySignedDownloadToken,
  computeSha256Hex,
  sanitizeExcelCell
};
