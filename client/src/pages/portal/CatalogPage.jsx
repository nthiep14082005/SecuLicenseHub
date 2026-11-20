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
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 text-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 bg-sky-500/10 border border-sky-400/30 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Nền tảng Phân phối Bản quyền Số An toàn
          </div>
          <h1 className="text-2xl font-bold">Kho Bản quyền Phần mềm, Mã nguồn &amp; Tài nguyên Số</h1>
          <p className="text-sm text-slate-300">
            Mỗi sản phẩm đi kèm mã kiểm chứng toàn vẹn SHA-256, cấp License Key mã hóa AES-256-GCM và hóa đơn xác thực HMAC-SHA256.
          </p>
        </div>
        <div className="text-xs bg-white/10 border border-white/15 rounded-xl p-3 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-300">
            <Sparkles className="w-4 h-4" /> TODO [Thành viên B]:
          </div>
          <p className="text-slate-200">Nạp 45 sản phẩm từ PostgreSQL (`GET /api/products`) &amp; Meilisearch (`GET /api/search`).</p>
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
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div key={item.ProductID} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
            <img src={item.PathImage} alt={item.ProductName} className="w-full h-44 object-cover" />
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <span className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[11px] font-semibold">
                  {item.ProductType}
                </span>
                <Link
                  to={`/products/${item.ProductID}`}
                  className="block font-bold text-slate-900 hover:text-sky-600 text-base"
                >
                  {item.ProductName}
                </Link>
                <p className="text-xs text-slate-600 line-clamp-2">{item.Description}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-slate-900">{item.Price.toLocaleString('vi-VN')} đ</div>
                  <div className="text-[11px] text-slate-500">
                    Còn {item.Quantity} {item.Unit}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addItem(item, 1)}
                  className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Thêm giỏ
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
