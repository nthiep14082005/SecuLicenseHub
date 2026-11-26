import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, ShieldCheck, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import axiosClient from '../../api/axiosClient';
import OrderIntegrityButton from '../../components/portal/OrderIntegrityButton';

const ORDER_STATUSES = { PENDING: 'Chờ xác nhận thanh toán', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' };

/**
 * [Form #5 — Thành viên B] Giỏ hàng & Thanh toán VietQR (Ký HMAC-SHA256 + Trừ kho FOR UPDATE).
 */
export default function CheckoutPage() {
  const { items, totalAmount, updateQuantity, removeItem, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('VIETQR');
  const [note, setNote] = useState('');
  const [apiNotice, setApiNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [historyNotice, setHistoryNotice] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyPending = useRef(false);
  const [qrFailed, setQrFailed] = useState(false);

  const selectOrder = (selected) => {
    setOrder(selected);
    setQrFailed(false);
  };

  const loadHistory = async (page = 1) => {
    if (historyPending.current) return;
    historyPending.current = true;
    setHistoryLoading(true);
    setHistoryNotice('');
    try {
      const response = await axiosClient.get('/orders/my', { params: { page, limit: 12 } });
      setHistory(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      setHistoryNotice(error.response?.data?.message || 'Không tải được lịch sử đơn hàng.');
    } finally {
      historyPending.current = false;
      setHistoryLoading(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (pending.current || items.length === 0) return;
    if (items.some((item) => !Number.isInteger(item.Quantity) || item.Quantity < 1)) {
      setApiNotice('Số lượng phải là số nguyên dương.');
      return;
    }
    pending.current = true;
    setSubmitting(true);
    setApiNotice('');
    try {
      const payload = {
        paymentMethod,
        note,
        items: items.map((it) => ({ ProductID: it.ProductID, Quantity: it.Quantity }))
      };
      const res = await axiosClient.post('/orders', payload);
      selectOrder(res.data.data);
      clearCart();
      setHistory([]);
      setPagination(null);
      setApiNotice(res.data?.message || 'Đặt đơn thành công');
    } catch (err) {
      setApiNotice(err.response?.data?.message || 'Chưa nhận được kết quả đặt hàng. Hãy tải lịch sử đơn bên dưới trước khi đặt lại để tránh trùng đơn.');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Giỏ hàng Bản quyền Số</h1>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Giỏ hàng đang trống. Hãy chọn gói bản quyền ở trang Danh mục.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.ProductID} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm text-slate-900">{item.ProductName}</div>
                  <div className="text-xs text-slate-500">
                    {item.Price.toLocaleString('vi-VN')} đ / {item.Unit}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    disabled={submitting}
                    aria-label={`Số lượng ${item.ProductName}`}
                    value={item.Quantity}
                    onChange={(e) => updateQuantity(item.ProductID, Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  <button
                    type="button"
                    disabled={submitting}
                    aria-label={`Xóa ${item.ProductName}`}
                    onClick={() => removeItem(item.ProductID)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handlePlaceOrder} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
        <h2 className="font-bold text-slate-900">Thanh toán</h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phương thức</label>
          <select
            value={paymentMethod}
            disabled={submitting}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="VIETQR">Chuyển khoản QR (VietQR động)</option>
            <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú đơn hàng</label>
          <textarea
            rows={2}
            maxLength={2000}
            disabled={submitting}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Email nhận thông báo hóa đơn..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Tạm tính:</span>
          <span className="text-lg font-bold text-sky-700">{totalAmount.toLocaleString('vi-VN')} đ</span>
        </div>

        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Xác nhận giá khi đặt hàng
          </div>
          <p>
            Số tiền thanh toán được xác nhận theo giá hiện tại. Hãy kiểm tra hóa đơn trước khi chuyển khoản.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || items.length === 0}
          className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <QrCode className="w-4 h-4" /> {submitting ? 'Đang đặt hàng…' : 'Xác nhận đặt hàng'}
        </button>

        {apiNotice && (
          <div role="status" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">{apiNotice}</div>
        )}
        <Link to="/login" className="block text-xs text-sky-700 underline">Đăng nhập để đặt hàng và xem lịch sử</Link>
      </form>

      {order && (
        <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold">Đơn hàng #{order.orderId} — {ORDER_STATUSES[order.status] || order.status}</h2>
          <p className="text-lg font-semibold">Tổng tiền: {Number(order.totalAmount).toLocaleString('vi-VN')} đ</p>
          <ul className="text-sm space-y-1">
            {order.items.map((item) => <li key={item.ProductID}>{item.ProductName} × {item.Quantity} — {Number(item.unitPrice).toLocaleString('vi-VN')} đ / sản phẩm</li>)}
          </ul>
          {order.status === 'PENDING' && (
            <div className="flex flex-wrap gap-6 items-center">
              {order.paymentMethod === 'VIETQR' && !qrFailed && (
                <img src={order.vietqrUrl} alt={`Mã VietQR thanh toán đơn ${order.orderId}`} onError={() => setQrFailed(true)} referrerPolicy="no-referrer" className="w-64 max-w-full" />
              )}
              <div className="text-sm space-y-2">
                {qrFailed && <p role="status">Chưa tải được mã QR. Bạn có thể chuyển khoản theo thông tin dưới đây.</p>}
                <p>Ngân hàng: {order.payment.bankId}</p>
                <p>Số tài khoản: {order.payment.accountNo}</p>
                <p>Chủ tài khoản: {order.payment.accountName}</p>
                <p>Nội dung chuyển khoản: <strong>{order.payment.transferContent}</strong></p>
                <p>Đơn hàng sẽ được xác nhận sau khi kiểm tra thanh toán.</p>
              </div>
            </div>
          )}
          <OrderIntegrityButton key={order.orderId} orderId={order.orderId} />
          <Link to="/vault" className="inline-block text-sm text-sky-700 underline">Đến kho license</Link>
        </section>
      )}

      <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <h2 className="font-bold">Đơn hàng của tôi</h2>
          <button type="button" disabled={historyLoading || submitting} onClick={() => loadHistory()} className="text-sm text-sky-700 disabled:opacity-50">
            {historyLoading ? 'Đang tải…' : 'Tải / làm mới lịch sử'}
          </button>
        </div>
        {historyNotice && <p role="status" className="text-sm text-rose-700">{historyNotice}</p>}
        {pagination && history.length === 0 && <p className="text-sm">Chưa có đơn hàng.</p>}
        {history.map((entry) => (
          <button key={entry.orderId} type="button" onClick={() => selectOrder(entry)} className="block w-full text-left border rounded-lg p-3 text-sm hover:bg-slate-50">
            #{entry.orderId} · {Number(entry.totalAmount).toLocaleString('vi-VN')} đ · {ORDER_STATUSES[entry.status] || entry.status}
          </button>
        ))}
        {pagination?.totalPages > 1 && (
          <div className="flex gap-4 text-sm">
            <button type="button" disabled={historyLoading || pagination.page <= 1} onClick={() => loadHistory(pagination.page - 1)} className="disabled:opacity-50">Trang trước</button>
            <span>{pagination.page} / {pagination.totalPages}</span>
            <button type="button" disabled={historyLoading || pagination.page >= pagination.totalPages} onClick={() => loadHistory(pagination.page + 1)} className="disabled:opacity-50">Trang sau</button>
          </div>
        )}
      </section>
    </div>
  );
}
