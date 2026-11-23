const { sendSuccess, sendNotImplemented } = require('../../utils/response.util');
const securityService = require('./security.service');

exports.listAuditLogs = async (req, res, next) => {
  try {
    const result = await securityService.listAuditLogs({
      page: req.query.page,
      limit: req.query.limit,
      severity: req.query.severity,
      action: req.query.action,
      keyword: req.query.keyword
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Lấy nhật ký kiểm toán thành công',
      data: result.items,
      pagination: result.pagination
    });
  } catch (err) {
    return next(err);
  }
};

exports.getSecuritySummary = async (req, res, next) => {
  try {
    const data = await securityService.getSecuritySummary();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Lấy thống kê bảo mật thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.analyzeAuditLogsWithAi = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'POST /api/ai/analyze-logs',
    todo: 'Đọc N dòng audit_logs gần nhất từ PostgreSQL, gửi Gemini API phân tích và trả JSON { riskLevel, summary, threats, recommendedActions }.'
  });
