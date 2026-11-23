const { query } = require('../../db/pool');

const VALID_SEVERITIES = new Set(['INFO', 'WARN', 'HIGH', 'CRITICAL']);

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * [Thành viên A] Truy vấn danh sách audit_logs phân trang & lọc theo severity/action/keyword.
 */
async function listAuditLogs({ page = 1, limit = 20, severity = '', action = '', keyword = '' }) {
  const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const rawLimit = Number.parseInt(limit, 10) || 20;
  const clampedLimit = Math.min(100, Math.max(1, rawLimit));
  const offset = (parsedPage - 1) * clampedLimit;

  const cleanSeverity = typeof severity === 'string' ? severity.trim().toUpperCase() : '';
  if (cleanSeverity && !VALID_SEVERITIES.has(cleanSeverity)) {
    throw createHttpError(400, 'Mức độ severity không hợp lệ (INFO, WARN, HIGH, CRITICAL)');
  }

  const params = [];
  const whereClauses = [];

  if (cleanSeverity) {
    params.push(cleanSeverity);
    whereClauses.push(`a.severity = $${params.length}`);
  }

  const cleanAction = typeof action === 'string' ? action.trim() : '';
  if (cleanAction) {
    params.push(`%${cleanAction}%`);
    whereClauses.push(`a.action ILIKE $${params.length}`);
  }

  const cleanKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (cleanKeyword) {
    params.push(`%${cleanKeyword}%`);
    whereClauses.push(
      `(a.action ILIKE $${params.length} OR a.resource ILIKE $${params.length} OR COALESCE(u.email, '') ILIKE $${params.length})`
    );
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM audit_logs a
     LEFT JOIN users u ON u.user_id = a.user_id
     ${whereSql}`,
    params
  );
  const totalItems = countResult.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / clampedLimit));

  const dataParams = [...params, clampedLimit, offset];
  const logsResult = await query(
    `SELECT a.log_id, a.user_id, a.action, a.resource, a.ip_address, a.user_agent,
            a.severity, a.metadata, a.created_at,
            u.email AS user_email, u.full_name AS user_full_name, u.role AS user_role
     FROM audit_logs a
     LEFT JOIN users u ON u.user_id = a.user_id
     ${whereSql}
     ORDER BY a.created_at DESC, a.log_id DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  const items = logsResult.rows.map((row) => ({
    logId: Number(row.log_id),
    userId: row.user_id,
    userEmail: row.user_email || null,
    userFullName: row.user_full_name || null,
    userRole: row.user_role || null,
    action: row.action,
    resource: row.resource,
    ipAddress: row.ip_address || null,
    userAgent: row.user_agent || null,
    severity: row.severity,
    metadata: row.metadata || {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  }));

  return {
    items,
    pagination: {
      page: parsedPage,
      limit: clampedLimit,
      totalItems,
      totalPages
    }
  };
}

/**
 * [Thành viên A] Thống kê tổng quan bảo mật theo severity & top hành động đáng ngờ 24h gần nhất.
 */
async function getSecuritySummary() {
  const severityResult = await query(
    `SELECT severity,
            COUNT(*)::int AS total_count,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h_count
     FROM audit_logs
     GROUP BY severity`
  );

  const bySeverity = { INFO: 0, WARN: 0, HIGH: 0, CRITICAL: 0 };
  const last24hBySeverity = { INFO: 0, WARN: 0, HIGH: 0, CRITICAL: 0 };
  let totalLogs = 0;
  let last24hLogs = 0;

  for (const row of severityResult.rows) {
    if (VALID_SEVERITIES.has(row.severity)) {
      bySeverity[row.severity] = Number(row.total_count);
      last24hBySeverity[row.severity] = Number(row.last_24h_count);
    }
    totalLogs += Number(row.total_count);
    last24hLogs += Number(row.last_24h_count);
  }

  const suspiciousResult = await query(
    `SELECT action, severity, COUNT(*)::int AS count, MAX(created_at) AS last_seen_at
     FROM audit_logs
     WHERE severity IN ('WARN', 'HIGH', 'CRITICAL')
       AND created_at >= NOW() - INTERVAL '24 hours'
     GROUP BY action, severity
     ORDER BY count DESC, last_seen_at DESC
     LIMIT 10`
  );

  const topSuspiciousActions = suspiciousResult.rows.map((row) => ({
    action: row.action,
    severity: row.severity,
    count: Number(row.count),
    lastSeenAt: row.last_seen_at instanceof Date ? row.last_seen_at.toISOString() : row.last_seen_at
  }));

  return {
    totalLogs,
    last24hLogs,
    bySeverity,
    last24hBySeverity,
    topSuspiciousActions
  };
}

module.exports = {
  listAuditLogs,
  getSecuritySummary
};
