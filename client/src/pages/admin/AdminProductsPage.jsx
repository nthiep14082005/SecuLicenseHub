import React, { useEffect, useState } from 'react';
import ImportExportBarStub from '../../components/admin/ImportExportBarStub';
import OcrUploaderStub from '../../components/admin/OcrUploaderStub';
import ColumnToggleStub, { PRODUCT_COLUMNS } from '../../components/admin/ColumnToggleStub';
import ProductTableStub from '../../components/admin/ProductTableStub';
import ShortcutModalStub from '../../components/admin/ShortcutModalStub';

const STORAGE_KEY = 'seculicense_admin_visible_columns';

/**
 * [Form #8 — Thành viên A] Trang Quản trị Product (11 Chức năng + Phím tắt + AI OCR + Anti-XXE/Formula Inj).
 */
export default function AdminProductsPage() {
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : PRODUCT_COLUMNS;
    } catch {
      return PRODUCT_COLUMNS;
    }
  });

  const handleToggleColumn = (col) => {
    if (col === 'ProductName') return;
    setVisibleColumns((prev) => {
      const next = prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShortcutOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShortcutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản trị Kho Bản quyền (Product — 11 Chức năng)</h1>
          <p className="text-xs text-slate-600">
            Giữ nguyên 10 trường PascalCase bắt buộc · Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">Alt + H</kbd> để xem bảng phím tắt CRUD.
          </p>
        </div>
      </div>

      <ImportExportBarStub onOpenShortcuts={() => setShortcutOpen(true)} />
      <OcrUploaderStub />
      <ColumnToggleStub visibleColumns={visibleColumns} onToggleColumn={handleToggleColumn} />
      <ProductTableStub visibleColumns={visibleColumns} />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
        <div className="font-bold">Checklist TODO [Thành viên A] cho 11 chức năng + Hardening:</div>
        <ul className="list-disc pl-4 grid grid-cols-1 md:grid-cols-2 gap-1">
          <li>Phân trang PostgreSQL (10 / 12 / 15 dòng/trang)</li>
          <li>Thêm / Sửa / Xem chi tiết / Xóa 1 &amp; Xóa nhiều (checkbox)</li>
          <li>Sao chép 1 &amp; Sao chép nhiều trong Transaction</li>
          <li>Import/Export đủ 3 định dạng .xlsx, .json, .xml</li>
          <li>Chống XXE (tắt processEntities + chặn DOCTYPE/ENTITY)</li>
          <li>Chống Excel Formula Injection qua sanitizeExcelCell()</li>
          <li>Upload ảnh kiểm tra Magic Bytes + đổi tên UUID</li>
          <li>Gắn đủ 10 phím tắt Alt+N/S/E/V/D/C/I/X/H &amp; Esc</li>
        </ul>
      </div>

      <ShortcutModalStub open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
    </div>
  );
}
