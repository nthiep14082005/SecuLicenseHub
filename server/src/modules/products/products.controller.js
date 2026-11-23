const { sendSuccess } = require('../../utils/response.util');
const productsService = require('./products.service');

exports.listProducts = async (req, res, next) => {
  try {
    const result = await productsService.listProducts({
      page: req.query.page,
      limit: req.query.limit,
      keyword: req.query.keyword,
      type: req.query.type,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Lấy danh sách sản phẩm thành công',
      data: result.items,
      pagination: result.pagination
    });
  } catch (err) {
    return next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await productsService.createProduct({
      payload: req.body,
      file: req.file,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Thêm mới sản phẩm thành công',
      data: product
    });
  } catch (err) {
    return next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await productsService.getProductById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Lấy chi tiết sản phẩm thành công',
      data: product
    });
  } catch (err) {
    return next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await productsService.updateProduct({
      id: req.params.id,
      payload: req.body,
      file: req.file,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Cập nhật sản phẩm thành công',
      data: product
    });
  } catch (err) {
    return next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const data = await productsService.deleteProduct({
      id: req.params.id,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Đã xóa sản phẩm thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.bulkDeleteProducts = async (req, res, next) => {
  try {
    const data = await productsService.bulkDeleteProducts({
      ids: req.body?.ids,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Đã xóa ${data.deletedCount} sản phẩm`,
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.cloneProduct = async (req, res, next) => {
  try {
    const product = await productsService.cloneProduct({
      id: req.params.id,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Sao chép sản phẩm thành công',
      data: product
    });
  } catch (err) {
    return next(err);
  }
};

exports.bulkCloneProducts = async (req, res, next) => {
  try {
    const data = await productsService.bulkCloneProducts({
      ids: req.body?.ids,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Đã sao chép ${data.clonedCount} sản phẩm`,
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.importProducts = async (req, res, next) => {
  try {
    const data = await productsService.importProducts({
      file: req.file,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Import thành công ${data.importedCount} sản phẩm từ định dạng ${data.format.toUpperCase()}`,
      data
    });
  } catch (err) {
    return next(err);
  }
};

exports.exportProducts = async (req, res, next) => {
  try {
    const fileResult = await productsService.exportProducts({
      format: req.query.format,
      user: req.user,
      req
    });

    res.setHeader('Content-Type', fileResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileResult.filename}"`);
    return res.status(200).send(fileResult.buffer);
  } catch (err) {
    return next(err);
  }
};

exports.uploadProductImage = async (req, res, next) => {
  try {
    const data = await productsService.saveUploadedProductImage({
      file: req.file,
      user: req.user,
      req
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Tải lên ảnh sản phẩm thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
};
