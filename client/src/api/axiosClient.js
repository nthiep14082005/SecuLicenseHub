import axios from 'axios';

export const TAB_TOKEN_KEY = 'seculicense_tab_token';

/**
 * Axios Client chuẩn hóa:
 * - Gắn Authorization: Bearer từ sessionStorage riêng của từng tab (cô lập phiên giữa các tab)
 * - Bật withCredentials: true để giữ HttpOnly Session Cookie làm fallback
 * - Đọc VITE_API_BASE_URL (mặc định http://localhost:5000/api)
 * - Tự động xóa phiên tab và chuyển về /login khi nhận 401 Unauthorized
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

axiosClient.interceptors.request.use(
  (config) => {
    try {
      const tabToken = sessionStorage.getItem(TAB_TOKEN_KEY);
      if (tabToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${tabToken}`;
      }
    } catch {
      // Bỏ qua nếu trình duyệt chặn storage
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
          sessionStorage.removeItem(TAB_TOKEN_KEY);
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
