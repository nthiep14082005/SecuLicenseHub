const rateLimit = require('express-rate-limit');
const xss = require('xss');
const env = require('../config/env');
const { sendError } = require('../utils/response.util');
const { writeAuditLog } = require('../utils/audit.util');

const SKIP_XSS_KEYS = new Set(['password', 'confirmPassword', 'currentPassword', 'newPassword', 'totpCode']);

/**
 * Giới hạn tần suất API chung (200 request / 15 phút mỗi IP).
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ địa chỉ IP này, vui lòng thử lại sau ít phút.',
    errors: []
  }
});

/**
 * Giới hạn nghiêm ngặt cho endpoint xác thực chống Brute-force (10 request / 10 giây).
 */
const authLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    await writeAuditLog({
      action: 'RATE_LIMIT_AUTH_BLOCKED',
      resource: `${req.method} ${req.originalUrl}`,
      req,
      severity: 'HIGH',
      metadata: { reason: 'Too many auth requests' }
    });
    return sendError(res, {
      statusCode: 429,
      message: 'Quá nhiều lần thử đăng nhập. Vui lòng đợi 10 giây trước khi thử lại.'
    });
  }
});

function sanitizeRecursive(value, keyName = '') {
  if (SKIP_XSS_KEYS.has(keyName)) return value;

  if (typeof value === 'string') {
    return xss(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRecursive(item));
  }
  if (value && typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      cleaned[k] = sanitizeRecursive(v, k);
    }
    return cleaned;
  }
  return value;
}

/**
 * Làm sạch đệ quy req.body & req.query chống Stored/Reflected XSS (giữ nguyên mật khẩu).
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeRecursive(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeRecursive(req.query);
  }
  return next();
}

/**
 * Bảo vệ chống CSRF dựa trên Origin cho các phương thức làm thay đổi dữ liệu.
 * Cho phép requests không mang Origin (Postman/curl/same-host server) hoặc trùng CLIENT_URL / Swagger localhost.
 */
async function csrfOriginGuard(req, res, next) {
  const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  if (!mutatingMethods.has(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  if (!origin) {
    return next();
  }

  const allowedOrigins = new Set([
    env.clientUrl,
    `http://localhost:${env.port}`,
    `http://127.0.0.1:${env.port}`
  ]);

  if (!allowedOrigins.has(origin)) {
    await writeAuditLog({
      userId: req.user?.userId || null,
      action: 'CSRF_ORIGIN_BLOCKED',
      resource: `${req.method} ${req.originalUrl}`,
      req,
      severity: 'HIGH',
      metadata: { blockedOrigin: origin }
    });
    return sendError(res, {
      statusCode: 403,
      message: 'Yêu cầu bị từ chối bởi chính sách CSRF Origin Guard'
    });
  }

  return next();
}

module.exports = {
  apiLimiter,
  authLimiter,
  sanitizeInput,
  csrfOriginGuard
};
