const fs = require('node:fs');
const path = require('node:path');
const xlsx = require('xlsx');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const xss = require('xss');

const { query, withTransaction, mapProductRow } = require('../../db/pool');
const { sanitizeExcelCell } = require('../../utils/crypto.util');
const { writeAuditLog } = require('../../utils/audit.util');
const {
  validateImageMagicBytes,
  generateSafeFilename,
  assertNoPathTraversal
} = require('../../middlewares/upload.middleware');
const { syncProductsToMeilisearch } = require('../search/search.service');

const PRODUCTS_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/products');
const CLONE_SUFFIX = ' (Copy)';

const SORT_COLUMN_MAP = new Map([
  ['ProductID', 'product_id'],
  ['ProductName', 'product_name'],
  ['ProductType', 'product_type'],
  ['Quantity', 'quantity'],
  ['Price', 'price'],
  ['CreateDate', 'create_date'],
  ['UpdateDate', 'update_date']
]);

function createHttpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

function parsePositiveInt(value, fieldLabel = 'ID') {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw createHttpError(400, `${fieldLabel} phải là số nguyên dương hợp lệ`);
  }
  return num;
}

function parseIdsArray(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createHttpError(400, 'Danh sách ids phải là mảng không rỗng');
  }
  const uniqueIds = [];
  const seen = new Set();
  for (const rawId of ids) {
    const id = parsePositiveInt(rawId, 'ID sản phẩm');
    if (!seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }
  return uniqueIds;
}

async function safeSyncMeilisearch() {
  try {
    await syncProductsToMeilisearch();
  } catch (err) {
    console.warn('[Products] Không thể đồng bộ Meilisearch:', err.message);
  }
}

function buildClonedName(originalName) {
  const base = String(originalName || '').trim();
  const maxBaseLength = 200 - CLONE_SUFFIX.length;
  const truncated = base.length > maxBaseLength ? base.slice(0, maxBaseLength) : base;
  return `${truncated}${CLONE_SUFFIX}`;
}

function sanitizeOptionalString(val) {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str.length > 0 ? xss(str) : null;
}

function validateProductPayload(payload = {}) {
  const errors = [];

  const productName = typeof payload.ProductName === 'string'
    ? xss(payload.ProductName.trim())
    : '';
  const productType = typeof payload.ProductType === 'string'
    ? xss(payload.ProductType.trim())
    : '';
  const unit = typeof payload.Unit === 'string'
    ? xss(payload.Unit.trim())
    : '';

  const rawQuantity = payload.Quantity;
  const quantity = rawQuantity === '' || rawQuantity === null || rawQuantity === undefined
    ? NaN
    : Number(rawQuantity);

  const rawPrice = payload.Price;
  const price = rawPrice === '' || rawPrice === null || rawPrice === undefined
    ? NaN
    : Number(rawPrice);

  if (!productName || productName.length > 200) {
    errors.push({ field: 'ProductName', message: 'ProductName không được rỗng và tối đa 200 ký tự' });
  }
  if (!productType || productType.length > 80) {
    errors.push({ field: 'ProductType', message: 'ProductType không được rỗng và tối đa 80 ký tự' });
  }
  if (!unit || unit.length > 40) {
    errors.push({ field: 'Unit', message: 'Unit không được rỗng và tối đa 40 ký tự' });
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    errors.push({ field: 'Quantity', message: 'Quantity phải là số nguyên >= 0' });
  }
  if (!Number.isFinite(price) || price < 0) {
    errors.push({ field: 'Price', message: 'Price phải là số >= 0' });
  }

  if (errors.length > 0) {
    throw createHttpError(400, 'Dữ liệu sản phẩm không hợp lệ', { errors });
  }

  return {
    productName,
    pathImage: sanitizeOptionalString(payload.PathImage),
    productType,
    quantity,
    unit,
    price: Math.round(price),
    description: typeof payload.Description === 'string' ? xss(payload.Description.trim()) : '',
    fileSha256: sanitizeOptionalString(payload.fileSha256 ?? payload.FileSha256),
    assetFilename: sanitizeOptionalString(payload.assetFilename ?? payload.AssetFilename)
  };
}

/**
 * Kiểm tra Magic Bytes, đổi tên UUID và lưu ảnh sản phẩm an toàn chống Path Traversal.
 */
