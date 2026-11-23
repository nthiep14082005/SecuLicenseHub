import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LogOut,
  PackageCheck,
  QrCode,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * [Thành viên A] Layout Khu vực Quản trị Bảo mật & Kho Tài nguyên Số (AdminLayout)
 */
export default function AdminLayout() {
  const { user, setup2fa, verify2fa, logout } = useAuth();
  const navigate = useNavigate();

  const [twoFaModalOpen, setTwoFaModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [totpInput, setTotpInput] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaMessage, setTwoFaMessage] = useState(null);

  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive
        ? 'bg-sky-600 text-white shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  const handleOpen2faModal = async () => {
    setTwoFaModalOpen(true);
    setTwoFaMessage(null);
    setTotpInput('');
    setTwoFaLoading(true);
    try {
      const data = await setup2fa();
      setQrData(data);
    } catch (err) {
      setTwoFaMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không thể khởi tạo mã QR 2FA.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    setTwoFaMessage(null);
    setTwoFaLoading(true);
    try {
      const res = await verify2fa(totpInput);
      setTwoFaMessage({
        type: 'success',
        text: res?.message || 'Kích hoạt xác thực 2 bước (2FA) thành công!'
      });
      setTotpInput('');
    } catch (err) {
      setTwoFaMessage({
        type: 'error',
        text: err.response?.data?.message || 'Mã xác thực 6 số không hợp lệ.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-slate-950 text-white flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="font-bold text-sm">SecuLicense Admin</div>
              <div className="text-[11px] text-slate-400">Quản trị &amp; Bảo mật Hệ thống</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/admin/products" className={navClass}>
            <PackageCheck className="w-4 h-4" />
            <span>Quản trị Product (11 CN)</span>
          </NavLink>
          <NavLink to="/admin/orders" className={navClass}>
            <ReceiptText className="w-4 h-4" />
            <span>Hóa đơn &amp; HMAC</span>
          </NavLink>
          <NavLink to="/admin/security" className={navClass}>
            <ShieldAlert className="w-4 h-4" />
            <span>Audit Logs &amp; AI Security</span>
          </NavLink>
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2 text-xs">
          <a
            href="http://localhost:5000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300"
          >
            <span>Swagger UI (/docs)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Portal Khách hàng</span>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Bảng Điều khiển Quản trị &amp; Giám sát An toàn Hệ thống
            </div>
            {user && (
              <div className="text-xs text-slate-500">
                Xin chào <strong className="text-slate-700">{user.fullName}</strong> ({user.email})
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 ${
                user?.is2faEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {user?.is2faEnabled ? '2FA TOTP: Đã bật' : '2FA TOTP: Chưa bật'}
            </span>

            <button
              type="button"
              onClick={handleOpen2faModal}
              className="px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{user?.is2faEnabled ? 'Đổi mã 2FA' : 'Cài đặt 2FA TOTP'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>

      {/* Modal Cài đặt 2FA TOTP (QR Code + Xác nhận 6 số) */}
      {twoFaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <KeyRound className="w-5 h-5 text-sky-600" />
                <span>Cài đặt Xác thực 2 bước (2FA TOTP)</span>
              </div>
              <button
                type="button"
                onClick={() => setTwoFaModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {twoFaLoading && !qrData ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Đang tạo mã bí mật TOTP &amp; QR Code...
                </div>
              ) : (
                qrData && (
                  <div className="space-y-3 text-center">
                    <p className="text-xs text-slate-600">
                      Quét mã QR bằng <strong>Google Authenticator</strong> hoặc nhập khóa bí mật thủ công:
                    </p>
                    <div className="flex justify-center">
                      <img
                        src={qrData.qrDataUrl}
                        alt="QR Code 2FA TOTP"
                        className="w-44 h-44 border border-slate-200 rounded-xl p-2 bg-white"
                      />
                    </div>
                    <div className="p-2 rounded-lg bg-slate-100 text-[11px] font-mono text-slate-800 break-all">
                      Secret: {qrData.secret}
                    </div>
                  </div>
                )
              )}

              {twoFaMessage && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    twoFaMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {twoFaMessage.type === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{twoFaMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleVerify2fa} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhập mã OTP 6 chữ số để kích hoạt
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-center text-base font-mono tracking-[0.35em]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTwoFaModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={twoFaLoading || !qrData}
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-semibold"
                  >
                    {twoFaLoading ? 'Đang xác nhận...' : 'Xác nhận kích hoạt 2FA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
