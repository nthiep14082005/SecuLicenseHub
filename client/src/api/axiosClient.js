import axios from 'axios';

/**
 * Axios Client chuẩn hóa:
 * - Bật withCredentials: true để trình duyệt tự động gửi HttpOnly Session Cookie JWT
 * - Đọc VITE_API_BASE_URL (mặc định http://localhost:5000/api)
 * - Tự động xóa cờ phiên và chuyển về /login khi nhận 401 Unauthorized
 */
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 15000
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthFlow =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register') ||
        requestUrl.includes('/auth/logout');

      if (!isAuthFlow) {
        try {
          sessionStorage.removeItem('slh_session_active');
          sessionStorage.removeItem('slh_admin_route_token');
        } catch {
          // Bỏ qua nếu trình duyệt chặn storage
        }
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/register'
        ) {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
