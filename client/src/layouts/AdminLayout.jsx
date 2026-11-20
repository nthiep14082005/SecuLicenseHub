import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ShieldAlert,
  PackageCheck,
  ReceiptText,
  ArrowLeft,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

/**
 * [Thành viên A] Layout Khu vực Quản trị Bảo mật & Kho Tài nguyên Số (AdminLayout)
 */
export default function AdminLayout() {
  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive
        ? 'bg-sky-600 text-white shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-slate-950 text-white flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="font-bold text-sm">SecuLicense Admin</div>
              <div className="text-[11px] text-slate-400">Workspace Thành viên A &amp; B</div>
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
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">
            Bảng Điều khiển Quản trị &amp; Giám sát An toàn Hệ thống
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
            Skeleton Mode — TODO Guard ADMIN
          </span>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
