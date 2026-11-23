import React from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  PackageCheck,
  ReceiptText,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserMenuDropdown from '../components/common/UserMenuDropdown';
import TwoFactorReminderPopup from '../components/common/TwoFactorReminderPopup';

/**
 * [Thành viên A] Layout Khu vực Quản trị Bảo mật & Kho Tài nguyên Số (AdminLayout)
 */
export default function AdminLayout() {
  const { user } = useAuth();
  const { secretToken } = useParams();
  const adminBasePath = `/admin/admin/${secretToken}`;

  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition ${
      isActive
        ? 'bg-emerald-100 text-emerald-800 font-semibold shadow-sm'
        : 'text-slate-600 font-medium hover:bg-rose-50/80 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-rose-50 via-white to-emerald-50 text-slate-800">
      <aside className="w-64 bg-white/85 backdrop-blur-md text-slate-800 flex flex-col border-r border-emerald-100 shrink-0 shadow-sm">
        <div className="p-4 border-b border-rose-100/80 bg-gradient-to-r from-rose-50/70 to-emerald-50/70">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="font-bold text-sm text-slate-900">SecuLicense Admin</div>
              <div className="text-[11px] text-slate-500">Quản trị &amp; Bảo mật Hệ thống</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink to={`${adminBasePath}/products`} className={navClass}>
            <PackageCheck className="w-4 h-4" />
            <span>Quản trị Product (11 CN)</span>
          </NavLink>
          <NavLink to={`${adminBasePath}/orders`} className={navClass}>
            <ReceiptText className="w-4 h-4" />
            <span>Hóa đơn &amp; HMAC</span>
          </NavLink>
          <NavLink to={`${adminBasePath}/security`} className={navClass}>
            <ShieldAlert className="w-4 h-4" />
            <span>Audit Logs &amp; AI Security</span>
          </NavLink>
        </nav>

        <div className="p-3 border-t border-rose-100/80 space-y-2 text-xs">
          <a
            href="http://localhost:5000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium transition"
          >
            <span>Swagger UI (/docs)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Portal Khách hàng</span>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative z-40 bg-white/95 border-b border-rose-100/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
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

          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 ${
                user?.hasAny2FA || user?.is2faEnabled
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {user?.hasAny2FA || user?.is2faEnabled ? '2FA: Đã bật' : '2FA: Chưa bật'}
            </span>

            <UserMenuDropdown variant="light" />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>

      <TwoFactorReminderPopup />
    </div>
  );
}
