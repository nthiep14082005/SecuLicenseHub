import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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
 * [Thành viên A] Route Guard mẫu cho khu vực Admin.
 * Ở chế độ skeleton cho phép mở xem giao diện khung trước; khi hoàn thành Auth, bật kiểm tra role === 'ADMIN'.
 */
function AdminGuard({ children }) {
  const { user, skeletonMode } = useAuth();
  if (!skeletonMode && user && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
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
