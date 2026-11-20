import axios from 'axios';

/**
 * Axios Client chuẩn hóa:
 * - Bật withCredentials: true để trình duyệt tự động gửi HttpOnly Cookie JWT
 * - Đọc VITE_API_BASE_URL (mặc định http://localhost:5000/api)
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

export default axiosClient;
