const express = require('express');
const ordersController = require('./orders.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

const router = express.Router();

// TODO [Thành viên A & B]: Bật requireAuth cho toàn bộ /orders và requireRole('ADMIN') cho GET / và PATCH /:id/status
void requireAuth;
void requireRole;

// Lưu ý thứ tự: /my phải đặt TRƯỚC /:id/*
router.post('/', ordersController.createOrder);
router.get('/my', ordersController.getMyOrders);
router.get('/', ordersController.listAllOrders);
router.patch('/:id/status', ordersController.updateOrderStatus);
router.get('/:id/verify-integrity', ordersController.verifyOrderIntegrity);

module.exports = router;
