import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Columns3, RotateCcw } from 'lucide-react';

export const PRODUCT_COLUMNS = [
  'ProductID',
  'PathImage',
  'ProductName',
  'ProductType',
  'Quantity',
  'Unit',
  'Price',
  'Description',
  'CreateDate',
  'UpdateDate'
];

/**
 * [Thành viên A] Dropdown Ẩn/Hiện cột Table lưu vào localStorage ('seculicense_admin_visible_columns').
 */
export default function ColumnToggleStub({ visibleColumns, onToggleColumn, onResetColumns }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
      >
        <Columns3 className="w-4 h-4 text-amber-600" />
        <span>Ẩn/Hiện cột ({visibleColumns.length}/{PRODUCT_COLUMNS.length})</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-rose-100 shadow-xl z-50 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800">Hiển thị cột bảng Product</span>
            {onResetColumns && (
              <button
                type="button"
                onClick={onResetColumns}
                className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Mặc định
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
            {PRODUCT_COLUMNS.map((col) => {
              const checked = visibleColumns.includes(col);
              const locked = col === 'ProductName';
              return (
                <label
                  key={col}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
                    checked ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50 text-slate-600'
                  } ${locked ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => onToggleColumn(col)}
                      className="rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="font-mono">{col}</span>
                  </span>
                  {locked && <span className="text-[10px] text-slate-500">Cố định</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
