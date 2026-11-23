import React, { useEffect, useRef } from 'react';
import {
  ChevronDown,
  CopyPlus,
  Download,
  FileJson,
  FileSpreadsheet,
  FileCode2,
  HelpCircle,
  Plus,
  Trash2,
  Upload
} from 'lucide-react';

/**
 * [Thành viên A] Thanh công cụ 11 chức năng CRUD + Import/Export an toàn (.xlsx, .json, .xml).
 */
export default function ImportExportBarStub({
  selectedCount = 0,
  importing = false,
  exporting = false,
  exportMenuOpen = false,
  onToggleExportMenu,
  onCloseExportMenu,
  importInputRef,
  onOpenCreate,
  onBulkClone,
  onBulkDelete,
  onImportFile,
  onExportFormat,
  onOpenShortcuts
}) {
  const exportWrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportWrapRef.current && !exportWrapRef.current.contains(e.target)) {
        onCloseExportMenu?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCloseExportMenu]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenCreate}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Thêm mới (Alt+N)
        </button>

        <button
          type="button"
          onClick={onBulkClone}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
        >
          <CopyPlus className="w-4 h-4" /> Sao chép nhiều {selectedCount > 0 ? `(${selectedCount})` : ''} (Alt+C)
        </button>

        <button
          type="button"
          onClick={onBulkDelete}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
        >
          <Trash2 className="w-4 h-4" /> Xóa nhiều {selectedCount > 0 ? `(${selectedCount})` : ''} (Alt+D)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.json,.xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onImportFile?.(file);
          }}
          className="hidden"
        />

        <button
          type="button"
          disabled={importing}
          onClick={() => importInputRef?.current?.click()}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-60 font-medium inline-flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5 text-slate-600" />
          <span>{importing ? 'Đang Import...' : 'Import .xlsx/.json/.xml (Alt+I)'}</span>
        </button>

        <div ref={exportWrapRef} className="relative">
          <button
            type="button"
            disabled={exporting}
            onClick={onToggleExportMenu}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-60 font-medium inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>{exporting ? 'Đang xuất...' : 'Export (Alt+X)'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-xl z-30 py-1.5">
              <button
                type="button"
                onClick={() => onExportFormat?.('xlsx')}
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => onExportFormat?.('json')}
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              >
                <FileJson className="w-4 h-4 text-amber-600" />
                <span>Xuất JSON (.json)</span>
              </button>
              <button
                type="button"
                onClick={() => onExportFormat?.('xml')}
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              >
                <FileCode2 className="w-4 h-4 text-sky-600" />
                <span>Xuất XML (.xml)</span>
              </button>
            </div>
          )}
        </div>

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
