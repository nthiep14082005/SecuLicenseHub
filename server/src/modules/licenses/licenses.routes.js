const express = require('express');
const licensesController = require('./licenses.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

// TODO [Thành viên B]: Bật requireAuth cho /my, /:id/reveal, /:id/download-link; riêng /download xác thực bằng Signed Token
void requireAuth;

router.get('/my', licensesController.getMyLicenses);
router.get('/download', licensesController.downloadBySignedToken);
router.post('/:id/reveal', licensesController.revealLicenseKey);
router.post('/:id/download-link', licensesController.createDownloadLink);

module.exports = router;
