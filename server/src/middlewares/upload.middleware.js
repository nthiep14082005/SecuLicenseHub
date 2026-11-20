const crypto = require('node:crypto');
const path = require('path');
const multer = require('multer');

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

// Multer memory storage để kiểm tra Magic Bytes thực tế trước khi ghi ra đĩa
const uploadImageMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

const uploadImportFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

/**
 * Kiểm tra Magic Bytes thực tế của tệp ảnh (chống upload shell .js/.php giả đuôi .jpg).
 * @returns {{ valid: boolean, ext?: string, mime?: string }}
 */
function validateImageMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return { valid: false };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return { valid: true, ext: 'png', mime: 'image/png' };

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return { valid: true, ext: 'jpg', mime: 'image/jpeg' };

  // WEBP: "RIFF" .... "WEBP"
  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (isWebp) return { valid: true, ext: 'webp', mime: 'image/webp' };

  return { valid: false };
}

/**
 * Đặt lại tên tệp bằng UUID để tránh ghi đè hoặc chèn ký tự đặc biệt vào đường dẫn.
 */
function generateSafeFilename(ext) {
  const cleanExt = String(ext || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${crypto.randomUUID()}.${cleanExt}`;
}

/**
 * Kiểm tra an toàn chống Path Traversal (chỉ cho phép tên tệp đơn, không chứa ../ hoặc \).
 */
function assertNoPathTraversal(baseDir, targetFilename) {
  if (!targetFilename || typeof targetFilename !== 'string') {
    throw new Error('Tên tệp không hợp lệ');
  }
  const safeBaseName = path.basename(targetFilename);
  if (safeBaseName !== targetFilename || targetFilename.includes('..')) {
    throw new Error('Phát hiện hành vi Path Traversal');
  }
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, safeBaseName);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error('Đường dẫn tệp vượt ra ngoài thư mục cho phép');
  }
  return resolvedTarget;
}

module.exports = {
  uploadImageMemory,
  uploadImportFile,
  validateImageMagicBytes,
  generateSafeFilename,
  assertNoPathTraversal
};
