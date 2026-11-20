/**
 * ============================================================================
 * ORDERS SERVICE SKELETON — TODO [Thành viên B (Tạo đơn/My/Verify) & Thành viên A (Duyệt đơn)]
 * ============================================================================
 * - Thành viên B: Đặt đơn atomic với SELECT ... FOR UPDATE, gán license_keys AVAILABLE -> ASSIGNED,
 *   tạo orders.integrity_hmac bằng signOrderHmac(), sinh QR VietQR:
 *   https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${total}&addInfo=SECULICENSE_${orderId}
 * - Thành viên A: Danh sách hóa đơn Admin & đổi trạng thái (hoàn kho & thu hồi key nếu CANCELLED).
 */

module.exports = {};
