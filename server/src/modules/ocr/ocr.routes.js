const express = require('express');
const ocrController = require('./ocr.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { uploadImageMemory } = require('../../middlewares/upload.middleware');

const router = express.Router();

// TODO [Thành viên A]: Bật requireAuth, requireRole('ADMIN') sau khi hoàn tất Auth
void requireAuth;
void requireRole;

router.post('/ocr-product', uploadImageMemory.single('image'), ocrController.extractProductFromImage);

module.exports = router;
