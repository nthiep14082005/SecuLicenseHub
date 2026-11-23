const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');

const env = require('../../config/env');
const { query, withTransaction } = require('../../db/pool');
const { writeAuditLog } = require('../../utils/audit.util');
const {
  getUserTwoFaPrefs,
  updateUserTwoFaPrefs,
  removeUserTwoFaPrefs,
  resolveRequired2faMethod
} = require('./twofaPrefs.util');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_SALT_ROUNDS = 10;
const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;
const TELEGRAM_OTP_TTL_MS = 5 * 60 * 1000;

// Lưu tạm mã OTP Email & Telegram 2FA theo userId (hết hạn sau 5 phút)
const emailOtpStore = new Map();
const telegramOtpStore = new Map();

function normalizeTelegramChatId(rawChatId) {
  const cleaned = String(rawChatId || '').trim();
  if (!/^-?\d{5,20}$/.test(cleaned)) {
    throw createHttpError(
      400,
      'Telegram Chat ID không hợp lệ (chỉ gồm chữ số, có thể có dấu - ở đầu cho nhóm, VD: 5123456789)'
    );
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

function maskTelegramChatId(chatId) {
  const clean = String(chatId || '').trim();
  if (clean.length <= 4) return '••••';
  return `${clean.slice(0, 2)}••••${clean.slice(-3)}`;
}

function formatUserSummary(row) {
  const prefs = getUserTwoFaPrefs(
    row.user_id,
    Boolean(row.is_2fa_enabled),
    Boolean(row.totp_secret)
  );
  const hasAny2FA = Boolean(prefs.totp || prefs.gmail || prefs.telegram);

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
      telegram: prefs.telegram
    },
    gmailAddress: prefs.gmailAddress || '',
    telegramChatId: prefs.telegramChatId || '',
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
 * Đăng nhập: kiểm tra sai mật khẩu tối đa 10 lần (quá 10 lần xóa vĩnh viễn tài khoản), 2FA 3 phương thức và cấp Session JWT.
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
    if (nextAttempts > MAX_FAILED_LOGIN_ATTEMPTS) {
      await withTransaction(async (client) => {
        await client.query('UPDATE orders SET user_id = NULL WHERE user_id = $1', [user.user_id]);
        await client.query('UPDATE license_keys SET owner_user_id = NULL WHERE owner_user_id = $1', [
          user.user_id
        ]);
        await client.query('UPDATE audit_logs SET user_id = NULL WHERE user_id = $1', [
          user.user_id
        ]);
        await client.query('DELETE FROM users WHERE user_id = $1', [user.user_id]);
      });

      removeUserTwoFaPrefs(user.user_id);

      await writeAuditLog({
        userId: null,
        action: 'ACCOUNT_PERMANENTLY_DELETED_BRUTEFORCE',
        resource: cleanEmail,
        req,
        severity: 'CRITICAL',
        metadata: {
          deletedUserId: user.user_id,
          role: user.role,
          failedAttempts: nextAttempts
        }
      });

      throw createHttpError(
        410,
        'Tài khoản đã bị xóa vĩnh viễn do nhập sai mật khẩu quá 10 lần liên tiếp.'
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
      metadata: { failedAttempts: nextAttempts, maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS }
    });
    throw createHttpError(
      401,
      `Email hoặc mật khẩu không chính xác (sai ${nextAttempts}/${MAX_FAILED_LOGIN_ATTEMPTS} lần — quá 10 lần tài khoản sẽ bị xóa vĩnh viễn)`
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
      const savedGmail = prefs.gmailAddress || user.email;
      maskedTarget = maskEmailAddress(savedGmail);
      otpMeta = await sendEmail2faOtp({
        userId: user.user_id,
        targetEmail: savedGmail,
        req
      });
    } else if (requiredMethod === 'telegram') {
      maskedTarget = maskTelegramChatId(prefs.telegramChatId);
      otpMeta = await sendTelegram2faOtp({
        userId: user.user_id,
        chatId: prefs.telegramChatId,
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
      telegram: updatedPrefs.telegram
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
 * Sinh và gửi mã OTP 6 số qua Gmail SMTP thật tới targetEmail động (hoặc fallback dev preview nếu thiếu env).
 */
async function sendEmail2faOtp({ userId, targetEmail, req }) {
  const result = await query('SELECT user_id, email FROM users WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy tài khoản');
  }

  const user = result.rows[0];
  const resolvedEmail =
    typeof targetEmail === 'string' && targetEmail.trim()
      ? targetEmail.trim().toLowerCase()
      : String(user.email || '').trim().toLowerCase();

  if (
    !EMAIL_REGEX.test(resolvedEmail) ||
    resolvedEmail.length > 150 ||
    !resolvedEmail.endsWith('@gmail.com')
  ) {
    throw createHttpError(400, 'Vui lòng nhập địa chỉ Gmail hợp lệ (kết thúc bằng @gmail.com)');
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  emailOtpStore.set(userId, {
    otp,
    targetEmail: resolvedEmail,
    expiresAt: Date.now() + EMAIL_OTP_TTL_MS
  });

  let deliveryMode = 'fallback';
  let fallbackReason = null;

  if (!env.smtp.user || !env.smtp.pass) {
    const missingVars = [!env.smtp.user && 'SMTP_USER', !env.smtp.pass && 'SMTP_PASS']
      .filter(Boolean)
      .join(', ');
    fallbackReason = `Chưa cấu hình ${missingVars} trong .env — đang dùng mã test`;
  } else {
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
        to: resolvedEmail,
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
    } catch (err) {
      await writeAuditLog({
        userId,
        action: '2FA_EMAIL_OTP_FAILED',
        resource: resolvedEmail,
        req,
        severity: 'WARN',
        metadata: {
          code: err.code || null,
          responseCode: err.responseCode || null,
          reason: err.message
        }
      });
      const isAuthError = err.code === 'EAUTH' || err.responseCode === 535;
      const detailMessage = isAuthError
        ? `Gửi Gmail OTP thất bại: Sai SMTP_USER hoặc App Password 16 ký tự (SMTP_PASS) trong .env (${err.message})`
        : `Gửi Gmail OTP thất bại qua SMTP (${err.message})`;
      throw createHttpError(502, detailMessage);
    }
  }

  await writeAuditLog({
    userId,
    action: '2FA_EMAIL_OTP_SENT',
    resource: resolvedEmail,
    req,
    severity: 'INFO',
    metadata: { deliveryMode, targetEmail: resolvedEmail }
  });

  const payload = {
    sentTo: resolvedEmail,
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
 * Xác nhận mã OTP 6 số gửi qua Email để kích hoạt lớp 2FA Email và lưu gmailAddress động.
 */
async function verifyEmail2faOtp({ userId, token, targetEmail, req }) {
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

  if (typeof targetEmail === 'string' && targetEmail.trim()) {
    const cleanTargetEmail = targetEmail.trim().toLowerCase();
    if (cleanTargetEmail !== entry.targetEmail) {
      throw createHttpError(
        400,
        'Địa chỉ Gmail không khớp với Gmail vừa nhận mã OTP. Vui lòng gửi lại mã mới.'
      );
    }
  }

  const userRes = await query('SELECT email FROM users WHERE user_id = $1', [userId]);
  const fallbackUserEmail = userRes.rows[0]?.email || `user:${userId}`;
  const verifiedEmail = entry.targetEmail || fallbackUserEmail;

  if (entry.otp !== cleanToken) {
    await writeAuditLog({
      userId,
      action: '2FA_EMAIL_VERIFY_FAILED',
      resource: verifiedEmail,
      req,
      severity: 'WARN'
    });
    throw createHttpError(400, 'Mã OTP Email không chính xác');
  }

  emailOtpStore.delete(userId);
  await query('UPDATE users SET is_2fa_enabled = TRUE WHERE user_id = $1', [userId]);
  const updatedPrefs = updateUserTwoFaPrefs(userId, {
    gmail: true,
    gmailAddress: verifiedEmail
  });

  await writeAuditLog({
    userId,
    action: '2FA_EMAIL_ENABLED',
    resource: verifiedEmail,
    req,
    severity: 'INFO',
    metadata: { gmailAddress: verifiedEmail }
  });

  return {
    method: 'gmail',
    verified: true,
    gmailAddress: verifiedEmail,
    hasAny2FA: true,
    twoFactorMethods: {
      totp: updatedPrefs.totp,
      gmail: updatedPrefs.gmail,
      telegram: updatedPrefs.telegram
    }
  };
}

/**
 * Sinh và gửi mã OTP 6 số qua Telegram Bot API (@seculicense_otp_bot) tới chatId động.
 */
async function sendTelegram2faOtp({ userId, chatId, req }) {
  const normalizedChatId = normalizeTelegramChatId(chatId);
  const otp = String(crypto.randomInt(100000, 1000000));

  telegramOtpStore.set(userId, {
    otp,
    chatId: normalizedChatId,
    expiresAt: Date.now() + TELEGRAM_OTP_TTL_MS
  });

  let deliveryMode = 'fallback';
  let fallbackReason = null;

  const botToken = env.telegram?.botToken || '';
  const botUsername = env.telegram?.botUsername || '@seculicense_otp_bot';

  if (!botToken) {
    fallbackReason = 'Chưa cấu hình TELEGRAM_BOT_TOKEN — đang dùng mã test';
  } else {
    try {
      const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const tgRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: normalizedChatId,
          text: `🔐 Mã xác thực 2FA SecuLicense Hub của bạn là: <b>${otp}</b>\nHiệu lực trong 5 phút.`,
          parse_mode: 'HTML'
        })
      });

      const rawBody = await tgRes.text().catch(() => '');
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = {};
      }

      if (tgRes.ok && parsedBody.ok !== false) {
        deliveryMode = 'telegram';
      } else {
        const tgErrorCode = parsedBody.error_code || tgRes.status;
        const tgDesc = parsedBody.description || rawBody || tgRes.statusText || 'Unknown error';
        const lowerDesc = String(tgDesc).toLowerCase();

        let hint = '';
        if (
          tgErrorCode === 403 ||
          lowerDesc.includes('bot was blocked') ||
          lowerDesc.includes("can't initiate conversation")
        ) {
          hint = `Hãy mở ${botUsername} trên Telegram và bấm Start trước khi nhận mã. `;
        } else if (tgErrorCode === 400 && lowerDesc.includes('chat not found')) {
          hint = `Không tìm thấy Telegram Chat ID này. Hãy kiểm tra lại ID từ @userinfobot và bấm Start với ${botUsername}. `;
        } else if (tgErrorCode === 401) {
          hint = 'TELEGRAM_BOT_TOKEN không hợp lệ hoặc đã bị thu hồi. ';
        }

        await writeAuditLog({
          userId,
          action: '2FA_TELEGRAM_OTP_FAILED',
          resource: normalizedChatId,
          req,
          severity: 'WARN',
          metadata: { status: tgRes.status, errorCode: tgErrorCode, reason: tgDesc }
        });

        throw createHttpError(
          502,
          `Gửi Telegram OTP thất bại (${tgErrorCode}): ${hint}${tgDesc}`
        );
      }
    } catch (err) {
      if (err.statusCode === 502) {
        throw err;
      }
      await writeAuditLog({
        userId,
        action: '2FA_TELEGRAM_OTP_FAILED',
        resource: normalizedChatId,
        req,
        severity: 'WARN',
        metadata: { reason: err.message }
      });
      throw createHttpError(502, `Không thể kết nối Telegram Bot API: ${err.message}`);
    }
  }

  await writeAuditLog({
    userId,
    action: '2FA_TELEGRAM_OTP_SENT',
    resource: normalizedChatId,
    req,
    severity: 'INFO',
    metadata: { deliveryMode }
  });

  const payload = {
    sentTo: normalizedChatId,
    expiresInSeconds: Math.floor(TELEGRAM_OTP_TTL_MS / 1000),
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
 * Xác nhận mã OTP 6 số gửi qua Telegram Bot để kích hoạt lớp 2FA Telegram.
 */
async function verifyTelegram2faOtp({ userId, token, chatId, req }) {
  const cleanToken = typeof token === 'string' || typeof token === 'number'
    ? String(token).trim()
    : '';

  if (!/^\d{6}$/.test(cleanToken)) {
    throw createHttpError(400, 'Mã OTP Telegram phải gồm đúng 6 chữ số');
  }

  const entry = telegramOtpStore.get(userId);
  if (!entry || Date.now() > entry.expiresAt) {
    telegramOtpStore.delete(userId);
    throw createHttpError(
      400,
      'Mã OTP Telegram không tồn tại hoặc đã hết hạn. Vui lòng gửi lại mã mới.'
    );
  }

  if (typeof chatId === 'string' && chatId.trim()) {
    const normalizedInputChatId = normalizeTelegramChatId(chatId);
    if (normalizedInputChatId !== entry.chatId) {
      throw createHttpError(
        400,
        'Telegram Chat ID không khớp với ID vừa nhận mã OTP. Vui lòng gửi lại mã mới.'
      );
    }
  }

  if (entry.otp !== cleanToken) {
    await writeAuditLog({
      userId,
      action: '2FA_TELEGRAM_VERIFY_FAILED',
      resource: entry.chatId,
      req,
      severity: 'WARN'
    });
    throw createHttpError(400, 'Mã OTP Telegram không chính xác');
  }

  telegramOtpStore.delete(userId);
  await query('UPDATE users SET is_2fa_enabled = TRUE WHERE user_id = $1', [userId]);
  const updatedPrefs = updateUserTwoFaPrefs(userId, {
    telegram: true,
    telegramChatId: entry.chatId
  });

  await writeAuditLog({
    userId,
    action: '2FA_TELEGRAM_ENABLED',
    resource: entry.chatId,
    req,
    severity: 'INFO',
    metadata: { telegramChatId: entry.chatId }
  });

  return {
    method: 'telegram',
    verified: true,
    chatId: entry.chatId,
    hasAny2FA: true,
    twoFactorMethods: {
      totp: updatedPrefs.totp,
      gmail: updatedPrefs.gmail,
      telegram: updatedPrefs.telegram
    }
  };
}

/**
 * Xác thực challengeToken (bước 2 của Login 2FA) cho 1 trong 3 phương thức: totp | gmail | telegram.
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
  } else if (method === 'telegram') {
    const entry = telegramOtpStore.get(user.user_id);
    if (!entry || Date.now() > entry.expiresAt) {
      telegramOtpStore.delete(user.user_id);
      throw createHttpError(401, 'Mã OTP Telegram đã hết hạn. Vui lòng bấm Gửi lại mã Telegram.');
    }
    if (entry.otp !== cleanCode) {
      await writeAuditLog({
        userId: user.user_id,
        action: 'LOGIN_2FA_FAILED',
        resource: entry.chatId,
        req,
        severity: 'HIGH',
        metadata: { method: 'telegram' }
      });
      throw createHttpError(401, 'Mã OTP Telegram không chính xác');
    }
    telegramOtpStore.delete(user.user_id);
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
 * Gửi lại mã OTP trong bước 2 đăng nhập (/verify-2fa) cho gmail hoặc telegram.
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
    const prefs = getUserTwoFaPrefs(decoded.userId);
    return sendEmail2faOtp({
      userId: decoded.userId,
      targetEmail: prefs.gmailAddress || undefined,
      req
    });
  }

  if (decoded.requiredMethod === 'telegram') {
    const prefs = getUserTwoFaPrefs(decoded.userId);
    if (!prefs.telegramChatId) {
      throw createHttpError(400, 'Không tìm thấy Telegram Chat ID đã liên kết');
    }
    return sendTelegram2faOtp({
      userId: decoded.userId,
      chatId: prefs.telegramChatId,
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

/**
 * Xóa / Tắt 1 phương thức xác thực 2 lớp (Google Auth / Gmail OTP / Telegram OTP).
 * Bắt buộc giữ lại ít nhất 1 phương thức 2FA nếu tài khoản đang bật 2FA.
 */
async function disable2faMethod({ userId, method, req }) {
  const cleanMethod = typeof method === 'string' ? method.trim().toLowerCase() : '';
  const validMethods = ['totp', 'gmail', 'telegram'];
  if (!validMethods.includes(cleanMethod)) {
    throw createHttpError(400, 'Phương thức 2FA không hợp lệ (chỉ hỗ trợ totp, gmail, telegram)');
  }

  const userRes = await query(
    'SELECT user_id, email, is_2fa_enabled, totp_secret FROM users WHERE user_id = $1',
    [userId]
  );
  if (userRes.rows.length === 0) {
    throw createHttpError(404, 'Không tìm thấy tài khoản');
  }

  const user = userRes.rows[0];
  const prefs = getUserTwoFaPrefs(userId, Boolean(user.is_2fa_enabled), Boolean(user.totp_secret));

  if (!prefs[cleanMethod]) {
    throw createHttpError(400, 'Phương thức xác thực 2 lớp này hiện chưa được bật');
  }

  const enabledCount = [prefs.totp, prefs.gmail, prefs.telegram].filter(Boolean).length;
  if (enabledCount <= 1) {
    throw createHttpError(400, 'Phải giữ lại ít nhất 1 phương thức xác thực 2 lớp');
  }

  const patch = { [cleanMethod]: false };
  if (cleanMethod === 'telegram') {
    patch.telegramChatId = '';
  } else if (cleanMethod === 'gmail') {
    patch.gmailAddress = '';
  }

  const nextPrefs = updateUserTwoFaPrefs(userId, patch);

  if (cleanMethod === 'totp') {
    await query('UPDATE users SET totp_secret = NULL WHERE user_id = $1', [userId]);
  }

  await writeAuditLog({
    userId,
    action: '2FA_METHOD_DISABLED',
    resource: user.email,
    req,
    severity: 'WARN',
    metadata: {
      disabledMethod: cleanMethod,
      remainingMethods: {
        totp: nextPrefs.totp,
        gmail: nextPrefs.gmail,
        telegram: nextPrefs.telegram
      }
    }
  });

  return {
    method: cleanMethod,
    hasAny2FA: Boolean(nextPrefs.totp || nextPrefs.gmail || nextPrefs.telegram),
    twoFactorMethods: {
      totp: nextPrefs.totp,
      gmail: nextPrefs.gmail,
      telegram: nextPrefs.telegram
    }
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
  sendTelegram2faOtp,
  verifyTelegram2faOtp,
  verifyLogin2fa,
  resendLogin2fa,
  updateEmail,
  disable2faMethod
};
