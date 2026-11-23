const path = require('path');
const dotenv = require('dotenv');

// Nạp biến môi trường từ file .env ở thư mục gốc workspace
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Khóa mặc định CHỈ dùng khi phát triển cục bộ (dev); production bắt buộc cấu hình trong .env
const DEV_FALLBACKS = {
  JWT_SECRET: 'dev_only_jwt_secret_change_in_production_32chars',
  AES_256_SECRET_HEX: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  HMAC_ORDER_SECRET: 'dev_only_hmac_order_secret_change_in_production',
  SIGNED_URL_SECRET: 'dev_only_signed_url_secret_change_in_production'
};

function readSecret(key) {
  const value = process.env[key];
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  if (isProduction) {
    throw new Error(`[Env] Thiếu biến môi trường bảo mật bắt buộc ở production: ${key}`);
  }
  console.warn(`[Env] Đang dùng giá trị phát triển tạm cho ${key}. Hãy bổ sung vào .env từ .env.example.`);
  return DEV_FALLBACKS[key];
}

const aesKeyHex = readSecret('AES_256_SECRET_HEX');
if (!/^[0-9a-fA-F]{64}$/.test(aesKeyHex)) {
  throw new Error('[Env] AES_256_SECRET_HEX phải đúng 64 ký tự hex (32 bytes cho AES-256-GCM).');
}

const env = {
  nodeEnv: NODE_ENV,
  isProduction,
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    databaseUrl: process.env.DATABASE_URL || '',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'seculicense_admin',
    password: process.env.POSTGRES_PASSWORD || 'seculicense_secret_123',
    database: process.env.POSTGRES_DB || 'seculicense_hub'
  },

  auth: {
    jwtSecret: readSecret('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    cookieName: process.env.COOKIE_NAME || 'seculicense_token',
    cookieSecure: process.env.COOKIE_SECURE === 'true' || isProduction
  },

  crypto: {
    aes256SecretHex: aesKeyHex,
    hmacOrderSecret: readSecret('HMAC_ORDER_SECRET'),
    signedUrlSecret: readSecret('SIGNED_URL_SECRET'),
    signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_SECONDS || 300)
  },

  meili: {
    host: process.env.MEILI_HOST || 'http://localhost:7700',
    masterKey: process.env.MEILI_MASTER_KEY || 'seculicense_meili_master_key_2026',
    indexProducts: process.env.MEILI_INDEX_PRODUCTS || 'seculicense_products'
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  },

  vietqr: {
    bankId: process.env.VIETQR_BANK_ID || 'MB',
    accountNo: process.env.VIETQR_ACCOUNT_NO || '0123456789',
    accountName: process.env.VIETQR_ACCOUNT_NAME || 'SECULICENSE HUB'
  },

  smtp: {
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').trim()
  },

  whatsapp: {
    token: (process.env.WHATSAPP_TOKEN || '').trim(),
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  }
};

module.exports = env;
