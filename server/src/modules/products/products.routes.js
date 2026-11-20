const express = require('express');
const productController = require('./products.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { uploadImageMemory, uploadImportFile } = require('../../middlewares/upload.middleware');

const router = express.Router();

// TODO [Thành viên A]: Bật requireAuth, requireRole('ADMIN') trên các route thay đổi dữ liệu khi module Auth sẵn sàng
void requireAuth;
void requireRole;

// Lưu ý thứ tự route: các path tĩnh phải khai báo TRƯỚC /:id
router.get('/', productController.listProducts);
router.post('/', productController.createProduct);
router.post('/bulk-delete', productController.bulkDeleteProducts);
router.post('/bulk-clone', productController.bulkCloneProducts);
router.post('/import', uploadImportFile.single('file'), productController.importProducts);
router.get('/export', productController.exportProducts);
router.post('/upload-image', uploadImageMemory.single('image'), productController.uploadProductImage);

router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.post('/:id/clone', productController.cloneProduct);

module.exports = router;
