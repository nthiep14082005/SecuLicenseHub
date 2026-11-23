const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');

const env = require('../../config/env');
const { query } = require('../../db/pool');
const { writeAuditLog } = require('../../utils/audit.util');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_SALT_ROUNDS = 10;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function createHttpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

function validateStrongPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa';
  }
  if (!/[a-z]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái viết thường';
  }
  if (!/[0-9]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ số';
  }
  return null;
}

function formatUserSummary(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    is2faEnabled: Boolean(row.is_2fa_enabled),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

/**
 * Đăng ký tài khoản CUSTOMER mới (validate chặt, bcrypt salt >= 10, audit log).
 */
async function register({ fullName, email, password, req }) {
  const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const errors = [];

  if (cleanName.length < 2 || cleanName.length > 120) {
    errors.push({ field: 'fullName', message: 'Họ tên phải từ 2 đến 120 ký tự' });
  }
  if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 150) {
    errors.push({ field: 'email', message: 'Địa chỉ email không hợp lệ' });
  }
  const pwdError = validateStrongPassword(password);
  if (pwdError) {
    errors.push({ field: 'password', message: pwdError });
  }

  if (errors.length > 0) {
    throw createHttpError(400, 'Dữ liệu đăng ký không hợp lệ', { errors });
  }

  const existing = await query('SELECT user_id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rows.length > 0) {
    throw createHttpError(409, 'Email này đã được đăng ký trong hệ thống');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const insertResult = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'CUSTOMER')
     RETURNING user_id, full_name, email, role, is_2fa_enabled, created_at`,
    [cleanName, cleanEmail, passwordHash]
  );

  const createdUser = formatUserSummary(insertResult.rows[0]);

  await writeAuditLog({
    userId: createdUser.userId,
    action: 'USER_REGISTERED',
    resource: cleanEmail,
    req,
    severity: 'INFO',
    metadata: { role: 'CUSTOMER' }
  });

  return createdUser;
}

/**
 * Đăng nhập: kiểm tra lockout 15 phút (5 lần sai), 2FA TOTP và cấp JWT.
 */
async function login({ email, password, totpCode, req }) {
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_REGEX.test(cleanEmail) || typeof password !== 'string' || password.length === 0) {
    throw createHttpError(400, 'Vui lòng nhập đầy đủ email và mật khẩu hợp lệ');
  }

  const result = await query(
    `SELECT user_id, full_name, email, password_hash, role, totp_secret,
            is_2fa_enabled, failed_login_attempts, locked_until, created_at
     FROM users
     WHERE email = $1`,
    [cleanEmail]
  );

  if (result.rows.length === 0) {
    await writeAuditLog({
      action: 'LOGIN_FAILED',
      resource: cleanEmail,
      req,
      severity: 'WARN',
      metadata: { reason: 'USER_NOT_FOUND' }
    });
    throw createHttpError(401, 'Email hoặc mật khẩu không chính xác');
  }

  const user = result.rows[0];

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remainingMinutes = Math.max(
      1,
      Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000)
    );
    await writeAuditLog({
      userId: user.user_id,
      action: 'LOGIN_BLOCKED_LOCKED',
      resource: cleanEmail,
      req,
      severity: 'WARN',
      metadata: { remainingMinutes }
    });
    throw createHttpError(
      423,
      `Tài khoản đang bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
    );
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    const nextAttempts = Number(user.failed_login_attempts || 0) + 1;
    if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = NOW() + make_interval(mins => $2)
         WHERE user_id = $3`,
        [nextAttempts, LOCKOUT_MINUTES, user.user_id]
      );
      await writeAuditLog({
        userId: user.user_id,
        action: 'ACCOUNT_LOCKED',
        resource: cleanEmail,
        req,
        severity: 'HIGH',
        metadata: { failedAttempts: nextAttempts, lockMinutes: LOCKOUT_MINUTES }
      });
      throw createHttpError(
        423,
        `Tài khoản đã bị khóa tạm ${LOCKOUT_MINUTES} phút do nhập sai mật khẩu ${MAX_FAILED_LOGIN_ATTEMPTS} lần liên tiếp.`
      );
    }

    await query('UPDATE users SET failed_login_attempts = $1 WHERE user_id = $2', [
      nextAttempts,
      user.user_id
    ]);
    await writeAuditLog({
      userId: user.user_id,
      action: 'LOGIN_FAILED',
      resource: cleanEmail,
      req,
      severity: 'WARN',
      metadata: { failedAttempts: nextAttempts }
    });
    throw createHttpError(
      401,
      `Email hoặc mật khẩu không chính xác (còn ${MAX_FAILED_LOGIN_ATTEMPTS - nextAttempts} lần thử)`
    );
  }

  if (user.is_2fa_enabled) {
    const cleanTotp = typeof totpCode === 'string' || typeof totpCode === 'number'
      ? String(totpCode).trim()
      : '';

    if (!cleanTotp) {
      throw createHttpError(401, 'Tài khoản đã bật 2FA. Vui lòng nhập mã xác thực 6 số TOTP.', {
        requires2fa: true
      });
    }

    const isTotpValid =
      Boolean(user.totp_secret) &&
      authenticator.verify({ token: cleanTotp, secret: user.totp_secret });

    if (!isTotpValid) {
      await writeAuditLog({
        userId: user.user_id,
        action: '2FA_FAILED',
        resource: cleanEmail,
        req,
        severity: 'HIGH',
        metadata: { stage: 'LOGIN' }
      });
      throw createHttpError(401, 'Mã xác thực 2FA TOTP không chính xác hoặc đã hết hạn', {
        requires2fa: true
      });
    }
  }

  await query(
    `UPDATE users
     SET failed_login_attempts = 0, locked_until = NULL
     WHERE user_id = $1`,
    [user.user_id]
  );

  const token = jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    },
    env.auth.jwtSecret,
    { expiresIn: env.auth.jwtExpiresIn }
  );

  await writeAuditLog({
    userId: user.user_id,
    action: 'LOGIN_SUCCESS',
    resource: cleanEmail,
    req,
    severity: 'INFO',
    metadata: { role: user.role, is2faEnabled: Boolean(user.is_2fa_enabled) }
  });

  return {
    token,
    user: formatUserSummary(user)
  };
}

/**
 * Lấy hồ sơ người dùng hiện tại (ẩn password_hash và totp_secret).
 */
async function getProfile(userId) {
  const result = await query(
    `SELECT user_id, full_name, email, role, is_2fa_enabled, created_at
     FROM users
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy thông tin người dùng');
  }

  return formatUserSummary(result.rows[0]);
}

