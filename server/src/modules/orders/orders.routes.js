const express = require('express');
const ordersController = require('./orders.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Lưu ý thứ tự: /my phải đặt TRƯỚC /:id/*
// TODO [Thành viên B]: Bật requireAuth trên POST /, GET /my và GET /:id/verify-integrity
router.post('/', ordersController.createOrder);
router.get('/my', ordersController.getMyOrders);
router.get('/', requireAuth, requireAdmin, ordersController.listAllOrders);
router.patch('/:id/status', requireAuth, requireAdmin, ordersController.updateOrderStatus);
router.get('/:id/verify-integrity', ordersController.verifyOrderIntegrity);

module.exports = router;
