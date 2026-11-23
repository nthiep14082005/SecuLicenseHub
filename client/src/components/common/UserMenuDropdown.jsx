import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  QrCode,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
  X
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getAdminBasePath } from '../../utils/adminRoute.util';

const PREFS_KEY_PREFIX = 'seculicense_user_prefs_';

function loadUserPrefs(userId) {
  if (!userId) return { phone: '', address: '', telegram2faEnabled: false, email2faEnabled: false };
  try {
    const raw = localStorage.getItem(`${PREFS_KEY_PREFIX}${userId}`);
    if (!raw) return { phone: '', address: '', telegram2faEnabled: false, email2faEnabled: false };
    const parsed = JSON.parse(raw);
    return {
      phone: parsed.phone || '',
      address: parsed.address || '',
      telegram2faEnabled: Boolean(
        parsed.telegram2faEnabled ?? parsed.whatsapp2faEnabled ?? parsed.sms2faEnabled
      ),
      email2faEnabled: Boolean(parsed.email2faEnabled)
    };
  } catch {
    return { phone: '', address: '', telegram2faEnabled: false, email2faEnabled: false };
  }
}

function saveUserPrefs(userId, nextPrefs) {
  if (!userId) return;
  try {
    localStorage.setItem(`${PREFS_KEY_PREFIX}${userId}`, JSON.stringify(nextPrefs));
  } catch {
    // Bỏ qua lỗi quota localStorage
  }
}

