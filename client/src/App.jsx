import React from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import PortalLayout from './layouts/PortalLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import Verify2FAPage from './pages/auth/Verify2FAPage';
import CatalogPage from './pages/portal/CatalogPage';
import ProductDetailPage from './pages/portal/ProductDetailPage';
import CheckoutPage from './pages/portal/CheckoutPage';
import LicenseVaultPage from './pages/portal/LicenseVaultPage';
import ContactPage from './pages/portal/ContactPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminSecurityPage from './pages/admin/AdminSecurityPage';
import { useAuth } from './context/AuthContext';
import { isValidAdminSecretSegment } from './utils/adminRoute.util';

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-md border border-rose-100 rounded-xl px-6 py-4 shadow-md flex items-center gap-3 text-sm text-slate-700">
        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span>Đang xác thực phiên đăng nhập...</span>
      </div>
    </div>
  );
}

/**
 * Route Guard toàn cục: bắt buộc đăng nhập cho mọi route trừ /login và /register.
 */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

/**
 * Chặn người dùng đã đăng nhập quay lại /login hoặc /register -> luôn đưa về /.
 */
function GuestOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * [Thành viên A] Route Guard bảo vệ khu vực Quản trị động /admin/admin/:secretToken/*.
 * Bắt buộc: đã đăng nhập + role === 'ADMIN' + khớp chính xác secretToken theo tài khoản & phiên.
 */
function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const { secretToken } = useParams();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          authNotice: 'Vui lòng đăng nhập để tiếp tục.'
        }}
      />
    );
  }

  if (user.role !== 'ADMIN' || !isValidAdminSecretSegment(secretToken, user.email)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Chỉ /login, /register và /verify-2fa cho phép truy cập khi chưa đăng nhập */}
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route
        path="/verify-2fa"
        element={
          <GuestOnly>
            <Verify2FAPage />
          </GuestOnly>
        }
      />

      {/* Portal Khách hàng (khóa tuyệt đối: yêu cầu đăng nhập) */}
      <Route
        element={
          <RequireAuth>
            <PortalLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<CatalogPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/vault" element={<LicenseVaultPage />} />
        <Route path="/licenses" element={<LicenseVaultPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Khu vực Quản trị & Bảo mật dùng đường dẫn mã hóa động */}
      <Route
        path="/admin/admin/:secretToken"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminProductsPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="security" element={<AdminSecurityPage />} />
      </Route>

      {/* Mọi đường dẫn sai (kể cả /admin, /admin/products hoặc token sai): chưa login -> /login; đã login -> / */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <Navigate to="/" replace />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