async function saveUploadedProductImage({ file, user, req }) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw createHttpError(400, 'Vui lòng chọn tệp ảnh hợp lệ (field image)');
  }

  const magicCheck = validateImageMagicBytes(file.buffer);
  if (!magicCheck.valid) {
    await writeAuditLog({
      userId: user?.userId || null,
      action: 'MALICIOUS_UPLOAD_BLOCKED',
      resource: `${req?.method || 'POST'} ${req?.originalUrl || '/api/products/upload-image'}`,
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
      'Tệp tải lên không phải ảnh PNG, JPEG hoặc WEBP hợp lệ (sai Magic Bytes)'
    );
  }

  fs.mkdirSync(PRODUCTS_UPLOAD_DIR, { recursive: true });
  const safeFilename = generateSafeFilename(magicCheck.ext);
  const destinationPath = assertNoPathTraversal(PRODUCTS_UPLOAD_DIR, safeFilename);

  await fs.promises.writeFile(destinationPath, file.buffer);

  return {
    PathImage: `/uploads/products/${safeFilename}`,
    filename: safeFilename,
    mime: magicCheck.mime,
    size: file.size
  };
}

/**
 * CN #1: Danh sách Product phân trang (limit 10-15), tìm kiếm, lọc và sort whitelist.
 */
async function listProducts({ page = 1, limit = 12, keyword = '', type = '', sortBy = 'ProductID', sortOrder = 'DESC' }) {
  const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const rawLimit = Number.parseInt(limit, 10) || 12;
  const clampedLimit = Math.min(15, Math.max(10, rawLimit));
  const offset = (parsedPage - 1) * clampedLimit;

  const sortColumn = SORT_COLUMN_MAP.get(sortBy) || 'product_id';
  const normalizedOrder = String(sortOrder || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const whereClauses = [];
  const params = [];

  const cleanType = typeof type === 'string' ? type.trim() : '';
  if (cleanType) {
    params.push(cleanType);
    whereClauses.push(`product_type = $${params.length}`);
  }

  const cleanKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (cleanKeyword) {
    params.push(`%${cleanKeyword}%`);
    whereClauses.push(`(product_name ILIKE $${params.length} OR COALESCE(description, '') ILIKE $${params.length})`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM products ${whereSql}`,
    params
  );
  const totalItems = countResult.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / clampedLimit));

  const dataParams = [...params, clampedLimit, offset];
  const limitParamIdx = dataParams.length - 1;
  const offsetParamIdx = dataParams.length;

  const listResult = await query(
    `SELECT product_id, product_name, path_image, product_type, quantity, unit,
            price, description, create_date, update_date
     FROM products
     ${whereSql}
     ORDER BY ${sortColumn} ${normalizedOrder}, product_id DESC
     LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
    dataParams
  );

  return {
    items: listResult.rows.map((row) => mapProductRow(row)),
    pagination: {
      page: parsedPage,
      limit: clampedLimit,
      totalItems,
      totalPages
    }
  };
}

/**
 * CN #4: Xem chi tiết 1 Product (kèm FileSha256 & AssetFilename nếu có).
 */
async function getProductById(id) {
  const productId = parsePositiveInt(id, 'ProductID');
  const result = await query(
    `SELECT product_id, product_name, path_image, product_type, quantity, unit,
            price, description, file_sha256, asset_filename, create_date, update_date
     FROM products
     WHERE product_id = $1`,
    [productId]
  );

  if (result.rows.length === 0) {
    throw createHttpError(404, `Không tìm thấy sản phẩm với ID ${productId}`);
  }

  return mapProductRow(result.rows[0], { includeSecurityMeta: true });
}

/**
 * CN #2: Thêm mới Product (hỗ trợ PathImage hoặc upload ảnh trực tiếp).
 */
async function createProduct({ payload, file, user, req }) {
  const mergedPayload = { ...payload };
  if (file) {
    const uploaded = await saveUploadedProductImage({ file, user, req });
    mergedPayload.PathImage = uploaded.PathImage;
  }

  const validated = validateProductPayload(mergedPayload);

  const insertResult = await query(
    `INSERT INTO products (
       product_name, path_image, product_type, quantity, unit,
       price, description, file_sha256, asset_filename
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING product_id, product_name, path_image, product_type, quantity, unit,
               price, description, file_sha256, asset_filename, create_date, update_date`,
    [
      validated.productName,
      validated.pathImage,
      validated.productType,
      validated.quantity,
      validated.unit,
      validated.price,
      validated.description,
      validated.fileSha256,
      validated.assetFilename
    ]
  );

  const created = mapProductRow(insertResult.rows[0]);
  await safeSyncMeilisearch();

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'PRODUCT_CREATED',
    resource: `product:${created.ProductID}`,
    req,
    severity: 'INFO',
    metadata: { ProductID: created.ProductID, ProductName: created.ProductName }
  });

  return created;
}

