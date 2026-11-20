import React from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  ['Alt + N', 'Mở form Thêm mới Product'],
  ['Alt + S', 'Lưu biểu mẫu đang mở'],
  ['Alt + E', 'Sửa bản ghi đang chọn'],
  ['Alt + V', 'Xem chi tiết bản ghi'],
  ['Alt + D', 'Xóa 1 hoặc nhiều bản ghi đã tick'],
  ['Alt + C', 'Sao chép 1 hoặc nhiều bản ghi đã tick'],
  ['Alt + I', 'Mở hộp thoại Import (.xlsx / .json / .xml)'],
  ['Alt + X', 'Xuất file Export (.xlsx / .json / .xml)'],
  ['Alt + H', 'Mở / Đóng bảng hướng dẫn phím tắt'],
  ['Esc', 'Đóng modal hiện tại']
];

/**
 * [Thành viên A] Modal hướng dẫn 10 phím tắt CRUD tại trang Quản trị Product.
 */
export default function ShortcutModalStub({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Keyboard className="w-5 h-5 text-sky-600" />
            <span>Bảng Phím tắt CRUD Product (Alt + H / Esc)</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
          {SHORTCUTS.map(([combo, desc]) => (
            <div key={combo} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <kbd className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-mono shrink-0">{combo}</kbd>
              <span className="text-slate-700 text-xs text-right">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
