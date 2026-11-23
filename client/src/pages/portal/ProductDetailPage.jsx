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
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 hover:underline font-semibold">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh mục
      </Link>

      <div className="bg-white/90 rounded-2xl border border-rose-100/80 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
        {!demoProduct.PathImage || demoProduct.PathImage.includes('placehold.co/600x400/0f172a') ? (
          <div className="w-full min-h-[260px] rounded-xl bg-gradient-to-br from-emerald-100 via-white to-rose-100 border border-rose-100 flex flex-col items-center justify-center p-6 text-center">
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold mb-3">
              {demoProduct.ProductType}
            </span>
            <div className="text-lg font-bold text-slate-800 max-w-sm">{demoProduct.ProductName}</div>
          </div>
        ) : (
          <img src={demoProduct.PathImage} alt={demoProduct.ProductName} className="w-full rounded-xl object-cover" />
        )}

        <div className="space-y-4">
          <span className="inline-block px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
            {demoProduct.ProductType}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{demoProduct.ProductName}</h1>
          <div className="text-2xl font-extrabold text-emerald-700">
            {demoProduct.Price.toLocaleString('vi-VN')} đ{' '}
            <span className="text-xs font-normal text-slate-500">/ {demoProduct.Unit}</span>
          </div>
          <p className="text-sm text-slate-600">{demoProduct.Description}</p>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <FileCheck2 className="w-4 h-4" /> Mã kiểm chứng toàn vẹn tệp (SHA-256)
            </div>
            <div className="font-mono text-[11px] break-all text-slate-700">{demoProduct.FileSha256}</div>
          </div>

          <button
            type="button"
            onClick={() => addItem(demoProduct, 1)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition"
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