/**
 * CN #3: Cập nhật Product (trigger DB tự cập nhật update_date).
 */
async function updateProduct({ id, payload, file, user, req }) {
  const productId = parsePositiveInt(id, 'ProductID');

  const existingResult = await query(
    `SELECT product_id, path_image, description, file_sha256, asset_filename
     FROM products
     WHERE product_id = $1`,
    [productId]
  );
  if (existingResult.rows.length === 0) {
    throw createHttpError(404, `Không tìm thấy sản phẩm với ID ${productId}`);
  }
  const existing = existingResult.rows[0];

  const mergedPayload = { ...payload };
  if (file) {
    const uploaded = await saveUploadedProductImage({ file, user, req });
    mergedPayload.PathImage = uploaded.PathImage;
  } else if (mergedPayload.PathImage === undefined) {
    mergedPayload.PathImage = existing.path_image;
  }

  if (mergedPayload.Description === undefined) {
    mergedPayload.Description = existing.description || '';
  }
  if (mergedPayload.fileSha256 === undefined && mergedPayload.FileSha256 === undefined) {
    mergedPayload.fileSha256 = existing.file_sha256;
  }
  if (mergedPayload.assetFilename === undefined && mergedPayload.AssetFilename === undefined) {
    mergedPayload.assetFilename = existing.asset_filename;
  }

  const validated = validateProductPayload(mergedPayload);

  const updateResult = await query(
    `UPDATE products
     SET product_name = $1,
         path_image = $2,
         product_type = $3,
         quantity = $4,
         unit = $5,
         price = $6,
         description = $7,
         file_sha256 = $8,
         asset_filename = $9
     WHERE product_id = $10
     RETURNING product_id, product_name, path_image, product_type, quantity, unit,
               price, description, file_sha256, asset_filename, create_date, update_date`,
    [
      validated.productName,
      validated.pathImage,
      validated.productType,
      validated.quantity,
      validated.unit,
      validated.price,
      validated.description,
      validated.fileSha256,
      validated.assetFilename,
      productId
    ]
  );

  const updated = mapProductRow(updateResult.rows[0]);
  await safeSyncMeilisearch();

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'PRODUCT_UPDATED',
    resource: `product:${productId}`,
    req,
    severity: 'INFO',
    metadata: { ProductID: productId, ProductName: updated.ProductName }
  });

  return updated;
}

/**
 * CN #5: Xóa 1 Product.
 */
async function deleteProduct({ id, user, req }) {
  const productId = parsePositiveInt(id, 'ProductID');

  let deletedRow;
  try {
    const result = await query(
      `DELETE FROM products
       WHERE product_id = $1
       RETURNING product_id, product_name`,
      [productId]
    );
    if (result.rows.length === 0) {
      throw createHttpError(404, `Không tìm thấy sản phẩm với ID ${productId}`);
    }
    deletedRow = result.rows[0];
  } catch (err) {
    if (err.code === '23503') {
      throw createHttpError(
        409,
        `Không thể xóa sản phẩm ID ${productId} vì đã phát sinh dữ liệu đơn hàng liên quan`
      );
    }
    throw err;
  }

  await safeSyncMeilisearch();

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'PRODUCT_DELETED',
    resource: `product:${productId}`,
    req,
    severity: 'INFO',
    metadata: { ProductID: productId, ProductName: deletedRow.product_name }
  });

  return { ProductID: productId };
}

/**
 * CN #6: Xóa nhiều Product trong PostgreSQL Transaction.
 */
