const { GoogleGenAI } = require('@google/genai');

const env = require('../../config/env');
const { validateImageMagicBytes } = require('../../middlewares/upload.middleware');
const { writeAuditLog } = require('../../utils/audit.util');

const ALLOWED_PRODUCT_TYPES = [
  'License Key',
  'Source Code',
  'Plugin & UI Kit',
  'API Quota',
  'E-Book Kỹ thuật'
];

const FALLBACK_OCR_DATA = {
  ProductName: 'JetBrains All Products Pack 1 Năm (OCR Mẫu)',
  ProductType: 'License Key',
  Quantity: 10,
  Unit: 'License',
  Price: 1850000,
  Description:
    'Dữ liệu mẫu tự động (fallback) khi chưa cấu hình GEMINI_API_KEY hoặc không kết nối được Gemini Vision.',
  isFallback: true
};

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseJsonResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

function normalizeOcrResult(parsed) {
  const toNullableString = (val) => {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    return str.length > 0 ? str : null;
  };

  const toNullableNonNegativeInt = (val) => {
    if (val === undefined || val === null || val === '') return null;
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
  };

  const rawType = toNullableString(parsed?.ProductType);
  const matchedType = rawType && ALLOWED_PRODUCT_TYPES.includes(rawType) ? rawType : rawType;

  return {
    ProductName: toNullableString(parsed?.ProductName),
    ProductType: matchedType,
    Quantity: toNullableNonNegativeInt(parsed?.Quantity),
    Unit: toNullableString(parsed?.Unit),
    Price: toNullableNonNegativeInt(parsed?.Price),
    Description: toNullableString(parsed?.Description),
    isFallback: false
  };
}

/**
 * Bóc tách thông tin Product từ ảnh phiếu nhập/nhãn bản quyền bằng Gemini Vision.
 * Fallback về dữ liệu mẫu hợp lệ (kèm isFallback: true) nếu thiếu API key hoặc lỗi mạng.
 */
async function extractProductFromImage({ file, user, req }) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw createHttpError(400, 'Vui lòng tải lên ảnh phiếu nhập hoặc nhãn bản quyền (field image)');
  }

  const magicCheck = validateImageMagicBytes(file.buffer);
  if (!magicCheck.valid) {
    await writeAuditLog({
      userId: user?.userId || null,
      action: 'MALICIOUS_UPLOAD_BLOCKED',
      resource: 'POST /api/ai/ocr-product',
      req,
      severity: 'CRITICAL',
      metadata: {
        originalName: file.originalname,
        declaredMime: file.mimetype,
        size: file.size
      }
    });
    throw createHttpError(
      400,
      'Tệp ảnh không hợp lệ (chỉ chấp nhận PNG, JPEG hoặc WEBP đúng Magic Bytes)'
    );
  }

  let extracted = { ...FALLBACK_OCR_DATA };

  if (env.gemini.apiKey && env.gemini.apiKey.trim().length > 0) {
    const prompt = [
      'Bạn là hệ thống OCR chuyên bóc tách thông tin sản phẩm phần mềm/tài nguyên số từ ảnh hóa đơn hoặc phiếu nhập kho.',
      'Hãy đọc ảnh đính kèm và trả về DUY NHẤT một JSON object hợp lệ (không giải thích thêm) gồm đúng 6 khóa sau:',
      '- ProductName (string hoặc null)',
      `- ProductType (một trong: ${ALLOWED_PRODUCT_TYPES.join(', ')} hoặc null nếu không rõ)`,
      '- Quantity (số nguyên >= 0 hoặc null)',
      '- Unit (string ngắn gọn như Key, Gói, License, Quota, Tài liệu hoặc null)',
      '- Price (đơn giá VNĐ dạng số nguyên >= 0 hoặc null)',
      '- Description (mô tả ngắn gọn từ ảnh hoặc null)',
      'Nguyên tắc: trường nào không đọc được hoặc không có trên ảnh thì để null, tuyệt đối không bịa số liệu.'
    ].join('\n');

    try {
      const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });
      const response = await ai.models.generateContent({
        model: env.gemini.model,
        contents: [
          {
            inlineData: {
              data: file.buffer.toString('base64'),
              mimeType: magicCheck.mime
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsed = parseJsonResponse(response?.text);
      if (parsed && typeof parsed === 'object') {
        extracted = normalizeOcrResult(parsed);
      }
    } catch (err) {
      console.warn('[OCR] Gemini Vision lỗi, dùng dữ liệu fallback:', err.message);
      extracted = { ...FALLBACK_OCR_DATA };
    }
  }

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'OCR_PRODUCT_EXTRACTED',
    resource: 'POST /api/ai/ocr-product',
    req,
    severity: 'INFO',
    metadata: {
      isFallback: extracted.isFallback,
      mime: magicCheck.mime,
      size: file.size
    }
  });

  return extracted;
}

module.exports = {
  extractProductFromImage
};
