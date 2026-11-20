import React from 'react';
import { ReceiptText, ShieldAlert } from 'lucide-react';
import LicenseRevealCardStub from '../../components/portal/LicenseRevealCardStub';

const DEMO_LICENSES = [
  {
    licenseId: 101,
    orderId: 12,
    productName: 'JetBrains All Products Pack 1 Năm',
    status: 'ASSIGNED',
    demoPlaintext: 'JB-2026-SECU-9842-ABCD-EFGH'
  },
  {
    licenseId: 102,
    orderId: 12,
    productName: 'Node.js Enterprise Auth & 2FA Boilerplate',
    status: 'ASSIGNED',
    demoPlaintext: 'NODE-KIT-2026-4410-XYZW'
  }
];

/**
 * [Form #6 — Thành viên B] Hóa đơn & Kho License Cá nhân (Giải mã AES-256-GCM + Signed URL + Chống IDOR).
 */
export default function LicenseVaultPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kho License &amp; Lịch sử Hóa đơn</h1>
          <p className="text-sm text-slate-600">
            License Key được mã hóa AES-256-GCM trong PostgreSQL và chỉ giải mã cho đúng chủ sở hữu.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-emerald-400 text-xs font-medium">
          <ReceiptText className="w-4 h-4" /> Anti-IDOR + Signed URL 300s
        </span>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
        <div className="font-semibold flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> TODO [Thành viên B]:
        </div>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Tải danh sách hóa đơn từ <code>GET /api/orders/my</code> kèm nút kiểm chứng toàn vẹn <code>GET /api/orders/:id/verify-integrity</code>.</li>
          <li>Tải danh sách license từ <code>GET /api/licenses/my</code> và chỉ giải mã khi bấm <code>POST /api/licenses/:id/reveal</code>.</li>
          <li>Sinh link tải hết hạn 300 giây qua <code>POST /api/licenses/:id/download-link</code>.</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEMO_LICENSES.map((lic) => (
          <LicenseRevealCardStub key={lic.licenseId} license={lic} />
        ))}
      </div>
    </div>
  );
}
