const env = require('../../config/env');
const { sendSuccess, sendError } = require('../../utils/response.util');
const { writeAuditLog } = require('../../utils/audit.util');
const authService = require('./auth.service');

/**
 * Tùy chọn Cookie phiên (Session Cookie): KHÔNG đặt maxAge / expires
 * để trình duyệt tự hủy cookie khi đóng cửa sổ / tắt trình duyệt.
 */
function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.auth.cookieSecure,
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
    const result = await authService.login({
      email: req.body?.email,
      password: req.body?.password,
      totpCode: req.body?.totpCode,
      req
    });

    if (result.requires2fa) {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Vui lòng hoàn tất xác thực 2 lớp (2FA)',
        data: result
      });
    }

    res.cookie(env.auth.cookieName, result.token, getCookieOptions());

    const data = { user: result.user };
    if (!env.isProduction) {
      data.token = result.token;
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Đăng nhập thành công',
      data
    });
  } catch (err) {
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

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile({
      userId: req.user.userId,
      fullName: req.body?.fullName,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Cập nhật họ tên tài khoản thành công',
      data: { user }
    });
  } catch (err) {
    return next(err);
  }
};

exports.sendEmail2faOtp = async (req, res, next) => {
  try {
    const data = await authService.sendEmail2faOtp({
      userId: req.user.userId,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message:
        data.deliveryMode === 'smtp'
          ? `Đã gửi mã OTP 6 số tới Gmail ${data.sentTo} (hiệu lực 5 phút)`
          : data.fallbackReason || 'Đã tạo mã OTP test (chưa cấu hình SMTP)',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.verifyEmail2faOtp = async (req, res, next) => {
  try {
    const data = await authService.verifyEmail2faOtp({
      userId: req.user.userId,
      token: req.body?.token,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Kích hoạt xác thực 2 lớp qua Gmail thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.sendWhatsapp2faOtp = async (req, res, next) => {
  try {
    const data = await authService.sendWhatsapp2faOtp({
      userId: req.user.userId,
      phone: req.body?.phone,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message:
        data.deliveryMode === 'whatsapp'
          ? `Đã gửi mã OTP 6 số qua WhatsApp tới số +${data.sentTo} (hiệu lực 5 phút)`
          : data.fallbackReason || 'Chưa cấu hình WhatsApp Cloud API trong .env — đang dùng mã test',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.verifyWhatsapp2faOtp = async (req, res, next) => {
  try {
    const data = await authService.verifyWhatsapp2faOtp({
      userId: req.user.userId,
      token: req.body?.token,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Kích hoạt xác thực 2 lớp qua WhatsApp thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.verifyLogin2fa = async (req, res, next) => {
  try {
    const { token, user } = await authService.verifyLogin2fa({
      challengeToken: req.body?.challengeToken,
      code: req.body?.code,
      req
    });

    res.cookie(env.auth.cookieName, token, getCookieOptions());

    const data = { user };
    if (!env.isProduction) {
      data.token = token;
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Xác thực 2 lớp và đăng nhập thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.resendLogin2fa = async (req, res, next) => {
  try {
    const data = await authService.resendLogin2fa({
      challengeToken: req.body?.challengeToken,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message:
        data.deliveryMode === 'smtp' || data.deliveryMode === 'whatsapp'
          ? `Đã gửi lại mã OTP 6 số tới ${data.sentTo}`
          : data.fallbackReason || 'Đã tạo lại mã OTP test',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.updateEmail = async (req, res, next) => {
  try {
    const { token, user } = await authService.updateEmail({
      userId: req.user.userId,
      email: req.body?.email,
      req
    });

    res.cookie(env.auth.cookieName, token, getCookieOptions());

    const data = { user };
    if (!env.isProduction) {
      data.token = token;
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Cập nhật địa chỉ Gmail thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};
