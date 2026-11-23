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
    <div className="relative z-30 bg-white/95 rounded-xl border border-rose-100/80 shadow-sm p-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenCreate}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Thêm mới (Alt+N)
        </button>

        <button
          type="button"
          onClick={onBulkClone}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
        >
          <CopyPlus className="w-4 h-4" /> Sao chép nhiều {selectedCount > 0 ? `(${selectedCount})` : ''} (Alt+C)
        </button>

        <button
          type="button"
          onClick={onBulkDelete}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
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
          className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-60 font-medium inline-flex items-center gap-1.5 transition"
        >
          <Upload className="w-3.5 h-3.5 text-amber-700" />
          <span>{importing ? 'Đang Import...' : 'Import .xlsx/.json/.xml (Alt+I)'}</span>
        </button>

        <div ref={exportWrapRef} className="relative">
          <button
            type="button"
            disabled={exporting}
            onClick={onToggleExportMenu}
            className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-60 font-medium inline-flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>{exporting ? 'Đang xuất...' : 'Export (Alt+X)'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-rose-100 shadow-xl z-50 py-1.5">
              <button
                type="button"
                onClick={() => onExportFormat?.('xlsx')}
                className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 flex items-center gap-2 text-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => onExportFormat?.('json')}
                className="w-full px-3 py-2 text-left text-xs hover:bg-amber-50 flex items-center gap-2 text-slate-700"
              >
                <FileJson className="w-4 h-4 text-amber-600" />
                <span>Xuất JSON (.json)</span>
              </button>
              <button
                type="button"
                onClick={() => onExportFormat?.('xml')}
                className="w-full px-3 py-2 text-left text-xs hover:bg-rose-50 flex items-center gap-2 text-slate-700"
              >
                <FileCode2 className="w-4 h-4 text-rose-600" />
                <span>Xuất XML (.xml)</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenShortcuts}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold inline-flex items-center gap-1.5 transition"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Phím tắt (Alt+H)
        </button>
      </div>
    </div>
  );
}
