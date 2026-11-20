const env = require('../config/env');
const { sendError } = require('../utils/response.util');

function notFoundHandler(req, res) {
  return sendError(res, {
    statusCode: 404,
    message: `Không tìm thấy đường dẫn API: ${req.method} ${req.originalUrl}`
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.name === 'MulterError' ? 400 : 500);

  if (!env.isProduction) {
    console.error('[ErrorHandler]', err);
  }

  // Không lộ stack trace hoặc chi tiết SQL nội bộ ra ngoài khi chạy production
  const publicMessage =
    statusCode >= 500 && env.isProduction
      ? 'Lỗi hệ thống nội bộ, vui lòng thử lại sau'
      : err.message || 'Đã xảy ra lỗi khi xử lý yêu cầu';

  return sendError(res, {
    statusCode,
    message: publicMessage,
    errors: !env.isProduction && err.errors ? err.errors : []
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
