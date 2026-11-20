import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileCheck2, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

/**
 * [Form #4 — Thành viên B] Trang Chi tiết Gói Bản quyền (Hiển thị Checksum SHA-256).
 */
export default function ProductDetailPage() {
  const { id } = useParams();
  const { addItem } = useCart();

  const demoProduct = {
    ProductID: Number(id || 1),
    ProductName: `Tài nguyên số mẫu #${id || 1} — Node.js Enterprise Auth Boilerplate`,
    PathImage: 'https://placehold.co/600x400/0f172a/34d399?text=SecuLicense+Asset',
    ProductType: 'Source Code',
    Quantity: 45,
    Unit: 'Gói',
    Price: 790000,
    Description:
      'Gói mã nguồn chuẩn HttpOnly Cookie, 2FA TOTP, Audit Logging và Signed Download URL hết hạn sau 300 giây.',
    FileSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-sky-700 hover:underline font-medium">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh mục
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
        <img src={demoProduct.PathImage} alt={demoProduct.ProductName} className="w-full rounded-xl object-cover" />

        <div className="space-y-4">
          <span className="inline-block px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold">
            {demoProduct.ProductType}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{demoProduct.ProductName}</h1>
          <div className="text-2xl font-extrabold text-sky-700">
            {demoProduct.Price.toLocaleString('vi-VN')} đ{' '}
            <span className="text-xs font-normal text-slate-500">/ {demoProduct.Unit}</span>
          </div>
          <p className="text-sm text-slate-600">{demoProduct.Description}</p>

          <div className="p-3 rounded-xl bg-slate-950 text-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <FileCheck2 className="w-4 h-4" /> Mã kiểm chứng toàn vẹn tệp (SHA-256)
            </div>
            <div className="font-mono text-[11px] break-all text-slate-300">{demoProduct.FileSha256}</div>
          </div>

          <button
            type="button"
            onClick={() => addItem(demoProduct, 1)}
            className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" /> Thêm vào giỏ hàng
          </button>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> TODO [Thành viên B]:
            </div>
            <p>
              Gọi <code>GET /api/products/{id}</code> để lấy 10 trường chuẩn + <code>FileSha256</code> thật từ PostgreSQL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
