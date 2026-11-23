const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');

const env = require('../../config/env');
const { query } = require('../../db/pool');
const { writeAuditLog } = require('../../utils/audit.util');
const {
  getUserTwoFaPrefs,
  updateUserTwoFaPrefs,
  resolveRequired2faMethod
} = require('./twofaPrefs.util');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_SALT_ROUNDS = 10;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;
const WHATSAPP_OTP_TTL_MS = 5 * 60 * 1000;

// Lưu tạm mã OTP Email & WhatsApp 2FA theo userId (hết hạn sau 5 phút)
const emailOtpStore = new Map();
const whatsappOtpStore = new Map();

function normalizeVietnamPhone(rawPhone) {
  const cleaned = String(rawPhone || '').replace(/[\s\-().+]/g, '');
  if (!/^\d{9,15}$/.test(cleaned)) {
    throw createHttpError(400, 'Số điện thoại WhatsApp không hợp lệ (cần 9-15 chữ số)');
  }
  if (cleaned.startsWith('0')) {
    return `84${cleaned.slice(1)}`;
  }
  return cleaned;
}

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

function signSessionJwt(userRow) {
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ? env.auth.jwtExpiresIn : '2h';
  return jwt.sign(
    {
      userId: userRow.user_id,
      email: userRow.email,
      role: userRow.role,
      fullName: userRow.full_name
    },
    env.auth.jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

function maskEmailAddress(email) {
  const [local = '', domain = 'gmail.com'] = String(email || '').split('@');
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-2)}@${domain}`;
}

function maskPhoneNumber(phone) {
  const clean = String(phone || '');
  if (clean.length <= 4) return '••••';
  return `+${clean.slice(0, 2)} ••••• ${clean.slice(-3)}`;
}

function formatUserSummary(row) {
  const prefs = getUserTwoFaPrefs(
    row.user_id,
    Boolean(row.is_2fa_enabled),
    Boolean(row.totp_secret)
  );
  const hasAny2FA = Boolean(prefs.totp || prefs.gmail || prefs.whatsapp);

  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    is2faEnabled: Boolean(row.is_2fa_enabled || hasAny2FA),
    hasAny2FA,
    twoFactorMethods: {
      totp: prefs.totp,
      gmail: prefs.gmail,
      whatsapp: prefs.whatsapp
    },
    whatsappPhone: prefs.whatsappPhone || '',
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

  await query(
    `UPDATE users
     SET failed_login_attempts = 0, locked_until = NULL
     WHERE user_id = $1`,
    [user.user_id]
  );

  const prefs = getUserTwoFaPrefs(
    user.user_id,
    Boolean(user.is_2fa_enabled),
    Boolean(user.totp_secret)
  );
  const requiredMethod = resolveRequired2faMethod(prefs);

  // Trường hợp B: Đã bật ít nhất 1 trong 3 cách 2FA -> KHÔNG cấp Session Cookie ngay
  if (requiredMethod) {
    const challengeToken = jwt.sign(
      {
        purpose: '2fa_challenge',
        userId: user.user_id,
        email: user.email,
        requiredMethod
      },
      env.auth.jwtSecret,
      { expiresIn: '5m' }
    );

    let maskedTarget = 'Google Authenticator App';
    let otpMeta = {};

    if (requiredMethod === 'gmail') {
      maskedTarget = maskEmailAddress(user.email);
      otpMeta = await sendEmail2faOtp({ userId: user.user_id, req });
    } else if (requiredMethod === 'whatsapp') {
      maskedTarget = maskPhoneNumber(prefs.whatsappPhone);
      otpMeta = await sendWhatsapp2faOtp({
        userId: user.user_id,
        phone: prefs.whatsappPhone,
        req
      });
    }

    await writeAuditLog({
      userId: user.user_id,
      action: 'LOGIN_2FA_CHALLENGE_ISSUED',
      resource: cleanEmail,
      req,
      severity: 'INFO',
      metadata: { requiredMethod }
    });

    const challengePayload = {
      requires2fa: true,
      challengeToken,
      requiredMethod,
      maskedTarget
    };

    if (otpMeta.deliveryMode) {
      challengePayload.deliveryMode = otpMeta.deliveryMode;
    }
    if (otpMeta.fallbackReason) {
      challengePayload.fallbackReason = otpMeta.fallbackReason;
    }
    if (otpMeta.previewOtp) {
      challengePayload.previewOtp = otpMeta.previewOtp;
    }

    return challengePayload;
  }

  // Trường hợp A: Chưa bật cách 2FA nào -> đăng nhập thẳng & cấp Session Cookie
  const token = signSessionJwt(user);

  await writeAuditLog({
    userId: user.user_id,
    action: 'LOGIN_SUCCESS',
    resource: cleanEmail,
    req,
    severity: 'INFO',
    metadata: { role: user.role, hasAny2FA: false }
  });

  return {
    requires2fa: false,
    token,
    user: formatUserSummary(user)
  };
}

/**
 * Lấy hồ sơ người dùng hiện tại (ẩn password_hash và totp_secret).
 */
async function getProfile(userId) {
  const result = await query(
    `SELECT user_id, full_name, email, role, totp_secret, is_2fa_enabled, created_at
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
  const updatedPrefs = updateUserTwoFaPrefs(userId, { totp: true });

  await writeAuditLog({
    userId,
    action: '2FA_ENABLED',
    resource: user.email,
    req,
    severity: 'INFO',
    metadata: { method: 'totp' }
  });

  return {
    is2faEnabled: true,
    hasAny2FA: true,
    twoFactorMethods: {
      totp: updatedPrefs.totp,
      gmail: updatedPrefs.gmail,
      whatsapp: updatedPrefs.whatsapp
    }
  };
}

