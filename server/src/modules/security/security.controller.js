const { sendNotImplemented } = require('../../utils/response.util');
const securityService = require('./security.service');

void securityService;

exports.listAuditLogs = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'GET /api/security/audit-logs',
    todo: 'Truy vấn bảng audit_logs có phân trang & lọc theo severity (INFO/WARN/HIGH/CRITICAL).'
  });

exports.getSecuritySummary = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'GET /api/security/summary',
    todo: 'Thống kê số sự kiện theo mức độ severity và các hành động đáng ngờ 24h gần nhất.'
  });

exports.analyzeAuditLogsWithAi = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'POST /api/ai/analyze-logs',
    todo: 'Đọc N dòng audit_logs gần nhất từ PostgreSQL, gửi Gemini API phân tích và trả JSON { riskLevel, summary, threats, recommendedActions }.'
  });
