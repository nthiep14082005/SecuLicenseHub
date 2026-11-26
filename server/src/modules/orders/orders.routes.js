const express = require('express');
const ordersController = require('./orders.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

const router = express.Router();

// TODO [Thành viên A]: Bật requireAuth và requireRole('ADMIN') cho GET / và PATCH /:id/status.
void requireRole;

// Lưu ý thứ tự: /my phải đặt TRƯỚC /:id/*
router.post('/', requireAuth, ordersController.createOrder);
router.get('/my', requireAuth, ordersController.getMyOrders);
router.get('/', ordersController.listAllOrders);
router.patch('/:id/status', ordersController.updateOrderStatus);
router.get('/:id/verify-integrity', requireAuth, ordersController.verifyOrderIntegrity);

module.exports = router;
