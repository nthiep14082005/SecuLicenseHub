const { sendNotImplemented, sendSuccess, sendError } = require('../../utils/response.util');
const ordersService = require('./orders.service');

function handleOrderError(res, error) {
  const expected = error instanceof ordersService.OrderError;
  return sendError(res, {
    statusCode: expected ? error.statusCode : 500,
    message: expected ? error.message : 'Không thể xử lý đơn hàng lúc này. Vui lòng thử lại sau.'
  });
}

exports.createOrder = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const data = await ordersService.createOrder(req.body, req.user, req);
    return sendSuccess(res, { statusCode: 201, message: 'Đặt đơn thành công, đang chờ xác nhận thanh toán', data });
  } catch (error) {
    return handleOrderError(res, error);
  }
};

exports.getMyOrders = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { orders, pagination } = await ordersService.getMyOrders(req.query, req.user);
    return sendSuccess(res, { data: orders, pagination });
  } catch (error) {
    return handleOrderError(res, error);
  }
};

exports.listAllOrders = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'GET /api/orders',
    todo: 'Lấy danh sách tất cả hóa đơn cho Admin (kèm trạng thái kiểm chứng HMAC).'
  });

exports.updateOrderStatus = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'PATCH /api/orders/:id/status',
    todo: 'Admin duyệt/cập nhật trạng thái đơn (PENDING -> CONFIRMED -> COMPLETED/CANCELLED) và ghi audit_logs.'
  });

exports.verifyOrderIntegrity = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const data = await ordersService.verifyOrderIntegrity(req.params.id, req.user, req);
    return sendSuccess(res, { message: data.valid ? 'Hóa đơn còn nguyên vẹn' : 'Phát hiện hóa đơn đã bị thay đổi', data });
  } catch (error) {
    return handleOrderError(res, error);
  }
};
