const express = require('express');
const productController = require('./products.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware');
const { uploadImageMemory, uploadImportFile } = require('../../middlewares/upload.middleware');

const router = express.Router();

const singleImageUpload = uploadImageMemory.single('image');

function optionalImageUpload(req, res, next) {
  if (req.is('multipart/form-data')) {
    return singleImageUpload(req, res, next);
  }
  return next();
}

// Lưu ý thứ tự route: các path tĩnh phải khai báo TRƯỚC /:id
router.get('/', productController.listProducts);
router.post('/', requireAuth, requireAdmin, optionalImageUpload, productController.createProduct);
router.post('/bulk-delete', requireAuth, requireAdmin, productController.bulkDeleteProducts);
router.post('/bulk-clone', requireAuth, requireAdmin, productController.bulkCloneProducts);
router.post('/import', requireAuth, requireAdmin, uploadImportFile.single('file'), productController.importProducts);
router.get('/export', requireAuth, requireAdmin, productController.exportProducts);
router.post('/upload-image', requireAuth, requireAdmin, singleImageUpload, productController.uploadProductImage);

router.get('/:id', productController.getProductById);
router.put('/:id', requireAuth, requireAdmin, optionalImageUpload, productController.updateProduct);
router.delete('/:id', requireAuth, requireAdmin, productController.deleteProduct);
router.post('/:id/clone', requireAuth, requireAdmin, productController.cloneProduct);

module.exports = router;
