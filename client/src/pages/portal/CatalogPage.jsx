import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const PRODUCT_TYPES = ['Tất cả', 'License Key', 'Source Code', 'Plugin & UI Kit', 'API Quota', 'E-Book Kỹ thuật'];

const SAMPLE_CATALOG = [
  {
    ProductID: 1,
    ProductName: 'JetBrains All Products Pack 1 Năm',
    PathImage: 'https://placehold.co/400x260/0f172a/38bdf8?text=JetBrains+Pack',
    ProductType: 'License Key',
    Quantity: 30,
    Unit: 'License',
    Price: 1850000,
    Description: 'Trọn bộ IDE JetBrains bản quyền 12 tháng, cấp key mã hóa AES-256-GCM.'
  },
  {
    ProductID: 2,
    ProductName: 'Node.js Enterprise Auth & 2FA Boilerplate',
    PathImage: 'https://placehold.co/400x260/0f172a/34d399?text=Node+Auth+Kit',
    ProductType: 'Source Code',
    Quantity: 45,
    Unit: 'Gói',
    Price: 790000,
    Description: 'Mã nguồn chuẩn HttpOnly Cookie, 2FA TOTP, Audit Log & SHA-256 checksum.'
  },
  {
    ProductID: 3,
    ProductName: 'Tailwind Pro SaaS & Security Admin UI Kit',
    PathImage: 'https://placehold.co/400x260/0f172a/a78bfa?text=Tailwind+UI+Kit',
    ProductType: 'Plugin & UI Kit',
    Quantity: 60,
    Unit: 'Gói',
    Price: 450000,
    Description: 'Bộ 120+ UI component React + Tailwind CSS cho dashboard bảo mật.'
  },
  {
    ProductID: 4,
    ProductName: 'Gemini & LLM Proxy API Quota 1M Tokens',
    PathImage: 'https://placehold.co/400x260/0f172a/fbbf24?text=API+Quota+1M',
    ProductType: 'API Quota',
    Quantity: 100,
    Unit: 'Quota',
    Price: 290000,
    Description: 'Gói 1.000.000 token API có rate-limit riêng cho Chatbot & OCR.'
  },
  {
    ProductID: 5,
    ProductName: 'Cẩm nang Web Security Thực chiến (E-Book)',
    PathImage: 'https://placehold.co/400x260/0f172a/f87171?text=Web+Sec+Ebook',
    ProductType: 'E-Book Kỹ thuật',
    Quantity: 80,
    Unit: 'Tài liệu',
    Price: 180000,
    Description: 'Tài liệu phòng chống SQLi, XSS, CSRF, XXE, IDOR và HMAC/AES trong Node.js.'
  }
];

const PASTEL_COVERS = {
  'License Key': 'from-rose-100 to-amber-50',
  'Source Code': 'from-emerald-100 to-teal-50',
  'Plugin & UI Kit': 'from-pink-100 to-emerald-50',
  'API Quota': 'from-amber-100 to-rose-50',
  'E-Book Kỹ thuật': 'from-emerald-100 to-rose-50'
};

/**
 * [Form #3 — Thành viên B] Danh sách Gói Bản quyền & Tài nguyên Số (Tích hợp Meilisearch + Voice).
 */
export default function CatalogPage() {
  const { searchKeyword } = useOutletContext() || {};
  const { addItem } = useCart();
  const [selectedType, setSelectedType] = useState('Tất cả');

  const filtered = SAMPLE_CATALOG.filter((item) => {
    const matchType = selectedType === 'Tất cả' || item.ProductType === selectedType;
    const kw = (searchKeyword || '').trim().toLowerCase();
    const matchKw =
      !kw ||
      item.ProductName.toLowerCase().includes(kw) ||
      item.Description.toLowerCase().includes(kw);
    return matchType && matchKw;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-rose-100 via-white to-emerald-100 border border-rose-200/70 text-slate-800 p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Nền tảng Phân phối Bản quyền Số An toàn
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Kho Bản quyền Phần mềm, Mã nguồn &amp; Tài nguyên Số</h1>
          <p className="text-sm text-slate-600">
            Mỗi sản phẩm đi kèm mã kiểm chứng toàn vẹn SHA-256, cấp License Key mã hóa AES-256-GCM và hóa đơn xác thực HMAC-SHA256.
          </p>
        </div>
        <div className="text-xs bg-amber-50/90 border border-amber-200 rounded-xl p-3 space-y-1 text-amber-900">
          <div className="font-semibold flex items-center gap-1.5 text-amber-800">
            <Sparkles className="w-4 h-4" /> TODO [Thành viên B]:
          </div>
          <p className="text-amber-900">Nạp 45 sản phẩm từ PostgreSQL (`GET /api/products`) &amp; Meilisearch (`GET /api/search`).</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRODUCT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              selectedType === type
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const isDarkPlaceholder = !item.PathImage || item.PathImage.includes('placehold.co/400x260/0f172a');
          const coverGradient = PASTEL_COVERS[item.ProductType] || 'from-pink-100 to-emerald-50';

          return (
            <div key={item.ProductID} className="bg-white/90 rounded-2xl border border-rose-100/80 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
              {isDarkPlaceholder ? (
                <div className={`w-full h-44 bg-gradient-to-br ${coverGradient} border-b border-rose-100/80 flex flex-col items-center justify-center p-4 text-center`}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 bg-white/80 border border-amber-200 px-2.5 py-0.5 rounded-full mb-2">
                    {item.ProductType}
                  </span>
                  <span className="font-bold text-slate-800 text-base line-clamp-2">{item.ProductName}</span>
                </div>
              ) : (
                <img src={item.PathImage} alt={item.ProductName} className="w-full h-44 object-cover" />
              )}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                    {item.ProductType}
                  </span>
                  <Link
                    to={`/products/${item.ProductID}`}
                    className="block font-bold text-slate-900 hover:text-emerald-700 text-base transition"
                  >
                    {item.ProductName}
                  </Link>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.Description}</p>
                </div>
                <div className="pt-3 border-t border-rose-100/80 flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold text-emerald-700">{item.Price.toLocaleString('vi-VN')} đ</div>
                    <div className="text-[11px] text-slate-500">
                      Còn {item.Quantity} {item.Unit}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(item, 1)}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Thêm giỏ
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
