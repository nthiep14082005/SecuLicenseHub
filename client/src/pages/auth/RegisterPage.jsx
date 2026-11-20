import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserPlus } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

function evaluateStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

/**
 * [Form #2 — Thành viên A] Trang Đăng ký tài khoản kèm bộ đo độ mạnh mật khẩu.
 */
export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const strength = useMemo(() => evaluateStrength(password), [password]);
  const strengthLabel = ['Rất yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/auth/register', { fullName, email, password });
      setStatusMessage(res.data?.message || 'Đăng ký thành công');
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Không thể kết nối Backend API');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">Đăng ký Tài khoản</h1>
          </div>
          <Link to="/" className="text-xs text-sky-600 hover:underline">
            Về Portal
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Minh Quân"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@seculicense.vn"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu (tối thiểu 8 ký tự)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="VD: SecuPass@2026"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <div className="mt-2">
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    strength <= 1 ? 'bg-rose-500' : strength <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(strength / 4) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-600 mt-1">Độ mạnh mật khẩu: {strengthLabel}</div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tạo tài khoản Khách hàng</span>
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
            <li>Gọi <code>POST /api/auth/register</code> (bắt buộc mật khẩu đủ chữ hoa, chữ thường, số).</li>
            <li>Chặn trùng email (HTTP 409) và băm bằng <code>bcryptjs</code> salt &gt;= 10.</li>
          </ul>
        </div>

        <p className="text-xs text-center text-slate-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-sky-600 font-semibold hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
