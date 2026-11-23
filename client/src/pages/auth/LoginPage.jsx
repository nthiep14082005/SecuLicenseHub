import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CHALLENGE_STORAGE_KEY, useAuth } from '../../context/AuthContext';

/**
 * [Form #1 — Thành viên A] Trang Đăng nhập (HttpOnly Session Cookie + 2FA Challenge + Lockout)
 */
export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setSubmitting(true);

    try {
      const res = await login({ email: email.trim(), password });
      const data = res?.data;

      if (data?.requires2fa) {
        try {
          sessionStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(data));
        } catch {
          // ignore
        }
        navigate('/verify-2fa', { replace: true, state: { challenge: data } });
        return;
      }

      setAlert({
        type: 'success',
        message: res?.message || 'Đăng nhập thành công'
      });
      navigate('/', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const payload = err.response?.data;

      if (status === 423) {
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
    error: 'bg-red-50 border-red-200 text-red-700',
    locked: 'bg-rose-100 border-rose-300 text-rose-950 font-medium'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-white to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-md border border-rose-100/80 rounded-2xl shadow-xl p-6 space-y-5 text-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">Đăng nhập SecuLicense</h1>
              <p className="text-[11px] text-slate-500">HttpOnly Session Cookie · Bảo vệ Brute-force &amp; 2FA</p>
            </div>
          </div>
          {user && (
            <Link to="/" className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold hover:underline">
              Về Portal
            </Link>
          )}
        </div>

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
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Đang xác thực...' : 'Đăng nhập An toàn'}</span>
          </button>
        </form>

        <p className="text-xs text-center text-slate-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
