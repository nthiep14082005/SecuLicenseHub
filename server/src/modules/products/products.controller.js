const { sendNotImplemented } = require('../../utils/response.util');
const productsService = require('./products.service');

void productsService;

exports.listProducts = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'GET /api/products',
    todo: 'Phân trang 10-15 dòng (LIMIT/OFFSET + COUNT), lọc ProductType/keyword bằng Parameterized Query, trả 10 trường PascalCase qua mapProductRow().'
  });

exports.createProduct = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/products',
    todo: 'Validate ProductName/ProductType/Unit/Price>=0/Quantity>=0, chèn PostgreSQL, gọi syncProductsToMeilisearch() và writeAuditLog().'
  });

exports.getProductById = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'GET /api/products/:id',
    todo: 'Trả về chi tiết Product (kèm FileSha256 & AssetFilename nếu có).'
  });

exports.updateProduct = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'PUT /api/products/:id',
    todo: 'Cập nhật Product (trigger tự cập nhật update_date), đồng bộ Meilisearch và ghi audit_logs.'
  });

exports.deleteProduct = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'DELETE /api/products/:id',
    todo: 'Xóa 1 bản ghi Product, xử lý ràng buộc FK nếu đã nằm trong order_details, đồng bộ Meilisearch.'
  });

exports.bulkDeleteProducts = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/products/bulk-delete',
    todo: 'Xóa nhiều bản ghi theo mảng ids trong withTransaction(), đồng bộ Meilisearch và ghi audit_logs.'
  });

exports.cloneProduct = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/products/:id/clone',
    todo: 'Nhân bản 1 dòng với hậu tố " (Bản sao)", create_date = NOW(), update_date = NOW().'
  });

exports.bulkCloneProducts = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/products/bulk-clone',
    todo: 'Sao chép nhiều bản ghi theo mảng ids trong withTransaction() và đồng bộ Meilisearch.'
  });

exports.importProducts = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/products/import',
    todo: 'Import .xlsx/.json/.xml: XML phải tắt processEntities & chặn <!DOCTYPE/<!ENTITY (chống XXE); validate từng dòng trong withTransaction().'
  });

exports.exportProducts = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'GET /api/products/export',
    todo: 'Export đủ 10 cột chuẩn (.xlsx/.json/.xml); mọi ô chuỗi Excel phải qua sanitizeExcelCell() chống Formula Injection.'
  });

exports.uploadProductImage = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'POST /api/products/upload-image',
    todo: 'Kiểm tra validateImageMagicBytes(req.file.buffer), lưu vào uploads/products/ bằng generateSafeFilename() (UUID).'
  });
