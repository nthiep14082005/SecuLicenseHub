import React, { useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export default function OrderIntegrityButton({ orderId }) {
  const pending = useRef(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setResult(null);
    try {
      const response = await axiosClient.get(`/orders/${orderId}/verify-integrity`);
      const valid = response.data?.data?.valid === true;
      setResult({ valid, message: valid ? 'Hóa đơn còn nguyên vẹn.' : 'Hóa đơn đã bị thay đổi. Vui lòng liên hệ hỗ trợ trước khi thanh toán.' });
    } catch (error) {
      setResult({ valid: false, message: error.response?.data?.message || 'Chưa thể kiểm chứng hóa đơn. Vui lòng thử lại.' });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button type="button" onClick={verify} disabled={busy}
        className="px-2.5 py-1 rounded border border-slate-300 text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50">
        <ShieldCheck className="w-3.5 h-3.5" /> {busy ? 'Đang kiểm chứng…' : 'Kiểm chứng HMAC'}
      </button>
      <p role="status" className={`text-xs ${result?.valid ? 'text-emerald-700' : result ? 'text-rose-700' : 'text-slate-500'}`}>
        {result?.message || 'Chưa kiểm chứng'}
      </p>
    </div>
  );
}