/**
 * Cập nhật họ tên (full_name) của người dùng đang đăng nhập vào PostgreSQL.
 */
async function updateProfile({ userId, fullName, req }) {
  const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
  if (cleanName.length < 2 || cleanName.length > 120) {
    throw createHttpError(400, 'Họ tên phải từ 2 đến 120 ký tự');
  }

  const result = await query(
    `UPDATE users
     SET full_name = $1
     WHERE user_id = $2
     RETURNING user_id, full_name, email, role, totp_secret, is_2fa_enabled, created_at`,
    [cleanName, userId]
  );

  if (result.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy tài khoản người dùng');
  }

  const updated = formatUserSummary(result.rows[0]);

  await writeAuditLog({
    userId,
    action: 'PROFILE_UPDATED',
    resource: updated.email,
    req,
    severity: 'INFO',
    metadata: { fullName: cleanName }
  });

  return updated;
}

/**
 * Sinh và gửi mã OTP 6 số qua Gmail SMTP thật (nếu cấu hình SMTP_USER/SMTP_PASS) hoặc fallback dev preview.
 */
async function sendEmail2faOtp({ userId, req }) {
  const result = await query('SELECT user_id, email FROM users WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy tài khoản');
  }

  const user = result.rows[0];
  if (!user.email.toLowerCase().endsWith('@gmail.com')) {
    throw createHttpError(400, 'Xác thực 2FA qua Email chỉ áp dụng cho tài khoản @gmail.com');
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  emailOtpStore.set(userId, {
    otp,
    expiresAt: Date.now() + EMAIL_OTP_TTL_MS
  });

  let deliveryMode = 'fallback';
  let fallbackReason = 'Chưa cấu hình SMTP_USER / SMTP_PASS trong .env — đang dùng mã test';

  if (env.smtp.user && env.smtp.pass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass
        }
      });

      await transporter.sendMail({
        from: `"SecuLicense Hub Security" <${env.smtp.user}>`,
        to: user.email,
        subject: '[SecuLicense Hub] Mã xác thực 2FA (hiệu lực 5 phút)',
        text: `Mã OTP xác thực 2 lớp của bạn là: ${otp}. Mã có hiệu lực trong 5 phút. Tuyệt đối không chia sẻ mã này cho người khác.`,
        html: `
          <div style="font-family:sans-serif;padding:16px;border:1px solid #d1fae5;border-radius:12px;">
            <h2 style="color:#065f46;margin:0 0 8px;">SecuLicense Hub — Xác thực 2 lớp (2FA)</h2>
            <p>Mã OTP của bạn là:</p>
            <div style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#047857;margin:12px 0;">${otp}</div>
            <p style="font-size:12px;color:#475569;">Mã có hiệu lực trong 5 phút. Không chia sẻ mã này cho bất kỳ ai.</p>
          </div>
        `
      });

      deliveryMode = 'smtp';
      fallbackReason = null;
    } catch (err) {
      console.warn('[Auth] Gửi Gmail SMTP thất bại, chuyển sang chế độ fallback:', err.message);
      deliveryMode = 'fallback';
      fallbackReason = `Lỗi gửi Gmail SMTP (${err.message}) — đang dùng mã test`;
    }
  }

  await writeAuditLog({
    userId,
    action: '2FA_EMAIL_OTP_SENT',
    resource: user.email,
    req,
    severity: 'INFO',
    metadata: { deliveryMode }
  });

  const payload = {
    sentTo: user.email,
    expiresInSeconds: Math.floor(EMAIL_OTP_TTL_MS / 1000),
    deliveryMode
  };

  if (deliveryMode === 'fallback') {
    payload.fallbackReason = fallbackReason;
    if (!env.isProduction) {
      payload.previewOtp = otp;
    }
  }

  return payload;
}

