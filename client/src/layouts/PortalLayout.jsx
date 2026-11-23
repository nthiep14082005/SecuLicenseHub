import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, ShoppingCart, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SmartSearchBarStub from '../components/portal/SmartSearchBarStub';
import VoiceMicButtonStub from '../components/portal/VoiceMicButtonStub';
import AiChatbotWidgetStub from '../components/portal/AiChatbotWidgetStub';
import UserMenuDropdown from '../components/common/UserMenuDropdown';
import TwoFactorReminderPopup from '../components/common/TwoFactorReminderPopup';

/**
 * [Thành viên B] Layout Cổng Phân phối Bản quyền Khách hàng (PortalLayout)
 */
export default function PortalLayout() {
  const { user } = useAuth();
  const { totalCount } = useCart();
  const [searchKeyword, setSearchKeyword] = useState('');

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm transition ${
      isActive
        ? 'bg-emerald-100 text-emerald-800 font-semibold'
        : 'text-slate-700 font-medium hover:text-slate-900 hover:bg-rose-50/80'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-emerald-50 text-slate-800">
      <header className="bg-white/85 backdrop-blur-md text-slate-700 border-b border-emerald-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-base leading-none text-slate-900">SecuLicense Hub</div>
              <div className="text-[11px] text-emerald-700 font-medium">Digital Assets &amp; Web Security</div>
            </div>
          </Link>

          <div className="flex-1 max-w-md flex items-center gap-2">
            <SmartSearchBarStub value={searchKeyword} onChange={setSearchKeyword} />
            <VoiceMicButtonStub onTranscript={setSearchKeyword} />
          </div>

          <nav className="flex flex-wrap items-center gap-1.5">
            <NavLink to="/" end className={navLinkClass}>
              Danh mục
            </NavLink>
            <NavLink to="/checkout" className={navLinkClass}>
              <span className="inline-flex items-center gap-1">
                <ShoppingCart className="w-4 h-4" /> Giỏ hàng ({totalCount})
              </span>
            </NavLink>
            {user ? (
              <UserMenuDropdown variant="light" />
            ) : (
              <div className="flex items-center gap-1.5 ml-1">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 transition"
                >
                  <Lock className="w-3.5 h-3.5" /> Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Đăng ký
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet context={{ searchKeyword }} />
      </main>

      <footer className="bg-white/85 backdrop-blur-md text-slate-600 text-xs py-4 border-t border-rose-100/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between gap-2">
          <span>SecuLicense Hub — Skeleton Dual-Course (Ngôn ngữ kịch bản &amp; Phát triển phần mềm web an toàn)</span>
          <span>Bảo mật: HttpOnly Cookie · 2FA TOTP · AES-256-GCM · HMAC-SHA256 · Signed URL</span>
        </div>
      </footer>

      <TwoFactorReminderPopup />
      <AiChatbotWidgetStub />
    </div>
  );
}
