const express = require('express');
const securityController = require('./security.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware');

// Router gắn tại /api/security (Thành viên A)
const securityRouter = express.Router();
securityRouter.get('/audit-logs', requireAuth, requireAdmin, securityController.listAuditLogs);
securityRouter.get('/summary', requireAuth, requireAdmin, securityController.getSecuritySummary);

// Router gắn tại /api/ai (Thành viên B)
// TODO [Thành viên B]: Bật requireAuth, requireAdmin trên POST /analyze-logs khi hoàn tất
const securityAiRouter = express.Router();
securityAiRouter.post('/analyze-logs', securityController.analyzeAuditLogsWithAi);

module.exports = {
  securityRouter,
  securityAiRouter
};
