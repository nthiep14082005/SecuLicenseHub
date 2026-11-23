import React, { useState } from 'react';
import { Mail, Send, ShieldCheck } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

/**
 * [Form #7 — Thành viên B] Biểu mẫu Liên hệ Hỗ trợ (Chống Stored XSS).
 */
export default function ContactPage() {
  const [form, setForm] = useState({ fullName: '', email: '', subject: '', message: '' });
  const [notice, setNotice] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/contacts', form);
      setNotice(res.data?.message || 'Đã gửi liên hệ thành công');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Lỗi kết nối API /api/contacts');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white/90 rounded-2xl border border-rose-100/80 p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5">
        <Mail className="w-6 h-6 text-emerald-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Liên hệ &amp; Hỗ trợ Bản quyền</h1>
          <p className="text-xs text-slate-600">Mọi dữ liệu đầu vào được lọc XSS ở middleware trước khi lưu PostgreSQL.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Chủ đề</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung</label>
          <textarea
            rows={4}
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm inline-flex items-center gap-2 transition"
        >
          <Send className="w-4 h-4" /> Gửi yêu cầu hỗ trợ
        </button>
      </form>

      {notice && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">{notice}</div>
      )}

      <div className="p-3 rounded-xl bg-rose-50/40 border border-rose-100 text-xs text-slate-700 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          TODO [Thành viên B]: Khi demo Stored XSS, thử nhập <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> và kiểm tra Admin đọc phản hồi không bị thực thi mã độc.
        </span>
      </div>
    </div>
  );
}