/**
 * Khởi tạo secret TOTP & mã QR Google Authenticator cho Admin.
 */
async function setup2fa({ userId, req }) {
  const result = await query('SELECT user_id, email FROM users WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy tài khoản');
  }

  const user = result.rows[0];
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, 'SecuLicense Hub', secret);
  const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

  await query('UPDATE users SET totp_secret = $1 WHERE user_id = $2', [secret, userId]);

  await writeAuditLog({
    userId,
    action: '2FA_SETUP_INITIATED',
    resource: user.email,
    req,
    severity: 'INFO'
  });

  return {
    qrDataUrl,
    secret,
    otpauthUrl
  };
}

/**
 * Xác nhận mã TOTP 6 số và kích hoạt 2FA cho Admin.
 */
async function verify2fa({ userId, token, req }) {
  const cleanToken = typeof token === 'string' || typeof token === 'number'
    ? String(token).trim()
    : '';

  if (!/^\d{6}$/.test(cleanToken)) {
    throw createHttpError(400, 'Mã xác thực 2FA phải gồm đúng 6 chữ số');
  }

  const result = await query(
    'SELECT user_id, email, totp_secret FROM users WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy tài khoản');
  }

  const user = result.rows[0];
  if (!user.totp_secret) {
    throw createHttpError(400, 'Vui lòng khởi tạo 2FA trước khi xác nhận');
  }

  const isValid = authenticator.verify({ token: cleanToken, secret: user.totp_secret });
  if (!isValid) {
    await writeAuditLog({
      userId,
      action: '2FA_VERIFY_FAILED',
      resource: user.email,
      req,
      severity: 'WARN'
    });
    throw createHttpError(400, 'Mã xác thực TOTP không hợp lệ hoặc đã hết hạn');
  }

  await query('UPDATE users SET is_2fa_enabled = TRUE WHERE user_id = $1', [userId]);

  await writeAuditLog({
    userId,
    action: '2FA_ENABLED',
    resource: user.email,
    req,
    severity: 'INFO'
  });

  return { is2faEnabled: true };
}

module.exports = {
  register,
  login,
  getProfile,
  setup2fa,
  verify2fa
};