function getInitials(fullName, email) {
  const source = (fullName || email || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * [Thành viên A] Dropdown Menu tài khoản kiểu Facebook (tái sử dụng cho PortalLayout & AdminLayout).
 * Toàn bộ Modal được render qua createPortal(..., document.body) để luôn cân giữa màn hình.
 */
export default function UserMenuDropdown({ variant = 'light' }) {
  const {
    user,
    setup2fa,
    verify2fa,
    updateProfile,
    updateEmail,
    sendEmail2faOtp,
    verifyEmail2faOtp,
    sendTelegram2faOtp,
    verifyTelegram2faOtp,
    disable2faMethod,
    logout
  } = useAuth();
  const { totalCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => loadUserPrefs(user?.userId));

  // Modal Cài đặt tài khoản hợp nhất (Tên + SĐT + Địa chỉ)
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState(null);

  // Modal Thêm / Thay đổi Gmail (unique)
  const [gmailModalOpen, setGmailModalOpen] = useState(false);
  const [newGmailInput, setNewGmailInput] = useState('');
  const [gmailSaving, setGmailSaving] = useState(false);
  const [gmailFeedback, setGmailFeedback] = useState(null);

  // Modal Bật xác thực 2 lớp (3 phương thức cho Gmail)
  const [twoFaModalOpen, setTwoFaModalOpen] = useState(false);
  const [twoFaMethod, setTwoFaMethod] = useState('totp');
  const [totpQrData, setTotpQrData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgPreviewOtp, setTgPreviewOtp] = useState('');
  const [tgCodeInput, setTgCodeInput] = useState('');
  const [emailTargetInput, setEmailTargetInput] = useState('');
  const [emailPreviewOtp, setEmailPreviewOtp] = useState('');
  const [emailCodeInput, setEmailCodeInput] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaFeedback, setTwoFaFeedback] = useState(null);

  // Modal Gửi báo cáo lỗi cho Admin
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugLoading, setBugLoading] = useState(false);
  const [bugFeedback, setBugFeedback] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    setPrefs(loadUserPrefs(user?.userId));
  }, [user?.userId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setAccountModalOpen(false);
        setGmailModalOpen(false);
        setTwoFaModalOpen(false);
        setBugModalOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isInAdmin = location.pathname.startsWith('/admin');
  const isGmail = Boolean(user.email && user.email.toLowerCase().endsWith('@gmail.com'));
  const methods = user.twoFactorMethods || {};
  const enabledMethodsCount = [methods.totp, methods.gmail, methods.telegram].filter(Boolean).length;
  const hasAny2fa = Boolean(
    user.hasAny2FA || user.is2faEnabled || methods.totp || methods.gmail || methods.telegram
  );
  const initials = getInitials(user.fullName, user.email);

  const openGmailModal = () => {
    setMenuOpen(false);
    setGmailFeedback(null);
    setNewGmailInput(isGmail ? user.email || '' : '');
    setGmailModalOpen(true);
  };

  const handleSaveGmail = async (e) => {
    e.preventDefault();
    setGmailFeedback(null);
    const cleanGmail = newGmailInput.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanGmail) || !cleanGmail.endsWith('@gmail.com')) {
      setGmailFeedback({
        type: 'error',
        message: 'Vui lòng nhập địa chỉ Gmail hợp lệ kết thúc bằng @gmail.com.'
      });
      return;
    }

    setGmailSaving(true);
    try {
      const { response, newAdminBasePath } = await updateEmail(cleanGmail);
      setGmailFeedback({
        type: 'success',
        message: response?.message || 'Cập nhật địa chỉ Gmail thành công!'
      });

      if (isInAdmin && newAdminBasePath) {
        const segments = location.pathname.split('/').filter(Boolean);
        const currentTab = segments[3] || 'products';
        navigate(`${newAdminBasePath}/${currentTab}`, { replace: true });
      }
    } catch (err) {
      setGmailFeedback({
        type: 'error',
        message:
          err.response?.data?.message ||
          'Không thể cập nhật Gmail (có thể Gmail này đã được sử dụng).'
      });
    } finally {
      setGmailSaving(false);
    }
  };

  const openAccountSettings = () => {
    setMenuOpen(false);
    setAccountFeedback(null);
    setNameInput(user.fullName || '');
    setPhoneInput(prefs.phone || '');
    setAddressInput(prefs.address || '');
    setAccountModalOpen(true);
  };

  const handleSaveAccountSettings = async (e) => {
    e.preventDefault();
    setAccountFeedback(null);

    const cleanName = nameInput.trim();
    const cleanPhone = phoneInput.trim();
    const cleanAddress = addressInput.trim();

    if (cleanName.length < 2 || cleanName.length > 120) {
      setAccountFeedback({ type: 'error', message: 'Họ và tên phải từ 2 đến 120 ký tự.' });
      return;
    }
    if (cleanPhone && !/^[0-9+\-\s()]{8,16}$/.test(cleanPhone)) {
      setAccountFeedback({ type: 'error', message: 'Số điện thoại không hợp lệ.' });
      return;
    }

    setAccountSaving(true);
    try {
      if (cleanName !== (user.fullName || '')) {
        await updateProfile(cleanName);
      }

      const nextPrefs = {
        ...prefs,
        phone: cleanPhone,
        address: cleanAddress
      };
      saveUserPrefs(user.userId, nextPrefs);
      setPrefs(nextPrefs);

      setAccountFeedback({
        type: 'success',
        message: 'Đã cập nhật Họ tên (PostgreSQL) và SĐT / Địa chỉ thành công!'
      });
    } catch (err) {
      setAccountFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Không thể cập nhật thông tin tài khoản.'
      });
    } finally {
      setAccountSaving(false);
    }
  };

  const initTotpQr = async () => {
    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    try {
      const data = await setup2fa();
      setTotpQrData(data);
    } catch (err) {
      setTwoFaFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Không thể khởi tạo mã QR Google Authenticator.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const openTwoFaModal = async () => {
    setMenuOpen(false);
    setTwoFaFeedback(null);
    setTotpCode('');
    setTgCodeInput('');
    setTgPreviewOtp('');
    setEmailTargetInput(user.gmailAddress || user.email || '');
    setEmailCodeInput('');
    setEmailPreviewOtp('');
    setTgChatId(user.telegramChatId || '');
    setTwoFaModalOpen(true);

    if (twoFaMethod === 'totp' && !totpQrData) {
      await initTotpQr();
    }
  };

  const handleSwitchTwoFaMethod = async (method) => {
    setTwoFaMethod(method);
    setTwoFaFeedback(null);
    if (method === 'totp' && !totpQrData) {
      await initTotpQr();
    }
  };

  const handleVerifyTotp = async (e) => {
    e.preventDefault();
    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    try {
      const res = await verify2fa(totpCode);
      setTwoFaFeedback({
        type: 'success',
        message: res?.message || 'Đã bật Google Authenticator 2FA thành công!'
      });
      setTotpCode('');
    } catch (err) {
      setTwoFaFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Mã 6 số Google Authenticator không đúng.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleSendTelegramOtp = async () => {
    const cleanChatId = tgChatId.trim();
    if (!/^-?\d{5,20}$/.test(cleanChatId)) {
      setTwoFaFeedback({
        type: 'error',
        message: 'Vui lòng nhập Telegram Chat ID hợp lệ (VD: 5123456789) trước khi gửi mã.'
      });
      return;
    }

    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    setTgPreviewOtp('');
    try {
      const res = await sendTelegram2faOtp(cleanChatId);
      const data = res?.data;

      if (data?.deliveryMode === 'telegram') {
        setTwoFaFeedback({
          type: 'success',
          message:
            res?.message ||
            `Đã gửi mã OTP 6 số qua Telegram tới Chat ID ${data.sentTo} (hiệu lực 5 phút).`
        });
      } else {
        setTgPreviewOtp(data?.previewOtp || '');
        setTwoFaFeedback({
          type: 'info',
          message:
            data?.fallbackReason ||
            res?.message ||
            'Chưa cấu hình TELEGRAM_BOT_TOKEN — đang dùng mã test.'
        });
      }
    } catch (err) {
      setTwoFaFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Không thể gửi mã OTP qua Telegram.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerifyTelegramOtp = async (e) => {
    e.preventDefault();
    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    try {
      const res = await verifyTelegram2faOtp(tgCodeInput, tgChatId.trim());
      const nextPrefs = { ...prefs, telegram2faEnabled: true };
      saveUserPrefs(user.userId, nextPrefs);
      setPrefs(nextPrefs);
      setTgCodeInput('');
      setTgPreviewOtp('');
      setTwoFaFeedback({
        type: 'success',
        message: res?.message || 'Đã kích hoạt xác thực 2 lớp qua Telegram!'
      });
    } catch (err) {
      setTwoFaFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Mã OTP Telegram không chính xác hoặc đã hết hạn.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const cleanTarget = emailTargetInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTarget) || !cleanTarget.endsWith('@gmail.com')) {
      setTwoFaFeedback({
        type: 'error',
        message: 'Vui lòng nhập địa chỉ Gmail hợp lệ (kết thúc bằng @gmail.com) trước khi gửi mã.'
      });
      return;
    }

    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    setEmailPreviewOtp('');
    try {
      const res = await sendEmail2faOtp(cleanTarget);
      const data = res?.data;

      if (data?.deliveryMode === 'smtp') {
        setTwoFaFeedback({
          type: 'success',
          message:
            res?.message ||
            `Đã gửi mã OTP 6 số tới Gmail ${data.sentTo}. Vui lòng kiểm tra hộp thư đến!`
        });
      } else {
        setEmailPreviewOtp(data?.previewOtp || '');
        setTwoFaFeedback({
          type: 'info',
          message:
            data?.fallbackReason ||
            res?.message ||
            'Chưa cấu hình SMTP_USER / SMTP_PASS trong .env — đang dùng mã test.'
        });
      }
    } catch (err) {
      setTwoFaFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Không thể gửi mã OTP qua Gmail.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    const cleanTarget = emailTargetInput.trim().toLowerCase();
    try {
      const res = await verifyEmail2faOtp(emailCodeInput, cleanTarget);
      const nextPrefs = { ...prefs, email2faEnabled: true };
      saveUserPrefs(user.userId, nextPrefs);
      setPrefs(nextPrefs);
      setEmailCodeInput('');
      setEmailPreviewOtp('');
      setTwoFaFeedback({
        type: 'success',
        message: res?.message || 'Đã kích hoạt xác thực 2 lớp qua Gmail!'
      });
    } catch (err) {
      setTwoFaFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Mã OTP Gmail không chính xác hoặc đã hết hạn.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisableTwoFaMethod = async (method) => {
    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    try {
      const res = await disable2faMethod(method);
      if (method === 'telegram') {
        const nextPrefs = { ...prefs, telegram2faEnabled: false };
        saveUserPrefs(user.userId, nextPrefs);
        setPrefs(nextPrefs);
        setTgChatId('');
        setTgPreviewOtp('');
        setTgCodeInput('');
      } else if (method === 'gmail') {
        const nextPrefs = { ...prefs, email2faEnabled: false };
        saveUserPrefs(user.userId, nextPrefs);
        setPrefs(nextPrefs);
        setEmailTargetInput(user.email || '');
        setEmailPreviewOtp('');
        setEmailCodeInput('');
      } else if (method === 'totp') {
        setTotpQrData(null);
        setTotpCode('');
      }
      setTwoFaFeedback({
        type: 'success',
        message: res?.message || 'Đã tắt phương thức xác thực 2 lớp thành công!'
      });
    } catch (err) {
      setTwoFaFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Không thể tắt phương thức xác thực 2 lớp.'
      });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleSubmitBugReport = async (e) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDesc.trim()) {
      setBugFeedback({ type: 'error', message: 'Vui lòng nhập đầy đủ tiêu đề và mô tả lỗi.' });
      return;
    }
    setBugLoading(true);
    setBugFeedback(null);
    try {
      const res = await axiosClient.post('/contacts', {
        fullName: user.fullName,
        email: user.email,
        subject: `[Báo lỗi] ${bugTitle.trim()}`,
        message: bugDesc.trim()
      });
      setBugFeedback({
        type: 'success',
        message: res.data?.message || 'Đã gửi báo cáo lỗi cho Quản trị viên thành công!'
      });
      setBugTitle('');
      setBugDesc('');
    } catch (err) {
      if (err.response?.status === 501) {
        setBugFeedback({
          type: 'info',
          message:
            'Đã ghi nhận nội dung báo lỗi! API /api/contacts đang được Thành viên B hoàn thiện — bạn có thể chuyển sang trang Liên hệ để theo dõi.'
        });
      } else {
        setBugFeedback({
          type: 'error',
          message: err.response?.data?.message || 'Không thể gửi báo cáo lỗi lúc này.'
        });
      }
    } finally {
      setBugLoading(false);
    }
  };

  const handleNavigate = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  const triggerClass =
    variant === 'dark'
      ? 'ml-1 inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-medium transition'
      : 'inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-rose-50/80 hover:bg-emerald-50 text-slate-800 border border-rose-200 text-xs font-medium transition';

  const menuRowClass =
    'w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl hover:bg-rose-50/70 transition text-left group';

  const iconCircleClass =
    'w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition';

  const portalModals = (
    <>
      {/* Modal Cài đặt tài khoản hợp nhất */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-rose-100 text-slate-800">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 to-emerald-50/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Settings className="w-5 h-5 text-emerald-600" />
                <span>Cài đặt Tài khoản</span>
              </div>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountSettings} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-50/60 to-emerald-50/60 border border-rose-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{user.email}</div>
                    <div className="text-[11px] text-slate-500">
                      Vai trò: <strong className="text-emerald-700">{user.role}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {accountFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    accountFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {accountFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{accountFeedback.message}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-emerald-700 font-normal">(Lưu PostgreSQL)</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Số điện thoại <span className="text-slate-500 font-normal">(Lưu localStorage)</span>
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa chỉ <span className="text-slate-500 font-normal">(Lưu localStorage)</span>
                </label>
                <textarea
                  rows={2}
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Nhập địa chỉ nhận thông tin / hóa đơn..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-rose-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={accountSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                >
                  {accountSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bật xác thực 2 lớp (3 phương thức cho Gmail) */}
      {twoFaModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-rose-100 text-slate-800">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 to-emerald-50/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Xác thực 2 lớp (2FA) — Tài khoản Gmail</span>
              </div>
              <button
                type="button"
                onClick={() => setTwoFaModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Tab chọn phương thức */}
            <div className="px-5 pt-3 pb-3 border-b border-rose-100 grid grid-cols-3 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleSwitchTwoFaMethod('totp')}
                className={`p-2 rounded-xl border font-semibold flex flex-col items-center gap-1 transition ${
                  twoFaMethod === 'totp'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Google Auth</span>
                {methods.totp && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      twoFaMethod === 'totp'
                        ? 'bg-white/25 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Đã bật
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTwoFaMethod('telegram')}
                className={`p-2 rounded-xl border font-semibold flex flex-col items-center gap-1 transition ${
                  twoFaMethod === 'telegram'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>OTP qua Telegram</span>
                {methods.telegram && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      twoFaMethod === 'telegram'
                        ? 'bg-white/25 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Đã bật
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTwoFaMethod('email')}
                className={`p-2 rounded-xl border font-semibold flex flex-col items-center gap-1 transition ${
                  twoFaMethod === 'email'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>OTP qua Gmail</span>
                {methods.gmail && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      twoFaMethod === 'email'
                        ? 'bg-white/25 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Đã bật
                  </span>
                )}
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {twoFaFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    twoFaFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : twoFaFeedback.type === 'info'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {twoFaFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{twoFaFeedback.message}</span>
                </div>
              )}

              {/* Phương thức 1: Google Authenticator */}
              {twoFaMethod === 'totp' && (
                <form onSubmit={handleVerifyTotp} className="space-y-3">
                  {methods.totp && (
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-700">
                        <span className="font-semibold text-emerald-700">
                          Google Authenticator đang bật.
                        </span>
                        {enabledMethodsCount <= 1 && (
                          <div className="text-rose-700 mt-0.5">
                            Phải giữ lại ít nhất 1 phương thức xác thực 2 lớp.
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={twoFaLoading || enabledMethodsCount <= 1}
                        onClick={() => handleDisableTwoFaMethod('totp')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold shrink-0"
                      >
                        Xóa / Tắt phương thức này
                      </button>
                    </div>
                  )}

                  {twoFaLoading && !totpQrData ? (
                    <div className="py-6 text-center text-slate-500">
                      Đang tạo mã QR Google Authenticator...
                    </div>
                  ) : totpQrData ? (
                    <div className="text-center space-y-2">
                      <p className="text-slate-600">
                        Quét mã QR bằng <strong>Google Authenticator</strong> hoặc nhập khóa bí mật:
                      </p>
                      <div className="flex justify-center">
                        <img
                          src={totpQrData.qrDataUrl}
                          alt="QR 2FA TOTP"
                          className="w-40 h-40 border border-emerald-200 rounded-xl p-1.5 bg-white"
                        />
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100 font-mono text-[11px] break-all">
                        Secret: {totpQrData.secret}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <button
                        type="button"
                        disabled={twoFaLoading}
                        onClick={initTotpQr}
                        className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-60"
                      >
                        Tạo mã QR Google Authenticator
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nhập mã 6 chữ số từ ứng dụng Authenticator
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-center text-base font-mono tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setTwoFaModalOpen(false)}
                      className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={twoFaLoading || !totpQrData}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                    >
                      Kích hoạt Authenticator
                    </button>
                  </div>
                </form>
              )}

              {/* Phương thức 2: OTP qua Telegram Bot */}
              {twoFaMethod === 'telegram' && (
                <form onSubmit={handleVerifyTelegramOtp} className="space-y-3">
                  {methods.telegram && (
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-700">
                        <span className="font-semibold text-emerald-700">
                          OTP qua Telegram đang bật
                          {user.telegramChatId ? ` (Chat ID: ${user.telegramChatId})` : ''}.
                        </span>
                        {enabledMethodsCount <= 1 && (
                          <div className="text-rose-700 mt-0.5">
                            Phải giữ lại ít nhất 1 phương thức xác thực 2 lớp.
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={twoFaLoading || enabledMethodsCount <= 1}
                        onClick={() => handleDisableTwoFaMethod('telegram')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold shrink-0"
                      >
                        Xóa / Tắt phương thức này
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Telegram Chat ID nhận mã OTP
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={tgChatId}
                        onChange={(e) => setTgChatId(e.target.value)}
                        placeholder="Nhập Telegram Chat ID (VD: 5123456789)"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        disabled={twoFaLoading}
                        onClick={handleSendTelegramOtp}
                        className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold shrink-0 disabled:opacity-60"
                      >
                        Gửi mã qua Telegram
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-600">
                      Mở{' '}
                      <a
                        href="https://t.me/seculicense_otp_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-emerald-700 underline hover:text-emerald-800"
                      >
                        @seculicense_otp_bot
                      </a>{' '}
                      bấm <strong>Start</strong>, sau đó lấy ID từ <strong>@userinfobot</strong>.
                    </p>
                  </div>

                  {tgPreviewOtp && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono text-center">
                      Mã OTP Telegram Test: <strong>{tgPreviewOtp}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nhập mã OTP 6 chữ số từ Telegram
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={tgCodeInput}
                      onChange={(e) => setTgCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-center text-base font-mono tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setTwoFaModalOpen(false)}
                      className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={twoFaLoading}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                    >
                      Xác nhận bật Telegram 2FA
                    </button>
                  </div>
                </form>
              )}

              {/* Phương thức 3: Email OTP (Gmail) */}
              {twoFaMethod === 'email' && (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
                  {methods.gmail && (
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-700">
                        <span className="font-semibold text-emerald-700">
                          OTP qua Gmail đang bật{user.gmailAddress ? ` (${user.gmailAddress})` : ''}.
                        </span>
                        {enabledMethodsCount <= 1 && (
                          <div className="text-rose-700 mt-0.5">
                            Phải giữ lại ít nhất 1 phương thức xác thực 2 lớp.
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={twoFaLoading || enabledMethodsCount <= 1}
                        onClick={() => handleDisableTwoFaMethod('gmail')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold shrink-0"
                      >
                        Xóa / Tắt phương thức này
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Địa chỉ Gmail nhận OTP (nhập bất kỳ Gmail hợp lệ)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={emailTargetInput}
                        onChange={(e) => setEmailTargetInput(e.target.value)}
                        placeholder="Nhập địa chỉ Gmail nhận OTP (VD: tenban@gmail.com)"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        disabled={twoFaLoading}
                        onClick={handleSendEmailOtp}
                        className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold shrink-0 disabled:opacity-60"
                      >
                        Gửi mã qua Gmail
                      </button>
                    </div>
                  </div>

                  {emailPreviewOtp && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono text-center">
                      Mã OTP Dev Preview (chưa bật SMTP): <strong>{emailPreviewOtp}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nhập mã OTP 6 chữ số từ Gmail
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={emailCodeInput}
                      onChange={(e) =>
                        setEmailCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="000000"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-center text-base font-mono tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setTwoFaModalOpen(false)}
                      className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={twoFaLoading}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                    >
                      Xác nhận bật Gmail 2FA
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Gửi báo cáo lỗi cho Admin */}
      {bugModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-rose-100 text-slate-800">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 to-emerald-50/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Bug className="w-5 h-5 text-amber-600" />
                <span>Gửi Báo cáo Lỗi cho Admin</span>
              </div>
              <button
                type="button"
                onClick={() => setBugModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBugReport} className="p-5 space-y-3 text-xs">
              {bugFeedback && (
                <div
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    bugFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : bugFeedback.type === 'info'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <div>{bugFeedback.message}</div>
                  {bugFeedback.type === 'info' && (
                    <button
                      type="button"
                      onClick={() => {
                        setBugModalOpen(false);
                        navigate('/contact');
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold underline"
                    >
                      Chuyển sang trang Liên hệ →
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề lỗi *</label>
                <input
                  type="text"
                  required
                  value={bugTitle}
                  onChange={(e) => setBugTitle(e.target.value)}
                  placeholder="VD: Không tải được file khi..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả chi tiết *</label>
                <textarea
                  rows={4}
                  required
                  value={bugDesc}
                  onChange={(e) => setBugDesc(e.target.value)}
                  placeholder="Mô tả các bước tái hiện lỗi..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBugModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={bugLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{bugLoading ? 'Đang gửi...' : 'Gửi báo cáo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Thêm / Thay đổi Gmail (unique) */}
      {gmailModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-rose-100 text-slate-800">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 to-emerald-50/80">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Mail className="w-5 h-5 text-emerald-600" />
                <span>{isGmail ? 'Thay đổi Địa chỉ Gmail' : 'Thêm Địa chỉ Gmail'}</span>
              </div>
              <button
                type="button"
                onClick={() => setGmailModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGmail} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 text-slate-700">
                Email hiện tại: <strong className="text-slate-900">{user.email}</strong>
              </div>

              {gmailFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    gmailFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {gmailFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{gmailFeedback.message}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa chỉ Gmail mới (duy nhất trên hệ thống) *
                </label>
                <input
                  type="email"
                  required
                  value={newGmailInput}
                  onChange={(e) => setNewGmailInput(e.target.value)}
                  placeholder="tenmoi@gmail.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Sau khi cập nhật, hệ thống tự động cấp lại Session Cookie (và đường dẫn Admin động nếu là Quản trị viên).
                </p>
              </div>

              <div className="pt-2 border-t border-rose-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGmailModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={gmailSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                >
                  {gmailSaving ? 'Đang cập nhật...' : 'Lưu Gmail mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Nút kích hoạt Dropdown trên Header */}
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={triggerClass}
      >
        <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
          {initials}
        </span>
        <span className="max-w-[130px] truncate">{user.fullName}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popup kiểu Facebook gọn gàng */}
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2.5 w-80 sm:w-[340px] rounded-2xl bg-white border border-rose-100 shadow-2xl overflow-hidden text-slate-800 z-50"
        >
          {/* Khối Card thông tin người dùng */}
          <div className="p-3.5 bg-gradient-to-br from-rose-50/90 via-white to-emerald-50/90 border-b border-rose-100/80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-slate-900 truncate">{user.fullName}</div>
                <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isAdmin
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {isAdmin ? 'Quản trị viên' : 'Khách hàng'}
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  handleNavigate(isInAdmin ? '/' : `${getAdminBasePath(user.email)}/products`)
                }
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
              >
                {isInAdmin ? (
                  <>
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Về trang Cửa hàng (Portal)</span>
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Vào trang Quản trị (Admin)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Danh sách chức năng gọn gàng */}
          <div className="p-2 max-h-[70vh] overflow-y-auto space-y-0.5 text-xs">
            {isGmail && (
              <button
                type="button"
                onClick={openTwoFaModal}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/80 mb-1.5 text-left transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                      Bật xác thực 2 lớp (2FA)
                    </div>
                    <div className="text-[10px] text-amber-800">
                      Authenticator · Telegram · Gmail OTP
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      hasAny2fa
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {hasAny2fa ? 'Đã bật' : 'Chưa bật'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            )}

            <button type="button" onClick={openAccountSettings} className={menuRowClass}>
              <span className="flex items-center gap-2.5 font-medium text-slate-700">
                <span className={iconCircleClass}>
                  <Settings className="w-4 h-4" />
                </span>
                <span>Cài đặt tài khoản</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button type="button" onClick={openGmailModal} className={menuRowClass}>
              <span className="flex items-center gap-2.5 font-medium text-slate-700">
                <span className={iconCircleClass}>
                  <Mail className="w-4 h-4" />
                </span>
                <span>{isGmail ? 'Thay đổi Gmail' : 'Thêm Gmail'}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button type="button" onClick={() => handleNavigate('/vault')} className={menuRowClass}>
              <span className="flex items-center gap-2.5 font-medium text-slate-700">
                <span className={iconCircleClass}>
                  <KeyRound className="w-4 h-4" />
                </span>
                <span>Đơn hàng / Kho License</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/checkout')}
              className={menuRowClass}
            >
              <span className="flex items-center gap-2.5 font-medium text-slate-700">
                <span className={iconCircleClass}>
                  <ShoppingCart className="w-4 h-4" />
                </span>
                <span>Giỏ hàng</span>
              </span>
              <span className="flex items-center gap-1.5">
                {totalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                    {totalCount}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setBugFeedback(null);
                setBugModalOpen(true);
              }}
              className={menuRowClass}
            >
              <span className="flex items-center gap-2.5 font-medium text-slate-700">
                <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
                  <Bug className="w-4 h-4" />
                </span>
                <span>Gửi báo cáo lỗi cho Admin</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button type="button" onClick={() => handleNavigate('/contact')} className={menuRowClass}>
              <span className="flex items-center gap-2.5 font-medium text-slate-700">
                <span className={iconCircleClass}>
                  <Mail className="w-4 h-4" />
                </span>
                <span>Liên hệ</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <div className="my-1.5 border-t border-rose-100" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold transition text-left"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </span>
                <span>Đăng xuất</span>
              </span>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      )}

      {typeof document !== 'undefined' && createPortal(portalModals, document.body)}
    </div>
  );
}
