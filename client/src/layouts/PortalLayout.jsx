import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { KeyRound, ShieldCheck, ShoppingCart, Mail, Lock, UserPlus, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SmartSearchBarStub from '../components/portal/SmartSearchBarStub';
import VoiceMicButtonStub from '../components/portal/VoiceMicButtonStub';
import AiChatbotWidgetStub from '../components/portal/AiChatbotWidgetStub';

/**
 * [Thành viên B] Layout Cổng Phân phối Bản quyền Khách hàng (PortalLayout)
 */
export default function PortalLayout() {
  const { user, logout } = useAuth();
  const { totalCount } = useCart();
  const [searchKeyword, setSearchKeyword] = useState('');

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-base leading-none">SecuLicense Hub</div>
              <div className="text-[11px] text-sky-300/80">Digital Assets &amp; Web Security</div>
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
            <NavLink to="/vault" className={navLinkClass}>
              <span className="inline-flex items-center gap-1">
                <KeyRound className="w-4 h-4" /> Kho License
              </span>
            </NavLink>
            <NavLink to="/checkout" className={navLinkClass}>
              <span className="inline-flex items-center gap-1">
                <ShoppingCart className="w-4 h-4" /> Giỏ hàng ({totalCount})
              </span>
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              <span className="inline-flex items-center gap-1">
                <Mail className="w-4 h-4" /> Liên hệ
              </span>
            </NavLink>
            <NavLink to="/admin/products" className={navLinkClass}>
              <span className="inline-flex items-center gap-1 text-amber-300">
                <LayoutDashboard className="w-4 h-4" /> Admin
              </span>
            </NavLink>
            {user ? (
              <button
                type="button"
                onClick={logout}
                className="ml-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium"
              >
                Đăng xuất ({user.fullName})
              </button>
            ) : (
              <div className="flex items-center gap-1.5 ml-1">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Lock className="w-3.5 h-3.5" /> Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1"
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

      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between gap-2">
          <span>SecuLicense Hub — Skeleton Dual-Course (Ngôn ngữ kịch bản &amp; Phát triển phần mềm web an toàn)</span>
          <span>Bảo mật: HttpOnly Cookie · 2FA TOTP · AES-256-GCM · HMAC-SHA256 · Signed URL</span>
        </div>
      </footer>

      <AiChatbotWidgetStub />
    </div>
  );
}
