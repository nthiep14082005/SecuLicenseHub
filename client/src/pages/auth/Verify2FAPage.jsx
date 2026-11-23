import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck
} from 'lucide-react';
import { CHALLENGE_STORAGE_KEY, useAuth } from '../../context/AuthContext';

const METHOD_META = {
  totp: {
    title: 'Google Authenticator (TOTP)',
    subtitle: 'Mở ứng dụng Authenticator để lấy mã xác thực gồm 6 chữ số.',
    Icon: KeyRound
  },
  gmail: {
    title: 'Mã OTP qua Gmail',
    subtitle: 'Nhập mã OTP 6 chữ số đã được gửi tới hộp thư Gmail của bạn.',
    Icon: Mail
  },
  telegram: {
    title: 'Mã OTP qua Telegram',
    subtitle: 'Nhập mã OTP 6 chữ số đã được gửi tới Telegram (@seculicense_otp_bot) của bạn.',
    Icon: Send
  }
};

function readInitialChallenge(locationState) {
  if (locationState?.challenge?.challengeToken) {
    return locationState.challenge;
  }
  try {
    const raw = sessionStorage.getItem(CHALLENGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.challengeToken ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * [Thành viên A] Trang Xác thực 2 lớp (2FA Challenge) sau bước nhập Email & Mật khẩu.
 */
export default function Verify2FAPage() {
  const { verifyLogin2fa, resendLogin2fa, sendFallbackLogin2fa } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState(() => readInitialChallenge(location.state));
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackMethod, setFallbackMethod] = useState(() => {
    const initial = readInitialChallenge(location.state);
    return Array.isArray(initial?.fallbackMethods) && initial.fallbackMethods[0]
      ? initial.fallbackMethods[0]
      : 'gmail';
  });
  const [fallbackTarget, setFallbackTarget] = useState('');
  const [fallbackStep, setFallbackStep] = useState('identify');
  const [fallbackOtpInfo, setFallbackOtpInfo] = useState(null);
  const [fallbackSending, setFallbackSending] = useState(false);
  const [alert, setAlert] = useState(() => {
    const initial = readInitialChallenge(location.state);
    if (initial?.fallbackReason) {
      return {
        type: 'warning',
        message: initial.fallbackReason
      };
    }
    return null;
  });

  useEffect(() => {
    const navChallenge = location.state?.challenge;
    if (navChallenge?.challengeToken && navChallenge.challengeToken !== challenge?.challengeToken) {
      setChallenge(navChallenge);
      setCode('');
      setFallbackMode(false);
      setFallbackTarget('');
      setFallbackStep('identify');
      setFallbackOtpInfo(null);
      setFallbackMethod(
        Array.isArray(navChallenge.fallbackMethods) && navChallenge.fallbackMethods[0]
          ? navChallenge.fallbackMethods[0]
          : 'gmail'
      );
      setAlert(
        navChallenge.fallbackReason
          ? { type: 'warning', message: navChallenge.fallbackReason }
          : null
      );
    }
  }, [location.state, challenge?.challengeToken]);

  useEffect(() => {
    if (challenge?.challengeToken) {
      try {
        sessionStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(challenge));
      } catch {
        // ignore
      }
    }
  }, [challenge]);

  if (!challenge?.challengeToken || !challenge?.requiredMethod) {
    return <Navigate to="/login" replace />;
  }

  const meta = METHOD_META[challenge.requiredMethod] || METHOD_META.totp;
  const MethodIcon = meta.Icon;
  const destinationDisplay = challenge.destination || challenge.maskedTarget;
  const canResend = challenge.requiredMethod === 'gmail' || challenge.requiredMethod === 'telegram';
  const fallbackMethods = Array.isArray(challenge.fallbackMethods) ? challenge.fallbackMethods : [];
  const activeFallbackMeta = METHOD_META[fallbackMethod] || METHOD_META.gmail;

  const handleEnterFallback = () => {
    setAlert(null);
    setCode('');
    setFallbackTarget('');
    setFallbackStep('identify');
    setFallbackOtpInfo(null);
    setFallbackMethod(fallbackMethods[0] || 'gmail');
    setFallbackMode(true);
  };

  const handleSelectFallbackMethod = (nextMethod) => {
    setFallbackMethod(nextMethod);
    setAlert(null);
    setCode('');
    setFallbackTarget('');
    setFallbackStep('identify');
    setFallbackOtpInfo(null);
  };

  const handleExitFallback = () => {
    setAlert(null);
    setCode('');
    setFallbackStep('identify');
    setFallbackOtpInfo(null);
    setFallbackMode(false);
  };

  const handleSendFallbackOtp = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const cleanTarget = fallbackTarget.trim();
    if (!cleanTarget) {
      setAlert({
        type: 'error',
        message:
          fallbackMethod === 'telegram'
            ? 'Vui lòng nhập Telegram Chat ID đã đăng ký 2FA.'
            : 'Vui lòng nhập địa chỉ Gmail đã đăng ký 2FA.'
      });
      return;
    }

    setFallbackSending(true);
    setAlert(null);
    try {
      const res = await sendFallbackLogin2fa({
        challengeToken: challenge.challengeToken,
        method: fallbackMethod,
        target: cleanTarget
      });
      const data = res?.data;
      setFallbackOtpInfo(data || null);
      setFallbackStep('otp');
      setCode('');
      setAlert({
        type: data?.deliveryMode === 'fallback' ? 'warning' : 'success',
        message:
          res?.message ||
          `Đã gửi mã xác minh 6 số tới ${data?.maskedTarget || cleanTarget} (hiệu lực 5 phút).`
      });
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Không thể gửi mã xác minh thay thế.'
      });
    } finally {
      setFallbackSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!/^\d{6}$/.test(code.trim())) {
      setAlert({ type: 'error', message: 'Vui lòng nhập đúng mã xác thực gồm 6 chữ số.' });
      return;
    }

    setSubmitting(true);
    try {
      await verifyLogin2fa({
        challengeToken: challenge.challengeToken,
        code: code.trim(),
        ...(fallbackMode ? { method: fallbackMethod } : {})
      });
      navigate('/', { replace: true });
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Mã xác thực 2FA không chính xác hoặc đã hết hạn.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setAlert(null);
    try {
      const res = await resendLogin2fa(challenge.challengeToken);
      const data = res?.data;
      setChallenge((prev) => ({
        ...prev,
        deliveryMode: data?.deliveryMode,
        fallbackReason: data?.fallbackReason,
        previewOtp: data?.previewOtp
      }));
      setAlert({
        type: data?.deliveryMode === 'fallback' ? 'warning' : 'success',
        message: res?.message || 'Đã gửi lại mã OTP mới (hiệu lực 5 phút).'
      });
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Không thể gửi lại mã OTP lúc này.'
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-white to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 border border-rose-100 rounded-2xl shadow-xl p-6 space-y-5 text-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              {fallbackMode ? (
                <activeFallbackMeta.Icon className="w-5 h-5" />
              ) : (
                <MethodIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {fallbackMode ? 'Xác minh 2FA thay thế' : 'Xác thực 2 lớp (2FA)'}
              </h1>
              <p className="text-[11px] text-emerald-700 font-semibold">
                {fallbackMode ? activeFallbackMeta.title : meta.title}
              </p>
            </div>
          </div>

          <Link
            to="/login"
            onClick={() => {
              try {
                sessionStorage.removeItem(CHALLENGE_STORAGE_KEY);
              } catch {
                // ignore
              }
            }}
            className="text-xs text-slate-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Đăng nhập lại
          </Link>
        </div>

        {!fallbackMode ? (
          <>
            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 space-y-1">
              <div>{meta.subtitle}</div>
              {destinationDisplay && (
                <div className="font-semibold text-slate-900">
                  Đích nhận: <span className="font-mono text-emerald-700">{destinationDisplay}</span>
                </div>
              )}
            </div>

            {challenge.previewOtp && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-center font-mono">
                Mã OTP Test (Dev Preview): <strong className="text-sm">{challenge.previewOtp}</strong>
              </div>
            )}

            {alert && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  alert.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : alert.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {alert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{alert.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nhập mã xác thực 6 chữ số
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-center text-lg font-mono tracking-[0.4em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{submitting ? 'Đang xác thực...' : 'Xác nhận đăng nhập'}</span>
              </button>
            </form>

            {challenge.requiredMethod === 'totp' && fallbackMethods.length > 0 && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleEnterFallback}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline"
                >
                  Mất / Không còn Google Authenticator? Dùng cách khác
                </button>
              </div>
            )}

            {canResend && (
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resending
                      ? 'Đang gửi lại...'
                      : challenge.requiredMethod === 'telegram'
                      ? 'Gửi lại mã Telegram'
                      : 'Gửi lại mã Gmail'}
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {fallbackMethods.length > 1 && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {fallbackMethods.includes('gmail') && (
                  <button
                    type="button"
                    onClick={() => handleSelectFallbackMethod('gmail')}
                    className={`p-2.5 rounded-xl border font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                      fallbackMethod === 'gmail'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>OTP qua Gmail</span>
                  </button>
                )}
                {fallbackMethods.includes('telegram') && (
                  <button
                    type="button"
                    onClick={() => handleSelectFallbackMethod('telegram')}
                    className={`p-2.5 rounded-xl border font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                      fallbackMethod === 'telegram'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>OTP qua Telegram</span>
                  </button>
                )}
              </div>
            )}

            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 space-y-1">
              <div>
                {fallbackMethod === 'telegram'
                  ? 'Nhập đúng Telegram Chat ID đã đăng ký 2FA của bạn để nhận mã OTP 6 chữ số.'
                  : 'Nhập đúng địa chỉ Gmail đã đăng ký 2FA (hoặc Gmail tài khoản nếu chưa cài phương thức phụ) để nhận mã OTP 6 chữ số.'}
              </div>
              {fallbackOtpInfo?.maskedTarget && (
                <div className="font-semibold text-slate-900">
                  Đích nhận:{' '}
                  <span className="font-mono text-emerald-700">{fallbackOtpInfo.maskedTarget}</span>
                </div>
              )}
            </div>

            {fallbackOtpInfo?.previewOtp && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-center font-mono">
                Mã OTP Test (Dev Preview): <strong className="text-sm">{fallbackOtpInfo.previewOtp}</strong>
              </div>
            )}

            {alert && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  alert.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : alert.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {alert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{alert.message}</span>
              </div>
            )}

            {fallbackStep === 'identify' ? (
              <form onSubmit={handleSendFallbackOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {fallbackMethod === 'telegram'
                      ? 'Telegram Chat ID đã đăng ký 2FA'
                      : 'Địa chỉ Gmail đã đăng ký'}
                  </label>
                  <input
                    type={fallbackMethod === 'telegram' ? 'text' : 'email'}
                    inputMode={fallbackMethod === 'telegram' ? 'numeric' : undefined}
                    autoFocus
                    required
                    value={fallbackTarget}
                    onChange={(e) => setFallbackTarget(e.target.value)}
                    placeholder={
                      fallbackMethod === 'telegram'
                        ? 'Nhập Telegram Chat ID (VD: 5123456789)'
                        : 'Nhập địa chỉ Gmail của bạn (VD: tenban@gmail.com)'
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={fallbackSending}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
                >
                  {fallbackMethod === 'telegram' ? (
                    <Send className="w-4 h-4" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  <span>{fallbackSending ? 'Đang kiểm tra & gửi mã...' : 'Gửi mã xác minh'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nhập mã OTP 6 chữ số ({fallbackMethod === 'telegram' ? 'Telegram' : 'Gmail'})
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-center text-lg font-mono tracking-[0.4em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'Đang xác thực...' : 'Xác nhận đăng nhập'}</span>
                </button>

                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={fallbackSending}
                    onClick={() => handleSendFallbackOtp()}
                    className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fallbackSending ? 'animate-spin' : ''}`} />
                    <span>{fallbackSending ? 'Đang gửi lại...' : 'Gửi lại mã'}</span>
                  </button>
                </div>
              </form>
            )}

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={handleExitFallback}
                className="text-xs font-medium text-slate-600 hover:text-emerald-700"
              >
                ← Quay lại nhập mã Google Authenticator
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
