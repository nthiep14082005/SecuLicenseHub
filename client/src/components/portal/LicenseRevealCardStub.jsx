import React, { useState } from 'react';
import { Download, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';

/**
 * [Thành viên B] Thẻ hiển thị License Key đã mã hóa AES-256-GCM + nút tải qua Signed URL 300s.
 */
export default function LicenseRevealCardStub({ license }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="bg-white/90 rounded-xl border border-rose-100/80 p-4 shadow-sm hover:shadow-md transition space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-amber-600" />
          <div>
            <div className="font-semibold text-slate-900 text-sm">{license.productName}</div>
            <div className="text-xs text-slate-500">
              Đơn #{license.orderId} · Trạng thái: {license.status}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" /> AES-256-GCM Protected
        </span>
      </div>

      <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200 text-emerald-900 font-mono text-xs flex items-center justify-between gap-2">
        <span>{revealed ? license.demoPlaintext : 'XXXX-XXXX-XXXX-•••• (Đã mã hóa)'}</span>
        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-sans font-semibold transition"
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-semibold transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tải gói qua Signed URL (5 phút)</span>
        </button>
      </div>
    </div>
  );
}
