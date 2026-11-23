import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { REMINDER_UNTIL_KEY, useAuth } from '../../context/AuthContext';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function formatCountdown(remainingMs) {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

/**
 * [Thành viên A] Popup nhắc bật Xác thực 2 lớp (2FA) ở góc dưới bên trái màn hình.
 * Hiển thị đúng 15 phút (900 giây) hoặc tự ẩn ngay khi user bật bất kỳ cách 2FA nào.
 */
export default function TwoFactorReminderPopup() {
  const { user } = useAuth();
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!user || user.hasAny2FA) {
      setRemainingMs(0);
      return undefined;
    }

    let targetTs = 0;
    try {
      const saved = Number(sessionStorage.getItem(REMINDER_UNTIL_KEY) || 0);
      if (saved > Date.now()) {
        targetTs = saved;
      } else if (!saved) {
        targetTs = Date.now() + FIFTEEN_MINUTES_MS;
        sessionStorage.setItem(REMINDER_UNTIL_KEY, String(targetTs));
      } else {
        targetTs = saved;
      }
    } catch {
      targetTs = Date.now() + FIFTEEN_MINUTES_MS;
    }

    const updateTick = () => {
      const diff = targetTs - Date.now();
      setRemainingMs(diff > 0 ? diff : 0);
    };

    updateTick();
    const timer = setInterval(updateTick, 1000);
    return () => clearInterval(timer);
  }, [user]);

  if (!user || user.hasAny2FA || remainingMs <= 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-amber-200 shadow-2xl p-4 space-y-2.5 text-slate-800"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-bold text-slate-900">
            Tài khoản chưa bật xác thực 2 lớp (2FA)
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Vui lòng mở menu tài khoản ở góc phải và bật ít nhất 1 trong 3 phương thức (Google Auth, Telegram OTP hoặc Gmail OTP) để bảo vệ tài khoản.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-rose-100 text-[11px]">
        <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
          <Clock className="w-3.5 h-3.5" />
          Tự ẩn sau {formatCountdown(remainingMs)}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
          Nhắc nhở bảo mật
        </span>
      </div>
    </div>
  );
}
