/**
 * Chuẩn hóa Response Envelope thống nhất cho toàn bộ REST API SecuLicense Hub.
 */
function sendSuccess(res, { statusCode = 200, message = 'Thành công', data = null, pagination = undefined } = {}) {
  const payload = {
    success: true,
    message,
    data
  };

  if (pagination !== undefined) {
    payload.pagination = pagination;
  }

  return res.status(statusCode).json(payload);
}

function sendError(res, { statusCode = 400, message = 'Đã xảy ra lỗi', errors = [] } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}

/**
 * Phản hồi chuẩn HTTP 501 cho các route skeleton chưa triển khai.
 */
function sendNotImplemented(res, { owner, endpoint, todo }) {
  return res.status(501).json({
    success: false,
    message: `TODO [${owner}]: Chức năng chưa triển khai`,
    endpoint,
    todo
  });
}

module.exports = {
  sendSuccess,
  sendError,
  sendNotImplemented
};
