const express = require('express');
const authController = require('./auth.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { authLimiter } = require('../../middlewares/security.middleware');

const router = express.Router();

// Áp dụng rate limit chống brute-force cho đăng ký / đăng nhập
// TODO [Thành viên A]: Bật requireAuth trên /logout, /me, /2fa/* khi hoàn tất JWT cookie auth
void requireAuth;
void requireRole;

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getProfile);
router.post('/2fa/setup', authController.setup2fa);
router.post('/2fa/verify', authController.verify2fa);

module.exports = router;
