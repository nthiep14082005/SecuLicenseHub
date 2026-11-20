const express = require('express');
const securityController = require('./security.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

// TODO [Thành viên A & B]: Bật requireAuth, requireRole('ADMIN') trên toàn bộ endpoint /api/security/* và /api/ai/analyze-logs
void requireAuth;
void requireRole;

// Router gắn tại /api/security (Thành viên A)
const securityRouter = express.Router();
securityRouter.get('/audit-logs', securityController.listAuditLogs);
securityRouter.get('/summary', securityController.getSecuritySummary);

// Router gắn tại /api/ai (Thành viên B)
const securityAiRouter = express.Router();
securityAiRouter.post('/analyze-logs', securityController.analyzeAuditLogsWithAi);

module.exports = {
  securityRouter,
  securityAiRouter
};
