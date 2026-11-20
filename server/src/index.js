const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { setupSwagger } = require('./config/swagger');
const { pool, isSslEnabled } = require('./db/pool');
const { apiLimiter, sanitizeInput, csrfOriginGuard } = require('./middlewares/security.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const productRoutes = require('./modules/products/products.routes');
const ocrRoutes = require('./modules/ocr/ocr.routes');
const orderRoutes = require('./modules/orders/orders.routes');
const licenseRoutes = require('./modules/licenses/licenses.routes');
const contactRoutes = require('./modules/contacts/contacts.routes');
const searchRoutes = require('./modules/search/search.routes');
const chatbotRoutes = require('./modules/chatbot/chatbot.routes');
const { securityRouter, securityAiRouter } = require('./modules/security/security.routes');

const app = express();

// Tin cậy proxy đầu tiên khi triển khai sau reverse proxy (giúp req.ip và rate limit chính xác)
app.set('trust proxy', 1);

// 1. Bảo mật HTTP Headers (Helmet); tắt CSP mặc định để tách riêng CSP cho /api và /docs
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
);

// CSP nghiêm ngặt cho API JSON
app.use(
  '/api',
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  })
);

// CSP tương thích Swagger UI cho /docs
app.use(
  '/docs',
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  })
);

// 2. CORS bật credentials: true để trình duyệt gửi HttpOnly Cookie
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);

// 3. Parse Cookie & Body
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// CHỈ public ảnh sản phẩm; tuyệt đối KHÔNG expose uploads/assets hay uploads/ocr trực tiếp
app.use('/uploads/products', express.static(path.resolve(__dirname, '../uploads/products')));

// 4. Gắn Swagger UI tại /docs và /docs.json
setupSwagger(app, env.port);

// 5. Chuỗi phòng vệ nền cho toàn bộ /api
app.use('/api', apiLimiter);
app.use('/api', csrfOriginGuard);
app.use('/api', sanitizeInput);

// 6. Health Check thật (kiểm tra Express + PostgreSQL Local/Neon SSL)
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    return res.json({
      success: true,
      service: 'SecuLicense Hub API',
      status: 'ok',
      database: 'connected',
      sslEnabled: isSslEnabled,
      serverTime: result.rows[0].server_time
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      service: 'SecuLicense Hub API',
      status: 'error',
      database: 'disconnected',
      sslEnabled: isSslEnabled,
      message: err.message
    });
  }
});

// 7. Mount đủ 9 module router nghiệp vụ (Skeleton trả về 501 TODO A/B)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ai', ocrRoutes);
app.use('/api/ai', chatbotRoutes);
app.use('/api/ai', securityAiRouter);
app.use('/api/security', securityRouter);

// 8. Xử lý 404 & Lỗi tập trung
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`🚀 SecuLicense Hub API đang chạy tại: http://localhost:${env.port}`);
    console.log(`📘 Swagger UI (Test API):            http://localhost:${env.port}/docs`);
    console.log(`❤️  Health Check:                     http://localhost:${env.port}/api/health`);
  });
}

module.exports = app;
