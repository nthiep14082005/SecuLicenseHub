const { sendNotImplemented } = require('../../utils/response.util');
const ocrService = require('./ocr.service');

void ocrService;

exports.extractProductFromImage = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/ai/ocr-product',
    todo: 'Kiểm tra Magic Bytes ảnh phiếu nhập/nhãn bản quyền, gửi lên Gemini Vision (@google/genai) ép trả JSON 6 trường ProductName, ProductType, Quantity, Unit, Price, Description (trường thiếu trả null).'
  });