async function bulkDeleteProducts({ ids, user, req }) {
  const uniqueIds = parseIdsArray(ids);

  let deletedRows;
  try {
    deletedRows = await withTransaction(async (client) => {
      const result = await client.query(
        `DELETE FROM products
         WHERE product_id = ANY($1::int[])
         RETURNING product_id, product_name`,
        [uniqueIds]
      );
      return result.rows;
    });
  } catch (err) {
    if (err.code === '23503') {
      throw createHttpError(
        409,
        'Một hoặc nhiều sản phẩm đã nằm trong đơn hàng nên không thể xóa hàng loạt'
      );
    }
    throw err;
  }

  await safeSyncMeilisearch();

  const deletedIds = deletedRows.map((r) => r.product_id);
  await writeAuditLog({
    userId: user?.userId || null,
    action: 'PRODUCTS_BULK_DELETED',
    resource: 'products:bulk-delete',
    req,
    severity: 'INFO',
    metadata: { requestedIds: uniqueIds, deletedIds, deletedCount: deletedIds.length }
  });

  return {
    deletedCount: deletedIds.length,
    deletedIds
  };
}

/**
 * CN #7: Sao chép 1 bản ghi Product trong Transaction, thêm hậu tố " (Copy)".
 */
async function cloneProduct({ id, user, req }) {
  const productId = parsePositiveInt(id, 'ProductID');

  const clonedRow = await withTransaction(async (client) => {
    const srcResult = await client.query(
      `SELECT product_id, product_name, path_image, product_type, quantity, unit,
              price, description, file_sha256, asset_filename
       FROM products
       WHERE product_id = $1`,
      [productId]
    );
    if (srcResult.rows.length === 0) {
      throw createHttpError(404, `Không tìm thấy sản phẩm với ID ${productId}`);
    }

    const src = srcResult.rows[0];
    const clonedName = buildClonedName(src.product_name);

    const insertResult = await client.query(
      `INSERT INTO products (
         product_name, path_image, product_type, quantity, unit,
         price, description, file_sha256, asset_filename, create_date, update_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING product_id, product_name, path_image, product_type, quantity, unit,
                 price, description, create_date, update_date`,
      [
        clonedName,
        src.path_image,
        src.product_type,
        src.quantity,
        src.unit,
        src.price,
        src.description,
        src.file_sha256,
        src.asset_filename
      ]
    );

    return insertResult.rows[0];
  });

  const cloned = mapProductRow(clonedRow);
  await safeSyncMeilisearch();

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'PRODUCT_CLONED',
    resource: `product:${cloned.ProductID}`,
    req,
    severity: 'INFO',
    metadata: { sourceId: productId, clonedId: cloned.ProductID }
  });

  return cloned;
}

/**
 * CN #8: Sao chép nhiều Product trong Transaction, thêm hậu tố " (Copy)".
 */
async function bulkCloneProducts({ ids, user, req }) {
  const uniqueIds = parseIdsArray(ids);

  const clonedRows = await withTransaction(async (client) => {
    const srcResult = await client.query(
      `SELECT product_id, product_name, path_image, product_type, quantity, unit,
              price, description, file_sha256, asset_filename
       FROM products
       WHERE product_id = ANY($1::int[])
       ORDER BY product_id ASC`,
      [uniqueIds]
    );

    if (srcResult.rows.length === 0) {
      throw createHttpError(404, 'Không tìm thấy sản phẩm nào khớp với danh sách IDs');
    }

    const inserted = [];
    for (const src of srcResult.rows) {
      const clonedName = buildClonedName(src.product_name);
      const insertResult = await client.query(
        `INSERT INTO products (
           product_name, path_image, product_type, quantity, unit,
           price, description, file_sha256, asset_filename, create_date, update_date
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING product_id, product_name, path_image, product_type, quantity, unit,
                   price, description, create_date, update_date`,
        [
          clonedName,
          src.path_image,
          src.product_type,
          src.quantity,
          src.unit,
          src.price,
          src.description,
          src.file_sha256,
          src.asset_filename
        ]
      );
      inserted.push(insertResult.rows[0]);
    }
    return inserted;
  });

  const items = clonedRows.map((row) => mapProductRow(row));
  await safeSyncMeilisearch();

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'PRODUCTS_BULK_CLONED',
    resource: 'products:bulk-clone',
    req,
    severity: 'INFO',
    metadata: {
      sourceIds: uniqueIds,
      clonedIds: items.map((item) => item.ProductID),
      clonedCount: items.length
    }
  });

  return {
    clonedCount: items.length,
    items
  };
}

