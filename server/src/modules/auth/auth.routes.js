const express = require('express');
const authController = require('./auth.controller');
const { requireAuth, optionalAuth } = require('../../middlewares/auth.middleware');
const { authLimiter } = require('../../middlewares/security.middleware');
const { ensureDefaultAdmins } = require('./ensureAdmins');

const router = express.Router();

// Tự động đảm bảo 2 tài khoản Admin mặc định tồn tại khi module Auth được nạp
ensureDefaultAdmins().catch((err) => {
  console.warn('[Auth] Không thể khởi tạo Admin mặc định lúc nạp router:', err.message);
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/login/verify-2fa', authLimiter, authController.verifyLogin2fa);
router.post('/login/resend-2fa', authLimiter, authController.resendLogin2fa);
router.post('/logout', optionalAuth, authController.logout);
router.get('/me', requireAuth, authController.getProfile);
router.patch('/profile', requireAuth, authController.updateProfile);
router.patch('/email', requireAuth, authController.updateEmail);
router.post('/2fa/setup', requireAuth, authController.setup2fa);
router.post('/2fa/verify', requireAuth, authController.verify2fa);
router.post('/2fa/disable', requireAuth, authController.disable2faMethod);
router.post('/2fa/email/send', requireAuth, authController.sendEmail2faOtp);
router.post('/2fa/email/verify', requireAuth, authController.verifyEmail2faOtp);
router.post('/2fa/whatsapp/send', requireAuth, authController.sendWhatsapp2faOtp);
router.post('/2fa/whatsapp/verify', requireAuth, authController.verifyWhatsapp2faOtp);

module.exports = router;
