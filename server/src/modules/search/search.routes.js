const express = require('express');
const searchController = require('./search.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

const router = express.Router();

// TODO [Thành viên B]: Bật requireAuth, requireRole('ADMIN') trên POST /sync
void requireAuth;
void requireRole;

router.get('/', searchController.searchProducts);
router.post('/sync', searchController.syncAllProducts);

module.exports = router;
