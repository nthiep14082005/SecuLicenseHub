import React from 'react';
import { Columns3 } from 'lucide-react';

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
 * [Thành viên A] Khung Ẩn/Hiện cột Table lưu vào localStorage ('seculicense_admin_visible_columns').
 */
export default function ColumnToggleStub({ visibleColumns, onToggleColumn }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 mr-2">
        <Columns3 className="w-4 h-4 text-sky-600" />
        Ẩn/Hiện cột (localStorage):
      </span>
      {PRODUCT_COLUMNS.map((col) => {
        const checked = visibleColumns.includes(col);
        const locked = col === 'ProductName';
        return (
          <label
            key={col}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer ${
              checked ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={locked}
              onChange={() => onToggleColumn(col)}
            />
            <span>{col}</span>
          </label>
        );
      })}
    </div>
  );
}
