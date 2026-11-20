import React, { useState } from 'react';
import { QrCode, ShieldCheck, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import axiosClient from '../../api/axiosClient';

/**
 * [Form #5 — Thành viên B] Giỏ hàng & Thanh toán VietQR (Ký HMAC-SHA256 + Trừ kho FOR UPDATE).
 */
export default function CheckoutPage() {
  const { items, totalAmount, updateQuantity, removeItem } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('VIETQR');
  const [note, setNote] = useState('');
  const [apiNotice, setApiNotice] = useState('');

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        paymentMethod,
        note,
        items: items.map((it) => ({ ProductID: it.ProductID, Quantity: it.Quantity }))
      };
      const res = await axiosClient.post('/orders', payload);
      setApiNotice(res.data?.message || 'Đặt đơn thành công');
    } catch (err) {
      setApiNotice(err.response?.data?.message || 'Lỗi kết nối API /api/orders');
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
                    value={item.Quantity}
                    onChange={(e) => updateQuantity(item.ProductID, Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  <button
                    type="button"
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
        <h2 className="font-bold text-slate-900">Thanh toán An toàn (VietQR + HMAC)</h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phương thức</label>
          <select
            value={paymentMethod}
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
            <ShieldCheck className="w-4 h-4" /> Phòng chống Sửa giá (Price Tampering)
          </div>
          <p>
            Backend tự truy vấn giá gốc từ PostgreSQL trong Transaction <code>FOR UPDATE</code> và ký{' '}
            <code>HMAC-SHA256</code> cho hóa đơn.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
        >
          <QrCode className="w-4 h-4" /> Xác nhận Đặt hàng &amp; Sinh VietQR
        </button>

        {apiNotice && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">{apiNotice}</div>
        )}
      </form>
    </div>
  );
}
