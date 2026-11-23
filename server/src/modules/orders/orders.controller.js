const { sendSuccess, sendNotImplemented } = require('../../utils/response.util');
const ordersService = require('./orders.service');

exports.createOrder = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'POST /api/orders',
    todo: 'Chạy withTransaction() khóa SELECT ... FOR UPDATE, tính tổng tiền từ giá DB (bỏ qua giá client), gán license_keys, ký signOrderHmac(), sinh URL VietQR và ghi audit_logs.'
  });

exports.getMyOrders = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'GET /api/orders/my',
    todo: 'Truy vấn các đơn hàng thuộc req.user.userId (chống IDOR) kèm chi tiết sản phẩm.'
  });

exports.listAllOrders = async (req, res, next) => {
  try {
    const result = await ordersService.listAllOrders({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Lấy danh sách hóa đơn thành công',
      data: result.items,
      pagination: result.pagination
    });
  } catch (err) {
    return next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const data = await ordersService.updateOrderStatus({
      orderId: req.params.id,
      status: req.body?.status,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.verifyOrderIntegrity = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'GET /api/orders/:id/verify-integrity',
    todo: 'Kiểm tra chủ sở hữu hoặc quyền ADMIN, gọi verifyOrderHmac() đối chiếu integrity_hmac trong DB để phát hiện sửa giá.'
  });
