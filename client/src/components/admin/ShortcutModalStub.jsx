import React from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  ['Alt + N', 'Mở form Thêm mới Product'],
  ['Alt + S', 'Lưu biểu mẫu đang mở (hoạt động cả trong ô nhập)'],
  ['Alt + E', 'Sửa bản ghi đang chọn'],
  ['Alt + V', 'Xem chi tiết bản ghi đang chọn'],
  ['Alt + D', 'Xóa 1 hoặc nhiều bản ghi đã tick'],
  ['Alt + C', 'Sao chép 1 hoặc nhiều bản ghi đã tick'],
  ['Alt + I', 'Mở hộp thoại Import (.xlsx / .json / .xml)'],
  ['Alt + X', 'Mở menu Export (.xlsx / .json / .xml)'],
  ['Alt + H', 'Mở / Đóng bảng hướng dẫn phím tắt'],
  ['Esc', 'Đóng modal / menu hiện tại']
];

/**
 * [Thành viên A] Modal hướng dẫn 10 phím tắt CRUD tại trang Quản trị Product.
 */
export default function ShortcutModalStub({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-rose-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 to-emerald-50/70">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Keyboard className="w-5 h-5 text-emerald-600" />
            <span>Bảng Phím tắt CRUD Product (Alt + H / Esc)</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
            {SHORTCUTS.map(([combo, desc]) => (
              <div
                key={combo}
                className="p-2.5 rounded-lg bg-rose-50/40 border border-rose-100 flex items-center justify-between gap-2"
              >
                <kbd className="px-2 py-0.5 rounded bg-emerald-700 text-white text-xs font-mono shrink-0">
                  {combo}
                </kbd>
                <span className="text-slate-700 text-xs text-right">{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 bg-amber-50/70 border border-amber-200 rounded-lg px-3 py-2">
            Lưu ý: Khi con trỏ đang nhập liệu trong ô <code>input</code>, <code>textarea</code> hoặc{' '}
            <code>select</code>, các phím tắt điều hướng được tạm bỏ qua; chỉ giữ{' '}
            <strong>Alt + S</strong> và <strong>Esc</strong> để tránh xung đột.
          </p>
        </div>
      </div>
    </div>
  );
}
