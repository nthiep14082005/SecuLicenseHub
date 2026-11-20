const { sendNotImplemented } = require('../../utils/response.util');
const ordersService = require('./orders.service');

void ordersService;

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

exports.verifyOrderIntegrity = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'GET /api/orders/:id/verify-integrity',
    todo: 'Kiểm tra chủ sở hữu hoặc quyền ADMIN, gọi verifyOrderHmac() đối chiếu integrity_hmac trong DB để phát hiện sửa giá.'
  });
