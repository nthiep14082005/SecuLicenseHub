import React from 'react';
import { CopyPlus, Download, HelpCircle, Plus, Trash2, Upload } from 'lucide-react';

/**
 * [Thành viên A] Thanh công cụ 11 chức năng CRUD + Import/Export an toàn (.xlsx, .json, .xml).
 */
export default function ImportExportBarStub({ onOpenShortcuts }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 opacity-90"
        >
          <Plus className="w-4 h-4" /> Thêm mới (Alt+N)
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 opacity-90"
        >
          <CopyPlus className="w-4 h-4" /> Sao chép nhiều (Alt+C)
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 opacity-90"
        >
          <Trash2 className="w-4 h-4" /> Xóa nhiều (Alt+D)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-medium inline-flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> Import .xlsx/.json/.xml (Alt+I)
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-medium inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export (Alt+X)
        </button>
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold inline-flex items-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" /> Phím tắt (Alt+H)
        </button>
      </div>
    </div>
  );
}
