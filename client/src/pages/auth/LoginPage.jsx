import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, KeyRound, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * [Form #1 — Thành viên A] Trang Đăng nhập (HttpOnly Cookie + 2FA TOTP + Lockout)
 */
export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(() => {
    const notice = location.state?.authNotice;
    return notice ? { type: 'warning', message: notice } : null;
  });

  useEffect(() => {
    if (location.state?.authNotice) {
      setAlert({ type: 'warning', message: location.state.authNotice });
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (requires2fa && !/^\d{6}$/.test(totpCode.trim())) {
      setAlert({
        type: 'warning',
        message: 'Vui lòng nhập đầy đủ mã xác thực 2FA TOTP gồm đúng 6 chữ số.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password, totpCode });
      const loggedUser = res?.data?.user;
      setAlert({
        type: 'success',
        message: res?.message || 'Đăng nhập thành công'
      });

      const targetRoute =
        loggedUser?.role === 'ADMIN'
          ? location.state?.from && location.state.from.startsWith('/admin')
            ? location.state.from
            : '/admin/products'
          : '/';

      navigate(targetRoute, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const payload = err.response?.data;

      if (payload?.requires2fa) {
        setRequires2fa(true);
        setAlert({
          type: 'warning',
          message:
            payload.message ||
            'Tài khoản đã bật 2FA. Vui lòng nhập mã xác thực 6 số từ Google Authenticator.'
        });
      } else if (status === 423) {
        setAlert({
          type: 'locked',
          message:
            payload?.message ||
            'Tài khoản đang bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp.'
        });
      } else if (status === 429) {
        setAlert({
          type: 'locked',
          message:
            payload?.message ||
            'Quá nhiều yêu cầu đăng nhập từ IP này. Vui lòng đợi ít phút trước khi thử lại.'
        });
      } else {
        setAlert({
          type: 'error',
          message:
            payload?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra kết nối và thông tin tài khoản.'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const alertStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-rose-50 border-rose-200 text-rose-900',
    locked: 'bg-rose-100 border-rose-300 text-rose-950 font-medium'
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Đăng nhập SecuLicense</h1>
              <p className="text-[11px] text-slate-500">HttpOnly Cookie Session · Bảo vệ Brute-force &amp; 2FA</p>
            </div>
          </div>
          <Link to="/" className="text-xs text-sky-600 font-medium hover:underline">
            Về Portal
          </Link>
        </div>

        {user && (
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center justify-between gap-2">
            <span>
              Đang đăng nhập: <strong>{user.email}</strong> ({user.role})
            </span>
            <Link
              to={user.role === 'ADMIN' ? '/admin/products' : '/'}
              className="px-2.5 py-1 rounded bg-sky-600 text-white font-semibold shrink-0"
            >
              Vào trang chính
            </Link>
          </div>
        )}

        {alert && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              alertStyles[alert.type] || alertStyles.error
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : alert.type === 'locked' ? (
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{alert.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@seculicense.vn"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {requires2fa ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
              <label className="block text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Bước 2: Nhập mã xác thực 2FA TOTP (6 chữ số)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-center text-base tracking-[0.35em] font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-amber-800">
                Mở Google Authenticator / Authy để lấy mã 6 số hiện tại.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setRequires2fa(true)}
                className="text-xs text-slate-600 hover:text-sky-600 inline-flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Tài khoản đã bật 2FA? Nhập mã TOTP</span>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Đang xác thực...' : requires2fa ? 'Xác thực 2FA & Đăng nhập' : 'Đăng nhập An toàn'}</span>
          </button>
        </form>

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
