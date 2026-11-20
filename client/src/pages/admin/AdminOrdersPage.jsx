import React from 'react';
import { CheckCircle2, ReceiptText, ShieldCheck } from 'lucide-react';

const DEMO_ORDERS = [
  {
    orderId: 12,
    customerEmail: 'quan.customer@seculicense.vn',
    totalAmount: 2640000,
    paymentMethod: 'VIETQR',
    status: 'PENDING',
    hmacValid: true
  },
  {
    orderId: 11,
    customerEmail: 'vy.tran@example.com',
    totalAmount: 450000,
    paymentMethod: 'VIETQR',
    status: 'COMPLETED',
    hmacValid: true
  }
];

/**
 * [Form #9A — Thành viên A & B] Quản lý Hóa đơn & Kiểm chứng chữ ký HMAC-SHA256.
 */
export default function AdminOrdersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Hóa đơn &amp; Kiểm chứng HMAC-SHA256</h1>
        <p className="text-xs text-slate-600">
          Thành viên A duyệt/hủy đơn; Thành viên B cung cấp API kiểm chứng chữ ký toàn vẹn chống sửa giá DB.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3">Mã đơn</th>
              <th className="p-3">Khách hàng</th>
              <th className="p-3">Thanh toán</th>
              <th className="p-3">Tổng tiền</th>
              <th className="p-3">Toàn vẹn HMAC</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_ORDERS.map((ord) => (
              <tr key={ord.orderId}>
                <td className="p-3 font-mono text-xs">#{ord.orderId}</td>
                <td className="p-3">{ord.customerEmail}</td>
                <td className="p-3">{ord.paymentMethod}</td>
                <td className="p-3 font-semibold">{ord.totalAmount.toLocaleString('vi-VN')} đ</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> HMAC Hợp lệ
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs font-semibold">
                    {ord.status}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded bg-sky-600 text-white text-xs font-medium inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt đơn (Stub)
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded border border-slate-300 text-xs font-medium inline-flex items-center gap-1"
                  >
                    <ReceiptText className="w-3.5 h-3.5" /> Kiểm chứng HMAC
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
        TODO [Thành viên A]: Nối <code>GET /api/orders</code> và <code>PATCH /api/orders/:id/status</code> · TODO [Thành viên B]: Nối <code>GET /api/orders/:id/verify-integrity</code>.
      </div>
    </div>
  );
}
