const env = require('../../config/env');
const { sendSuccess, sendError } = require('../../utils/response.util');
const { writeAuditLog } = require('../../utils/audit.util');
const authService = require('./auth.service');

const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.auth.cookieSecure,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/'
  };
}

exports.register = async (req, res, next) => {
  try {
    const user = await authService.register({
      fullName: req.body?.fullName,
      email: req.body?.email,
      password: req.body?.password,
      req
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Đăng ký tài khoản thành công',
      data: { user }
    });
  } catch (err) {
    return next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { token, user } = await authService.login({
      email: req.body?.email,
      password: req.body?.password,
      totpCode: req.body?.totpCode,
      req
    });

    res.cookie(env.auth.cookieName, token, getCookieOptions());

    const data = { user };
    if (!env.isProduction) {
      data.token = token;
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Đăng nhập thành công',
      data
    });
  } catch (err) {
    if (err.requires2fa) {
      return res.status(err.statusCode || 401).json({
        success: false,
        message: err.message,
        requires2fa: true,
        errors: []
      });
    }
    return next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.clearCookie(env.auth.cookieName, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.auth.cookieSecure,
      path: '/'
    });

    await writeAuditLog({
      userId: req.user?.userId || null,
      action: 'LOGOUT',
      resource: req.user?.email || 'SESSION',
      req,
      severity: 'INFO'
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Đã đăng xuất khỏi hệ thống',
      data: null
    });
  } catch (err) {
    return next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.userId);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Lấy thông tin tài khoản thành công',
      data: { user }
    });
  } catch (err) {
    return next(err);
  }
};

exports.setup2fa = async (req, res, next) => {
  try {
    const data = await authService.setup2fa({ userId: req.user.userId, req });
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Khởi tạo mã QR xác thực 2 bước (TOTP) thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.verify2fa = async (req, res, next) => {
  try {
    const token = req.body?.token;
    if (!token) {
      return sendError(res, {
        statusCode: 400,
        message: 'Vui lòng cung cấp mã xác thực 6 số (token)'
      });
    }
    const data = await authService.verify2fa({
      userId: req.user.userId,
      token,
      req
    });
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Kích hoạt xác thực 2 bước (2FA) thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};
