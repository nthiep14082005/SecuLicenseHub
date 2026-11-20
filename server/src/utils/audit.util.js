const { query } = require('../db/pool');

const ALLOWED_SEVERITIES = new Set(['INFO', 'WARN', 'HIGH', 'CRITICAL']);

/**
 * Ghi nhật ký kiểm toán vào bảng audit_logs (hỗ trợ chống chối bỏ & AI Security Log Analyzer).
 * Luôn bọc try/catch để lỗi ghi log không làm sập luồng xử lý chính của ứng dụng.
 */
async function writeAuditLog({
  userId = null,
  action,
  resource,
  req = null,
  ipAddress = null,
  userAgent = null,
  severity = 'INFO',
  metadata = {}
}) {
  const safeSeverity = ALLOWED_SEVERITIES.has(severity) ? severity : 'INFO';
  const resolvedIp =
    ipAddress ||
    (req ? req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress : null);
  const resolvedUa = userAgent || (req ? req.get('user-agent') : null);

  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent, severity, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        userId,
        String(action || 'UNKNOWN_ACTION').slice(0, 100),
        String(resource || 'UNKNOWN_RESOURCE').slice(0, 150),
        resolvedIp ? String(resolvedIp).slice(0, 64) : null,
        resolvedUa ? String(resolvedUa).slice(0, 500) : null,
        safeSeverity,
        JSON.stringify(metadata || {})
      ]
    );
  } catch (err) {
    console.warn('[AuditLog] Không thể ghi nhật ký (kiểm tra kết nối PostgreSQL):', err.message);
  }
}

module.exports = { writeAuditLog };