/**
 * Xác nhận mã OTP 6 số gửi qua Email để kích hoạt lớp 2FA Email.
 */
async function verifyEmail2faOtp({ userId, token, req }) {
  const cleanToken = typeof token === 'string' || typeof token === 'number'
    ? String(token).trim()
    : '';

  if (!/^\d{6}$/.test(cleanToken)) {
    throw createHttpError(400, 'Mã OTP Email phải gồm đúng 6 chữ số');
  }

  const entry = emailOtpStore.get(userId);
  if (!entry || Date.now() > entry.expiresAt) {
    emailOtpStore.delete(userId);
    throw createHttpError(400, 'Mã OTP Email không tồn tại hoặc đã hết hạn. Vui lòng gửi lại mã mới.');
  }

  const userRes = await query('SELECT email FROM users WHERE user_id = $1', [userId]);
  const email = userRes.rows[0]?.email || `user:${userId}`;

  if (entry.otp !== cleanToken) {
    await writeAuditLog({
      userId,
      action: '2FA_EMAIL_VERIFY_FAILED',
      resource: email,
      req,
      severity: 'WARN'
    });
    throw createHttpError(400, 'Mã OTP Email không chính xác');
  }

  emailOtpStore.delete(userId);
  await query('UPDATE users SET is_2fa_enabled = TRUE WHERE user_id = $1', [userId]);
  const updatedPrefs = updateUserTwoFaPrefs(userId, { gmail: true });

  await writeAuditLog({
    userId,
    action: '2FA_EMAIL_ENABLED',
    resource: email,
    req,
    severity: 'INFO'
  });

  return {
    method: 'gmail',
    verified: true,
    hasAny2FA: true,
    twoFactorMethods: {
      totp: updatedPrefs.totp,
      gmail: updatedPrefs.gmail,
      whatsapp: updatedPrefs.whatsapp
    }
  };
}

/**
 * Sinh và gửi mã OTP 6 số qua WhatsApp Meta Cloud API (hoặc fallback dev preview nếu chưa cấu hình/lỗi).
 */
