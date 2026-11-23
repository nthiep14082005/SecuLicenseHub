import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PortalLayout from './layouts/PortalLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CatalogPage from './pages/portal/CatalogPage';
import ProductDetailPage from './pages/portal/ProductDetailPage';
import CheckoutPage from './pages/portal/CheckoutPage';
import LicenseVaultPage from './pages/portal/LicenseVaultPage';
import ContactPage from './pages/portal/ContactPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminSecurityPage from './pages/admin/AdminSecurityPage';
import { useAuth } from './context/AuthContext';

/**
 * [Thành viên A] Route Guard bảo vệ toàn bộ khu vực /admin/*.
 * Chưa đăng nhập hoặc không phải ADMIN sẽ chuyển hướng về /login kèm thông báo.
 */
function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm flex items-center gap-3 text-sm text-slate-700">
          <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span>Đang kiểm tra phiên đăng nhập Quản trị viên...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          authNotice: 'Vui lòng đăng nhập bằng tài khoản Quản trị viên (ADMIN) để truy cập khu vực này.'
        }}
      />
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          authNotice: 'Tài khoản của bạn không có quyền Quản trị viên (yêu cầu vai trò ADMIN).'
        }}
      />
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Auth Pages (Thành viên A) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Portal Khách hàng (Thành viên B) */}
      <Route element={<PortalLayout />}>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/vault" element={<LicenseVaultPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Khu vực Quản trị & Bảo mật (Thành viên A & B) */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Navigate to="/admin/products" replace />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="security" element={<AdminSecurityPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
