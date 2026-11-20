const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

/**
 * Gắn Swagger UI trực quan (/docs) và file đặc tả OpenAPI (/docs.json) vào Express app.
 */
function setupSwagger(app, port) {
  const specPath = path.resolve(__dirname, '../../../specs/openapi.json');

  if (!fs.existsSync(specPath)) {
    console.warn('[Swagger] Không tìm thấy file spec tại:', specPath);
    return;
  }

  const rawSpec = fs.readFileSync(specPath, 'utf8');
  const swaggerDocument = JSON.parse(rawSpec);

  // Đồng bộ cổng hiện tại để nút "Try it out" gọi đúng địa chỉ server
  swaggerDocument.servers = [
    {
      url: `http://localhost:${port}`,
      description: 'SecuLicense Hub Local Server'
    }
  ];

  app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customSiteTitle: 'SecuLicense Hub — API Docs (Swagger UI)',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true
      }
    })
  );
}

module.exports = { setupSwagger };