function normalizeImportedRows(parsedRows) {
  if (!Array.isArray(parsedRows)) return [];
  return parsedRows;
}

function parseImportFile({ file, user, req }) {
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (ext === '.xml') {
    const rawXml = file.buffer.toString('utf8');
    if (/<!DOCTYPE|<!ENTITY/i.test(rawXml)) {
      return { xxeBlocked: true, format: 'xml', rows: [] };
    }

    let parsed;
    try {
      const parser = new XMLParser({
        processEntities: false,
        ignoreAttributes: false,
        trimValues: true
      });
      parsed = parser.parse(rawXml);
    } catch {
      throw createHttpError(400, 'Tệp XML không đúng cú pháp');
    }

    const rootNode = parsed?.Products ?? parsed?.products ?? parsed?.ArrayOfProduct;
    let rawItems = rootNode?.Product ?? rootNode?.product ?? parsed?.Product ?? parsed?.product ?? [];
    if (rawItems && !Array.isArray(rawItems)) {
      rawItems = [rawItems];
    }
    return { xxeBlocked: false, format: 'xml', rows: normalizeImportedRows(rawItems) };
  }

  if (ext === '.json') {
    let parsed;
    try {
      parsed = JSON.parse(file.buffer.toString('utf8'));
    } catch {
      throw createHttpError(400, 'Tệp JSON không đúng cú pháp');
    }
    const rawItems = Array.isArray(parsed)
      ? parsed
      : parsed?.items || parsed?.products || parsed?.data || [];
    if (!Array.isArray(rawItems)) {
      throw createHttpError(400, 'Tệp JSON phải chứa mảng sản phẩm');
    }
    return { xxeBlocked: false, format: 'json', rows: rawItems };
  }

  if (ext === '.xlsx') {
    let workbook;
    try {
      workbook = xlsx.read(file.buffer, { type: 'buffer' });
    } catch {
      throw createHttpError(400, 'Không thể đọc tệp Excel (.xlsx)');
    }
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw createHttpError(400, 'Tệp Excel không có sheet dữ liệu nào');
    }
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '' });
    return { xxeBlocked: false, format: 'xlsx', rows };
  }

  throw createHttpError(400, 'Định dạng Import chỉ hỗ trợ .xlsx, .json hoặc .xml');
}

/**
 * CN #9a: Import .xlsx / .json / .xml (chống XXE, validate từng dòng trong Transaction).
 */
async function importProducts({ file, user, req }) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw createHttpError(400, 'Vui lòng đính kèm tệp .xlsx, .json hoặc .xml (field file)');
  }

  const parsedResult = parseImportFile({ file, user, req });

  if (parsedResult.xxeBlocked) {
    await writeAuditLog({
      userId: user?.userId || null,
      action: 'XXE_ATTEMPT_BLOCKED',
      resource: 'POST /api/products/import',
      req,
      severity: 'CRITICAL',
      metadata: { filename: file.originalname }
    });
    throw createHttpError(
      400,
      'Phát hiện khai báo <!DOCTYPE hoặc <!ENTITY không an toàn trong tệp XML (chặn XXE/XML Bomb)'
    );
  }

  const rawRows = parsedResult.rows;
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw createHttpError(400, 'Tệp Import không có dòng dữ liệu sản phẩm nào');
  }

  const validatedRows = [];
  const rowErrors = [];

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 1;
    try {
      const normalized = validateProductPayload({
        ProductName: rawRow?.ProductName ?? rawRow?.product_name,
        PathImage: rawRow?.PathImage ?? rawRow?.path_image,
        ProductType: rawRow?.ProductType ?? rawRow?.product_type,
        Quantity: rawRow?.Quantity ?? rawRow?.quantity,
        Unit: rawRow?.Unit ?? rawRow?.unit,
        Price: rawRow?.Price ?? rawRow?.price,
        Description: rawRow?.Description ?? rawRow?.description ?? '',
        fileSha256: rawRow?.fileSha256 ?? rawRow?.FileSha256,
        assetFilename: rawRow?.assetFilename ?? rawRow?.AssetFilename
      });
      validatedRows.push(normalized);
    } catch (err) {
      const detail = Array.isArray(err.errors) && err.errors.length > 0
        ? err.errors.map((e) => e.message).join('; ')
        : err.message;
      rowErrors.push({ row: rowNumber, message: detail });
    }
  });

  if (rowErrors.length > 0) {
    throw createHttpError(400, `Phát hiện ${rowErrors.length} dòng dữ liệu không hợp lệ khi Import`, {
      errors: rowErrors
    });
  }

  const insertedItems = await withTransaction(async (client) => {
    const created = [];
    for (const item of validatedRows) {
      const insertResult = await client.query(
        `INSERT INTO products (
           product_name, path_image, product_type, quantity, unit,
           price, description, file_sha256, asset_filename
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING product_id, product_name, path_image, product_type, quantity, unit,
                   price, description, create_date, update_date`,
        [
          item.productName,
          item.pathImage,
          item.productType,
          item.quantity,
          item.unit,
          item.price,
          item.description,
          item.fileSha256,
          item.assetFilename
        ]
      );
      created.push(mapProductRow(insertResult.rows[0]));
    }
    return created;
  });

  await safeSyncMeilisearch();

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'PRODUCTS_IMPORTED',
    resource: 'products:import',
    req,
    severity: 'INFO',
    metadata: {
      format: parsedResult.format,
      filename: file.originalname,
      importedCount: insertedItems.length
    }
  });

  return {
    importedCount: insertedItems.length,
    format: parsedResult.format,
    items: insertedItems
  };
}

