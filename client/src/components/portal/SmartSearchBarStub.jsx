import React from 'react';
import { Search } from 'lucide-react';

/**
 * [Thành viên B] Thanh tìm kiếm tức thời kết nối GET /api/search (Meilisearch).
 */
export default function SmartSearchBarStub({ value, onChange }) {
  return (
    <div className="relative flex-1">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tìm bản quyền không dấu / sai chính tả (Meilisearch)..."
        className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-emerald-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
      />
    </div>
  );
}
