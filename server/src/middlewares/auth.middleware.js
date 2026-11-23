const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { sendError } = require('../utils/response.util');
const { writeAuditLog } = require('../utils/audit.util');

/**
 * Trích xuất JWT ưu tiên từ header Authorization: Bearer (cô lập phiên theo từng tab),
 * chỉ fallback sang HttpOnly Cookie khi request không gửi Bearer token.
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken) return bearerToken;
  }

  const cookieToken = req.cookies?.[env.auth.cookieName];
  if (cookieToken) return cookieToken;

  return null;
}

/**
 * [Thành viên A] Middleware bắt buộc đăng nhập (gắn vào các route cần bảo vệ khi hoàn thiện module Auth).
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return sendError(res, {
      statusCode: 401,
      message: 'Vui lòng đăng nhập để thực hiện thao tác này'
    });
  }

  try {
    const decoded = jwt.verify(token, env.auth.jwtSecret);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName
    };
    return next();
  } catch {
    return sendError(res, {
      statusCode: 401,
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
    });
  }
}

/**
 * Middleware đọc phiên đăng nhập nếu có (không chặn khách vãng lai).
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.auth.jwtSecret);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName
    };
  } catch {
    req.user = null;
  }
  return next();
}

/**
 * [Thành viên A] Kiểm tra phân quyền RBAC (VD: requireRole('ADMIN')).
 * Ghi nhật ký mức HIGH khi có nỗ lực truy cập trái phép.
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return sendError(res, { statusCode: 401, message: 'Chưa xác thực người dùng' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      await writeAuditLog({
        userId: req.user.userId,
        action: 'FORBIDDEN_ACCESS_ATTEMPT',
        resource: `${req.method} ${req.originalUrl}`,
        req,
        severity: 'HIGH',
        metadata: { userRole: req.user.role, requiredRoles: allowedRoles }
      });

      return sendError(res, {
        statusCode: 403,
        message: 'Bạn không có quyền thực hiện chức năng quản trị này'
      });
    }

    return next();
  };
}

const requireAdmin = requireRole('ADMIN');

module.exports = {
  extractToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin
};
