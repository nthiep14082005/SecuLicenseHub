import React from 'react';
import { Copy, Eye, Pencil, Trash2 } from 'lucide-react';

const SAMPLE_ROWS = [
  {
    ProductID: 1,
    ProductName: 'JetBrains All Products Pack 1 Năm',
    PathImage: 'https://placehold.co/80x80/0f172a/38bdf8?text=JB',
    ProductType: 'License Key',
    Quantity: 30,
    Unit: 'License',
    Price: 1850000,
    Description: 'Bản quyền bộ IDE JetBrains chính hãng 12 tháng.',
    CreateDate: '2026-11-21T08:00:00.000Z',
    UpdateDate: '2026-11-21T08:00:00.000Z'
  },
  {
    ProductID: 2,
    ProductName: 'Node.js Enterprise Auth & 2FA Boilerplate',
    PathImage: 'https://placehold.co/80x80/0f172a/34d399?text=Node',
    ProductType: 'Source Code',
    Quantity: 45,
    Unit: 'Gói',
    Price: 790000,
    Description: 'Mã nguồn mẫu Express + PostgreSQL + HttpOnly Cookie + 2FA TOTP.',
    CreateDate: '2026-11-21T08:05:00.000Z',
    UpdateDate: '2026-11-21T08:05:00.000Z'
  }
];

/**
 * [Thành viên A] Khung bảng Product 10 cột chuẩn (PascalCase) + Checkbox chọn nhiều.
 */
export default function ProductTableStub({ visibleColumns }) {
  const show = (col) => !visibleColumns || visibleColumns.includes(col);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
          <tr>
            <th className="p-3 w-10">
              <input type="checkbox" aria-label="Chọn tất cả" />
            </th>
            {show('ProductID') && <th className="p-3">ProductID</th>}
            {show('PathImage') && <th className="p-3">PathImage</th>}
            {show('ProductName') && <th className="p-3">ProductName</th>}
            {show('ProductType') && <th className="p-3">ProductType</th>}
            {show('Quantity') && <th className="p-3">Quantity</th>}
            {show('Unit') && <th className="p-3">Unit</th>}
            {show('Price') && <th className="p-3">Price</th>}
            {show('Description') && <th className="p-3">Description</th>}
            {show('CreateDate') && <th className="p-3">CreateDate</th>}
            {show('UpdateDate') && <th className="p-3">UpdateDate</th>}
            <th className="p-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {SAMPLE_ROWS.map((row) => (
            <tr key={row.ProductID} className="hover:bg-slate-50">
              <td className="p-3">
                <input type="checkbox" aria-label={`Chọn ${row.ProductName}`} />
              </td>
              {show('ProductID') && <td className="p-3 font-mono text-xs">{row.ProductID}</td>}
              {show('PathImage') && (
                <td className="p-3">
                  <img src={row.PathImage} alt={row.ProductName} className="w-9 h-9 rounded object-cover" />
                </td>
              )}
              {show('ProductName') && <td className="p-3 font-medium text-slate-900">{row.ProductName}</td>}
              {show('ProductType') && (
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-medium">
                    {row.ProductType}
                  </span>
                </td>
              )}
              {show('Quantity') && <td className="p-3">{row.Quantity}</td>}
              {show('Unit') && <td className="p-3">{row.Unit}</td>}
              {show('Price') && <td className="p-3 font-semibold">{row.Price.toLocaleString('vi-VN')} đ</td>}
              {show('Description') && (
                <td className="p-3 max-w-xs truncate text-slate-600">{row.Description}</td>
              )}
              {show('CreateDate') && <td className="p-3 text-xs text-slate-500">21/11/2026</td>}
              {show('UpdateDate') && <td className="p-3 text-xs text-slate-500">21/11/2026</td>}
              <td className="p-3">
                <div className="flex items-center justify-end gap-1.5 text-slate-500">
                  <button type="button" title="Xem chi tiết (Alt+V)" className="p-1.5 hover:text-sky-600">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button type="button" title="Cập nhật (Alt+E)" className="p-1.5 hover:text-amber-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" title="Sao chép 1 (Alt+C)" className="p-1.5 hover:text-emerald-600">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button type="button" title="Xóa 1 (Alt+D)" className="p-1.5 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
