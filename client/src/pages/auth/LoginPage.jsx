import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

/**
 * [Form #1 — Thành viên A] Trang Đăng nhập (HttpOnly Cookie + 2FA TOTP + Lockout)
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/auth/login', { email, password, totpCode });
      setStatusMessage(res.data?.message || 'Đăng nhập thành công');
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Không thể kết nối Backend API');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900">Đăng nhập SecuLicense</h1>
          </div>
          <Link to="/" className="text-xs text-sky-600 hover:underline">
            Về Portal
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@seculicense.vn"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              Mã xác thực 2FA TOTP (nếu Admin đã kích hoạt)
            </label>
            <input
              type="text"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="6 chữ số Google Authenticator"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Đăng nhập An toàn (HttpOnly Cookie)</span>
          </button>
        </form>

        {statusMessage && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            {statusMessage}
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900">TODO [Thành viên A]:</div>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Kết nối <code>POST /api/auth/login</code> lưu JWT vào <code>HttpOnly; SameSite=Strict</code> Cookie.</li>
            <li>Hiển thị cảnh báo khóa tài khoản 15 phút khi sai quá 5 lần (HTTP 423).</li>
            <li>Hỗ trợ bước xác thực 2FA TOTP &amp; chuyển hướng theo role ADMIN / CUSTOMER.</li>
          </ul>
        </div>

        <p className="text-xs text-center text-slate-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-sky-600 font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
