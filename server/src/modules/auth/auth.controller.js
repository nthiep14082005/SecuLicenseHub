const { sendNotImplemented } = require('../../utils/response.util');
const authService = require('./auth.service');

void authService;

exports.register = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/auth/register',
    todo: 'Validate email + mật khẩu mạnh (>=8 ký tự, hoa/thường/số), băm bcryptjs salt>=10, lưu role CUSTOMER và ghi audit_logs.'
  });

exports.login = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/auth/login',
    todo: 'Kiểm tra locked_until, tăng failed_login_attempts (sai 5 lần khóa 15 phút), kiểm tra 2FA TOTP nếu bật, ký JWT vào HttpOnly SameSite=Strict Cookie.'
  });

exports.logout = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/auth/logout',
    todo: 'Xóa HttpOnly Cookie seculicense_token và ghi audit_logs.'
  });

exports.getProfile = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'GET /api/auth/me',
    todo: 'Bật requireAuth, truy vấn thông tin user (không trả password_hash và totp_secret).'
  });

exports.setup2fa = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/auth/2fa/setup',
    todo: 'Dùng otplib tạo secret TOTP và qrcode sinh mã QR dataURL cho Admin.'
  });

exports.verify2fa = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/auth/2fa/verify',
    todo: 'Xác thực mã TOTP 6 số từ Google Authenticator và bật is_2fa_enabled = true.'
  });
