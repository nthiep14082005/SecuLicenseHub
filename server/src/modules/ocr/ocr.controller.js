const { sendSuccess } = require('../../utils/response.util');
const ocrService = require('./ocr.service');

exports.extractProductFromImage = async (req, res, next) => {
  try {
    const data = await ocrService.extractProductFromImage({
      file: req.file,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: data.isFallback
        ? 'Trả về dữ liệu OCR mẫu (chế độ fallback)'
        : 'Bóc tách thông tin sản phẩm từ ảnh thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};
