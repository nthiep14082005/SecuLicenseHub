import React, { useState } from 'react';
import { Download, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';

/**
 * [Thành viên B] Thẻ hiển thị License Key đã mã hóa AES-256-GCM + nút tải qua Signed URL 300s.
 */
export default function LicenseRevealCardStub({ license }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-sky-600" />
          <div>
            <div className="font-semibold text-slate-900 text-sm">{license.productName}</div>
            <div className="text-xs text-slate-500">
              Đơn #{license.orderId} · Trạng thái: {license.status}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" /> AES-256-GCM Protected
        </span>
      </div>

      <div className="p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs flex items-center justify-between">
        <span>{revealed ? license.demoPlaintext : 'XXXX-XXXX-XXXX-•••• (Đã mã hóa)'}</span>
        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-sans"
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{revealed ? 'Ẩn' : 'Giải mã (Stub)'}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">
          TODO [B]: Gọi <code>POST /api/licenses/:id/reveal</code> &amp; <code>download-link</code> (TTL 300s)
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tải gói qua Signed URL (5 phút)</span>
        </button>
      </div>
    </div>
  );
}