/**
 * CN #9b: Export .xlsx / .json / .xml đủ 10 trường chuẩn;
 * mọi ô chuỗi khi xuất .xlsx đi qua sanitizeExcelCell() chống Formula Injection.
 */
async function exportProducts({ format = 'xlsx', user, req }) {
  const normalizedFormat = String(format || 'xlsx').trim().toLowerCase();
  if (!['xlsx', 'json', 'xml'].includes(normalizedFormat)) {
    throw createHttpError(400, 'Định dạng Export phải là xlsx, json hoặc xml');
  }

  const result = await query(
    `SELECT product_id, product_name, path_image, product_type, quantity, unit,
            price, description, create_date, update_date
     FROM products
     ORDER BY product_id ASC`
  );

  const products = result.rows.map((row) => mapProductRow(row));

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'PRODUCTS_EXPORTED',
    resource: `products:export:${normalizedFormat}`,
    req,
    severity: 'INFO',
    metadata: { format: normalizedFormat, count: products.length }
  });

  if (normalizedFormat === 'json') {
    return {
      contentType: 'application/json; charset=utf-8',
      filename: 'seculicense-products.json',
      buffer: Buffer.from(JSON.stringify(products, null, 2), 'utf8')
    };
  }

  if (normalizedFormat === 'xml') {
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false
    });
    const xmlBody = builder.build({
      Products: {
        Product: products
      }
    });
    return {
      contentType: 'application/xml; charset=utf-8',
      filename: 'seculicense-products.xml',
      buffer: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`, 'utf8')
    };
  }

  const sanitizedRows = products.map((p) => ({
    ProductID: p.ProductID,
    ProductName: sanitizeExcelCell(p.ProductName),
    PathImage: sanitizeExcelCell(p.PathImage || ''),
    ProductType: sanitizeExcelCell(p.ProductType),
    Quantity: p.Quantity,
    Unit: sanitizeExcelCell(p.Unit),
    Price: p.Price,
    Description: sanitizeExcelCell(p.Description || ''),
    CreateDate: sanitizeExcelCell(p.CreateDate),
    UpdateDate: sanitizeExcelCell(p.UpdateDate)
  }));

  const worksheet = xlsx.utils.json_to_sheet(sanitizedRows, {
    header: [
      'ProductID',
      'ProductName',
      'PathImage',
      'ProductType',
      'Quantity',
      'Unit',
      'Price',
      'Description',
      'CreateDate',
      'UpdateDate'
    ]
  });
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');
  const xlsxBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: 'seculicense-products.xlsx',
    buffer: xlsxBuffer
  };
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  cloneProduct,
  bulkCloneProducts,
  importProducts,
  exportProducts,
  saveUploadedProductImage
};