async function sendWhatsapp2faOtp({ userId, phone, req }) {
  const normalizedPhone = normalizeVietnamPhone(phone);
  const otp = String(crypto.randomInt(100000, 1000000));

  whatsappOtpStore.set(userId, {
    otp,
    phone: normalizedPhone,
    expiresAt: Date.now() + WHATSAPP_OTP_TTL_MS
  });

  let deliveryMode = 'fallback';
  let fallbackReason = 'Chưa cấu hình WhatsApp Cloud API trong .env — đang dùng mã test';

  if (env.whatsapp.token && env.whatsapp.phoneNumberId) {
    try {
      const apiUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(
        env.whatsapp.phoneNumberId
      )}/messages`;

      const waRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.whatsapp.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: {
            body: `[SecuLicense Hub] Ma OTP xac thuc 2FA cua ban la: ${otp} (hieu luc 5 phut). Khong chia se ma nay.`
          }
        })
      });

      if (waRes.ok) {
        deliveryMode = 'whatsapp';
        fallbackReason = null;
      } else {
        const errBody = await waRes.text().catch(() => '');
        console.warn('[Auth] Meta WhatsApp API trả lỗi, fallback dev preview:', waRes.status, errBody);
        deliveryMode = 'fallback';
        fallbackReason = `Chưa cấu hình hoặc token WhatsApp Cloud API không hợp lệ (${waRes.status}) — đang dùng mã test`;
      }
    } catch (err) {
      console.warn('[Auth] Lỗi kết nối WhatsApp Cloud API, fallback dev preview:', err.message);
      deliveryMode = 'fallback';
      fallbackReason = 'Không thể kết nối WhatsApp Cloud API — đang dùng mã test';
    }
  }

  await writeAuditLog({
    userId,
    action: '2FA_WHATSAPP_OTP_SENT',
    resource: normalizedPhone,
    req,
    severity: 'INFO',
    metadata: { deliveryMode }
  });

  const payload = {
    sentTo: normalizedPhone,
    expiresInSeconds: Math.floor(WHATSAPP_OTP_TTL_MS / 1000),
    deliveryMode
  };

  if (deliveryMode === 'fallback') {
    payload.fallbackReason = fallbackReason;
    if (!env.isProduction) {
      payload.previewOtp = otp;
    }
  }

  return payload;
}

/**
 * Xác nhận mã OTP 6 số gửi qua WhatsApp để kích hoạt lớp 2FA WhatsApp.
 */
async function verifyWhatsapp2faOtp({ userId, token, req }) {
  const cleanToken = typeof token === 'string' || typeof token === 'number'
    ? String(token).trim()
    : '';

  if (!/^\d{6}$/.test(cleanToken)) {
    throw createHttpError(400, 'Mã OTP WhatsApp phải gồm đúng 6 chữ số');
  }

  const entry = whatsappOtpStore.get(userId);
  if (!entry || Date.now() > entry.expiresAt) {
    whatsappOtpStore.delete(userId);
    throw createHttpError(
      400,
      'Mã OTP WhatsApp không tồn tại hoặc đã hết hạn. Vui lòng gửi lại mã mới.'
    );
  }

  if (entry.otp !== cleanToken) {
    await writeAuditLog({
      userId,
      action: '2FA_WHATSAPP_VERIFY_FAILED',
      resource: entry.phone,
      req,
      severity: 'WARN'
    });
    throw createHttpError(400, 'Mã OTP WhatsApp không chính xác');
  }

  whatsappOtpStore.delete(userId);
  await query('UPDATE users SET is_2fa_enabled = TRUE WHERE user_id = $1', [userId]);
  const updatedPrefs = updateUserTwoFaPrefs(userId, {
    whatsapp: true,
    whatsappPhone: entry.phone
  });

  await writeAuditLog({
    userId,
    action: '2FA_WHATSAPP_ENABLED',
    resource: entry.phone,
    req,
    severity: 'INFO'
  });

  return {
    method: 'whatsapp',
    verified: true,
    phone: entry.phone,
    hasAny2FA: true,
    twoFactorMethods: {
      totp: updatedPrefs.totp,
      gmail: updatedPrefs.gmail,
      whatsapp: updatedPrefs.whatsapp
    }
  };
}

/**
 * Xác thực challengeToken (bước 2 của Login 2FA) cho 1 trong 3 phương thức: totp | gmail | whatsapp.
 */
async function verifyLogin2fa({ challengeToken, code, req }) {
  if (!challengeToken || typeof challengeToken !== 'string') {
    throw createHttpError(400, 'Thiếu challengeToken xác thực 2FA');
  }

  let decoded;
  try {
    decoded = jwt.verify(challengeToken, env.auth.jwtSecret);
  } catch {
    throw createHttpError(401, 'Phiên xác thực 2FA đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
  }

  if (decoded?.purpose !== '2fa_challenge' || !decoded.userId || !decoded.requiredMethod) {
    throw createHttpError(401, 'Token xác thực 2FA không hợp lệ');
  }

  const cleanCode = typeof code === 'string' || typeof code === 'number' ? String(code).trim() : '';
  if (!/^\d{6}$/.test(cleanCode)) {
    throw createHttpError(400, 'Mã xác thực 2FA phải gồm đúng 6 chữ số');
  }

  const userRes = await query(
    `SELECT user_id, full_name, email, role, totp_secret, is_2fa_enabled, created_at
     FROM users
     WHERE user_id = $1`,
    [decoded.userId]
  );
  if (userRes.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy tài khoản');
  }
  const user = userRes.rows[0];
  const method = decoded.requiredMethod;

  if (method === 'totp') {
    const valid =
      Boolean(user.totp_secret) &&
      authenticator.verify({ token: cleanCode, secret: user.totp_secret });
    if (!valid) {
      await writeAuditLog({
        userId: user.user_id,
        action: 'LOGIN_2FA_FAILED',
        resource: user.email,
        req,
        severity: 'HIGH',
        metadata: { method: 'totp' }
      });
      throw createHttpError(401, 'Mã Google Authenticator 6 số không chính xác hoặc đã hết hạn');
    }
  } else if (method === 'gmail') {
    const entry = emailOtpStore.get(user.user_id);
    if (!entry || Date.now() > entry.expiresAt) {
      emailOtpStore.delete(user.user_id);
      throw createHttpError(401, 'Mã OTP Gmail đã hết hạn. Vui lòng bấm Gửi lại mã.');
    }
    if (entry.otp !== cleanCode) {
      await writeAuditLog({
        userId: user.user_id,
        action: 'LOGIN_2FA_FAILED',
        resource: user.email,
        req,
        severity: 'HIGH',
        metadata: { method: 'gmail' }
      });
      throw createHttpError(401, 'Mã OTP Gmail không chính xác');
    }
    emailOtpStore.delete(user.user_id);
  } else if (method === 'whatsapp') {
    const entry = whatsappOtpStore.get(user.user_id);
    if (!entry || Date.now() > entry.expiresAt) {
      whatsappOtpStore.delete(user.user_id);
      throw createHttpError(401, 'Mã OTP WhatsApp đã hết hạn. Vui lòng bấm Gửi lại mã.');
    }
    if (entry.otp !== cleanCode) {
      await writeAuditLog({
        userId: user.user_id,
        action: 'LOGIN_2FA_FAILED',
        resource: entry.phone,
        req,
        severity: 'HIGH',
        metadata: { method: 'whatsapp' }
      });
      throw createHttpError(401, 'Mã OTP WhatsApp không chính xác');
    }
    whatsappOtpStore.delete(user.user_id);
  } else {
    throw createHttpError(400, 'Phương thức 2FA không được hỗ trợ');
  }

  const token = signSessionJwt(user);

  await writeAuditLog({
    userId: user.user_id,
    action: 'LOGIN_2FA_SUCCESS',
    resource: user.email,
    req,
    severity: 'INFO',
    metadata: { method, role: user.role }
  });

  return {
    token,
    user: formatUserSummary(user)
  };
}

/**
 * Gửi lại mã OTP trong bước 2 đăng nhập (/verify-2fa) cho gmail hoặc whatsapp.
 */
async function resendLogin2fa({ challengeToken, req }) {
  if (!challengeToken || typeof challengeToken !== 'string') {
    throw createHttpError(400, 'Thiếu challengeToken xác thực 2FA');
  }

  let decoded;
  try {
    decoded = jwt.verify(challengeToken, env.auth.jwtSecret);
  } catch {
    throw createHttpError(401, 'Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại.');
  }

  if (decoded?.purpose !== '2fa_challenge' || !decoded.userId || !decoded.requiredMethod) {
    throw createHttpError(401, 'Token xác thực 2FA không hợp lệ');
  }

  if (decoded.requiredMethod === 'gmail') {
    return sendEmail2faOtp({ userId: decoded.userId, req });
  }

  if (decoded.requiredMethod === 'whatsapp') {
    const prefs = getUserTwoFaPrefs(decoded.userId);
    if (!prefs.whatsappPhone) {
      throw createHttpError(400, 'Không tìm thấy số WhatsApp đã liên kết');
    }
    return sendWhatsapp2faOtp({
      userId: decoded.userId,
      phone: prefs.whatsappPhone,
      req
    });
  }

  throw createHttpError(400, 'Google Authenticator lấy mã trực tiếp trên ứng dụng, không cần gửi lại.');
}

/**
 * Thêm hoặc thay đổi địa chỉ Gmail của tài khoản đang đăng nhập (bắt buộc unique, chuẩn @gmail.com).
 */
async function updateEmail({ userId, email, req }) {
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 150 || !cleanEmail.endsWith('@gmail.com')) {
    throw createHttpError(400, 'Địa chỉ email phải đúng định dạng @gmail.com hợp lệ');
  }

  const existing = await query(
    'SELECT user_id FROM users WHERE LOWER(email) = $1 AND user_id <> $2',
    [cleanEmail, userId]
  );
  if (existing.rows.length > 0) {
    throw createHttpError(409, 'Địa chỉ Gmail này đã được sử dụng bởi tài khoản khác');
  }

  const currentRes = await query('SELECT email FROM users WHERE user_id = $1', [userId]);
  if (currentRes.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy tài khoản');
  }
  const previousEmail = currentRes.rows[0].email;

  let updateRes;
  try {
    updateRes = await query(
      `UPDATE users
       SET email = $1
       WHERE user_id = $2
       RETURNING user_id, full_name, email, role, totp_secret, is_2fa_enabled, created_at`,
      [cleanEmail, userId]
    );
  } catch (err) {
    if (err.code === '23505') {
      throw createHttpError(409, 'Địa chỉ Gmail này đã được sử dụng bởi tài khoản khác');
    }
    throw err;
  }

  const updatedRow = updateRes.rows[0];
  const token = signSessionJwt(updatedRow);

  await writeAuditLog({
    userId,
    action: 'EMAIL_UPDATED',
    resource: cleanEmail,
    req,
    severity: 'INFO',
    metadata: { previousEmail, newEmail: cleanEmail }
  });

  return {
    token,
    user: formatUserSummary(updatedRow)
  };
}

module.exports = {
  register,
  login,
  getProfile,
  setup2fa,
  verify2fa,
  updateProfile,
  sendEmail2faOtp,
  verifyEmail2faOtp,
  sendWhatsapp2faOtp,
  verifyWhatsapp2faOtp,
  verifyLogin2fa,
  resendLogin2fa,
  updateEmail
};
