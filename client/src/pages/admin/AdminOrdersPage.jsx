import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

const STATUS_BADGE_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-sky-50 text-sky-800 border-sky-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-800 border-rose-200'
};

/**
 * [Form #9A — Thành viên A & B] Quản lý Hóa đơn & Kiểm chứng chữ ký HMAC-SHA256.
 */
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1
  });
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/orders', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter === 'ALL' ? undefined : statusFilter
        }
      });
      setOrders(res.data?.data || []);
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Không thể tải danh sách hóa đơn.'
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (order, nextStatus) => {
    if (!order || order.status === nextStatus) return;

    if (
      nextStatus === 'CANCELLED' &&
      !window.confirm(
        `Bạn có chắc muốn hủy đơn #${order.orderId}? Hệ thống sẽ hoàn tồn kho và thu hồi license đã gán.`
      )
    ) {
      return;
    }

    setUpdatingOrderId(order.orderId);
    setFeedback(null);
    try {
      const res = await axiosClient.patch(`/orders/${order.orderId}/status`, {
        status: nextStatus
      });
      setFeedback({
        type: 'success',
        message: res.data?.message || `Đã cập nhật đơn #${order.orderId} sang ${nextStatus}`
      });
      fetchOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng.'
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleVerifyIntegrity = async (orderId) => {
    setFeedback(null);
    try {
      const res = await axiosClient.get(`/orders/${orderId}/verify-integrity`);
      const valid = res.data?.data?.valid;
      setFeedback({
        type: valid ? 'success' : 'error',
        message:
          res.data?.message ||
          (valid
            ? `Đơn #${orderId}: Chữ ký HMAC-SHA256 hợp lệ.`
            : `Đơn #${orderId}: Phát hiện sai lệch chữ ký HMAC!`)
      });
    } catch (err) {
      if (err.response?.status === 501) {
        setFeedback({
          type: 'info',
          message:
            'API kiểm chứng chi tiết (/verify-integrity) đang được Thành viên B hoàn thiện; trạng thái HMAC hiện tại đã được kiểm tra ngay trên bảng danh sách.'
        });
      } else {
        setFeedback({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi kiểm chứng HMAC đơn hàng.'
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản lý Hóa đơn &amp; Kiểm chứng HMAC-SHA256
          </h1>
          <p className="text-xs text-slate-600">
            Duyệt / cập nhật trạng thái hóa đơn và theo dõi chữ ký toàn vẹn chống sửa giá DB.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Bộ lọc trạng thái */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => {
              setStatusFilter(st);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              statusFilter === st
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? 'Tất cả' : st}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'info'
              ? 'bg-sky-50 border-sky-200 text-sky-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3">Mã đơn</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Sản phẩm</th>
                <th className="p-3">Thanh toán</th>
                <th className="p-3">Tổng tiền</th>
                <th className="p-3">Toàn vẹn HMAC</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Duyệt / Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-500">
                    Đang tải danh sách hóa đơn...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-500">
                    Chưa có hóa đơn nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs font-semibold">#{ord.orderId}</td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900 text-xs">
                        {ord.customerName || 'Khách hàng'}
                      </div>
                      <div className="text-[11px] text-slate-500">{ord.customerEmail}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-600 max-w-xs">
                      {Array.isArray(ord.items) && ord.items.length > 0
                        ? ord.items
                            .map(
                              (item) =>
                                `${item.ProductName || `#${item.ProductID}`} (x${item.Quantity})`
                            )
                            .join(', ')
                        : '—'}
                    </td>
                    <td className="p-3 text-xs font-mono">{ord.paymentMethod}</td>
                    <td className="p-3 font-semibold whitespace-nowrap">
                      {Number(ord.totalAmount || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {ord.hmacValid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> HMAC Hợp lệ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-semibold">
                          <ShieldAlert className="w-3.5 h-3.5" /> Sai lệch HMAC!
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded border text-xs font-semibold ${
                          STATUS_BADGE_STYLES[ord.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {ord.status === 'PENDING' && (
                          <button
                            type="button"
                            disabled={updatingOrderId === ord.orderId}
                            onClick={() => handleStatusChange(ord, 'CONFIRMED')}
                            className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-medium inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                          </button>
                        )}
                        <select
                          value={ord.status}
                          disabled={updatingOrderId === ord.orderId}
                          onChange={(e) => handleStatusChange(ord, e.target.value)}
                          aria-label={`Đổi trạng thái đơn ${ord.orderId}`}
                          className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-medium text-slate-700"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleVerifyIntegrity(ord.orderId)}
                          title="Kiểm chứng HMAC-SHA256"
                          className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <ReceiptText className="w-3.5 h-3.5" /> HMAC
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Tổng <strong>{pagination.totalItems}</strong> hóa đơn
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Trước
            </button>
            <span className="font-medium text-slate-800">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1"
            >
              Sau <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
