const express = require('express');
const ocrController = require('./ocr.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware');
const { uploadImageMemory } = require('../../middlewares/upload.middleware');

const router = express.Router();

router.post(
  '/ocr-product',
  requireAuth,
  requireAdmin,
  uploadImageMemory.single('image'),
  ocrController.extractProductFromImage
);

module.exports = router;
