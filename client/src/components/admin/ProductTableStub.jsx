import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Image as ImageIcon,
  Pencil,
  Trash2
} from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

export function resolveProductImageUrl(pathImage) {
  if (!pathImage) return '';
  if (pathImage.startsWith('http://') || pathImage.startsWith('https://') || pathImage.startsWith('data:')) {
    return pathImage;
  }
  return `${API_ORIGIN}${pathImage.startsWith('/') ? '' : '/'}${pathImage}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * [Thành viên A] Bảng Product 10 cột chuẩn (PascalCase) + Chọn nhiều + Phân trang 10-15 dòng.
 */
export default function ProductTableStub({
  products = [],
  loading = false,
  visibleColumns,
  selectedIds = [],
  activeProductId = null,
  pagination = { page: 1, limit: 12, totalItems: 0, totalPages: 1 },
  sortBy = 'ProductID',
  sortOrder = 'DESC',
  onToggleSelectAll,
  onToggleSelectOne,
  onSelectActiveRow,
  onSortChange,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onClone,
  onDelete
}) {
  const show = (col) => !visibleColumns || visibleColumns.includes(col);

  const pageIds = products.map((p) => p.ProductID);
  const allSelectedOnPage =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const renderSortHeader = (colKey, label) => {
    const isSorted = sortBy === colKey;
    return (
      <button
        type="button"
        onClick={() => onSortChange?.(colKey)}
        className="inline-flex items-center gap-1 font-semibold hover:text-slate-900"
      >
        <span>{label}</span>
        {isSorted &&
          (sortOrder === 'ASC' ? (
            <ArrowUp className="w-3 h-3 text-sky-600" />
          ) : (
            <ArrowDown className="w-3 h-3 text-sky-600" />
          ))}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả trên trang"
                  checked={allSelectedOnPage}
                  onChange={() => onToggleSelectAll?.(pageIds)}
                />
              </th>
              {show('ProductID') && <th className="p-3">{renderSortHeader('ProductID', 'ProductID')}</th>}
              {show('PathImage') && <th className="p-3">PathImage</th>}
              {show('ProductName') && (
                <th className="p-3">{renderSortHeader('ProductName', 'ProductName')}</th>
              )}
              {show('ProductType') && (
                <th className="p-3">{renderSortHeader('ProductType', 'ProductType')}</th>
              )}
              {show('Quantity') && <th className="p-3">{renderSortHeader('Quantity', 'Quantity')}</th>}
              {show('Unit') && <th className="p-3">Unit</th>}
              {show('Price') && <th className="p-3">{renderSortHeader('Price', 'Price')}</th>}
              {show('Description') && <th className="p-3">Description</th>}
              {show('CreateDate') && (
                <th className="p-3">{renderSortHeader('CreateDate', 'CreateDate')}</th>
              )}
              {show('UpdateDate') && (
                <th className="p-3">{renderSortHeader('UpdateDate', 'UpdateDate')}</th>
              )}
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-xs text-slate-500">
                  Đang tải danh sách sản phẩm từ PostgreSQL...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-xs text-slate-500">
                  Chưa có sản phẩm nào khớp điều kiện tìm kiếm. Hãy nhấn <strong>Thêm mới (Alt+N)</strong> hoặc <strong>Import</strong>.
                </td>
              </tr>
            ) : (
              products.map((row) => {
                const isChecked = selectedIds.includes(row.ProductID);
                const isActive = activeProductId === row.ProductID;
                const imgUrl = resolveProductImageUrl(row.PathImage);

                return (
                  <tr
                    key={row.ProductID}
                    onClick={() => onSelectActiveRow?.(row.ProductID)}
                    className={`cursor-pointer transition ${
                      isChecked
                        ? 'bg-sky-50/70'
                        : isActive
                        ? 'bg-slate-100/80'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td
                      className="p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelectOne?.(row.ProductID)}
                        aria-label={`Chọn ${row.ProductName}`}
                      />
                    </td>
                    {show('ProductID') && (
                      <td className="p-3 font-mono text-xs text-slate-700">{row.ProductID}</td>
                    )}
                    {show('PathImage') && (
                      <td className="p-3">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={row.ProductName}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                    )}
                    {show('ProductName') && (
                      <td className="p-3 font-medium text-slate-900 min-w-[200px]">
                        {row.ProductName}
                      </td>
                    )}
                    {show('ProductType') && (
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-medium">
                          {row.ProductType}
                        </span>
                      </td>
                    )}
                    {show('Quantity') && (
                      <td className="p-3 font-mono text-xs">
                        <span
                          className={
                            row.Quantity === 0 ? 'text-rose-600 font-semibold' : 'text-slate-700'
                          }
                        >
                          {row.Quantity}
                        </span>
                      </td>
                    )}
                    {show('Unit') && <td className="p-3 text-xs text-slate-700">{row.Unit}</td>}
                    {show('Price') && (
                      <td className="p-3 font-semibold whitespace-nowrap text-slate-900">
                        {Number(row.Price || 0).toLocaleString('vi-VN')} đ
                      </td>
                    )}
                    {show('Description') && (
                      <td className="p-3 max-w-xs truncate text-xs text-slate-600" title={row.Description}>
                        {row.Description || '—'}
                      </td>
                    )}
                    {show('CreateDate') && (
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(row.CreateDate)}
                      </td>
                    )}
                    {show('UpdateDate') && (
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(row.UpdateDate)}
                      </td>
                    )}
                    <td
                      className="p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1 text-slate-500">
                        <button
                          type="button"
                          onClick={() => onView?.(row)}
                          title="Xem chi tiết (Alt+V)"
                          className="p-1.5 rounded hover:bg-sky-50 hover:text-sky-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit?.(row)}
                          title="Cập nhật (Alt+E)"
                          className="p-1.5 rounded hover:bg-amber-50 hover:text-amber-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onClone?.(row)}
                          title="Sao chép 1 (Alt+C)"
                          className="p-1.5 rounded hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete?.(row)}
                          title="Xóa 1 (Alt+D)"
                          className="p-1.5 rounded hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Thanh phân trang 10-15 dòng */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <select
            value={pagination.limit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800 font-medium"
          >
            <option value={10}>10 dòng/trang</option>
            <option value={12}>12 dòng/trang</option>
            <option value={15}>15 dòng/trang</option>
          </select>
          <span>
            · Tổng <strong>{pagination.totalItems}</strong> sản phẩm
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange?.(pagination.page - 1)}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Trước
          </button>
          <span className="px-2 font-medium text-slate-800">
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange?.(pagination.page + 1)}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1"
          >
            Sau <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
