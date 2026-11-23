const express = require('express');
const authController = require('./auth.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware');
const { authLimiter } = require('../../middlewares/security.middleware');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getProfile);
router.post('/2fa/setup', requireAuth, requireAdmin, authController.setup2fa);
router.post('/2fa/verify', requireAuth, requireAdmin, authController.verify2fa);

module.exports = router;
