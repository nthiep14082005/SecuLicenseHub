import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, ShieldCheck, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function evaluateStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

/**
 * [Form #2 — Thành viên A] Trang Đăng ký tài khoản kèm kiểm tra mật khẩu mạnh.
 */
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const strength = useMemo(() => evaluateStrength(password), [password]);
  const strengthLabel = ['Rất yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][strength];

  const passwordRules = useMemo(
    () => [
      { ok: password.length >= 8, label: 'Tối thiểu 8 ký tự' },
      { ok: /[A-Z]/.test(password), label: 'Có ít nhất 1 chữ hoa (A-Z)' },
      { ok: /[a-z]/.test(password), label: 'Có ít nhất 1 chữ thường (a-z)' },
      { ok: /\d/.test(password), label: 'Có ít nhất 1 chữ số (0-9)' }
    ],
    [password]
  );

  const isPasswordStrong = passwordRules.every((r) => r.ok);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 120) {
      setAlert({ type: 'error', message: 'Họ và tên phải từ 2 đến 120 ký tự.' });
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setAlert({ type: 'error', message: 'Địa chỉ email không đúng định dạng.' });
      return;
    }
    if (!isPasswordStrong) {
      setAlert({
        type: 'error',
        message: 'Mật khẩu chưa đạt chuẩn bảo mật (tối thiểu 8 ký tự gồm chữ hoa, chữ thường và số).'
      });
      return;
    }
    if (password !== confirmPassword) {
      setAlert({ type: 'error', message: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await register({ fullName: cleanName, email: cleanEmail, password });
      setAlert({
        type: 'success',
        message: res?.message || 'Đăng ký tài khoản thành công! Đang chuyển đến trang đăng nhập...'
      });
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { authNotice: 'Đăng ký thành công. Bạn có thể đăng nhập ngay bằng tài khoản vừa tạo.' }
        });
      }, 1200);
    } catch (err) {
      const payload = err.response?.data;
      const fieldErrors = Array.isArray(payload?.errors) ? payload.errors : [];
      const detail =
        fieldErrors.length > 0
          ? fieldErrors.map((item) => item.message).join(' · ')
          : payload?.message || 'Không thể kết nối máy chủ đăng ký.';
      setAlert({ type: 'error', message: detail });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-white to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-md border border-rose-100/80 rounded-2xl shadow-xl p-6 space-y-5 text-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">Đăng ký Tài khoản</h1>
              <p className="text-[11px] text-slate-500">Mặc định quyền Khách hàng · Băm mật khẩu Bcrypt</p>
            </div>
          </div>
        </div>

        {alert && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              alert.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            )}
            <span>{alert.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Minh Quân"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@seculicense.vn"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu (tối thiểu 8 ký tự)
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="VD: SecuPass@2026"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="mt-2 space-y-2">
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    strength <= 1 ? 'bg-rose-500' : strength <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(strength / 4) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Độ mạnh mật khẩu: <strong>{strengthLabel}</strong></span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {passwordRules.map((rule) => (
                  <div
                    key={rule.label}
                    className={`flex items-center gap-1 ${
                      rule.ok ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {rule.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-slate-400" />}
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Xác nhận mật khẩu</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản Khách hàng'}</span>
          </button>
        </form>

        <p className="text-xs text-center text-slate-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
