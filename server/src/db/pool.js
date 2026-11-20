const { Pool } = require('pg');
const env = require('../config/env');

/**
 * Xác định có cần bật SSL hay không:
 * - Tự động bật SSL cho Neon Serverless PostgreSQL (neon.tech hoặc sslmode=require)
 * - Giữ tắt SSL cho PostgreSQL chạy Docker/Local thông thường
 */
function shouldUseSsl(connectionString) {
  if (!connectionString) {
    return process.env.PGSSLMODE === 'require';
  }
  const normalized = connectionString.toLowerCase();
  return (
    normalized.includes('neon.tech') ||
    normalized.includes('sslmode=require') ||
    normalized.includes('ssl=true') ||
    process.env.PGSSLMODE === 'require'
  );
}

const isSslEnabled = shouldUseSsl(env.db.databaseUrl);

const poolConfig = env.db.databaseUrl
  ? {
      connectionString: env.db.databaseUrl,
      ...(isSslEnabled ? { ssl: { rejectUnauthorized: false } } : {})
    }
  : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ...(isSslEnabled ? { ssl: { rejectUnauthorized: false } } : {})
    };

const pool = new Pool({
  ...poolConfig,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Lỗi kết nối nền:', err.message);
});

/**
 * Thực thi truy vấn tham số hóa ($1, $2...) chống SQL Injection.
 */
async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Chạy nhiều câu lệnh SQL nguyên tử trong một Transaction (BEGIN ... COMMIT / ROLLBACK).
 * Dùng cho: Đặt đơn (FOR UPDATE), Bulk Delete/Clone, Import hàng loạt.
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ánh xạ chuẩn 10 trường PascalCase bắt buộc của bảng Product từ dòng PostgreSQL snake_case.
 * @param {object} row Bản ghi từ bảng products
 * @param {object} [options]
 * @param {boolean} [options.includeSecurityMeta=false] Có kèm file_sha256 / asset_filename hay không
 */
function mapProductRow(row, { includeSecurityMeta = false } = {}) {
  if (!row) return null;

  const product = {
    ProductID: row.product_id,
    ProductName: row.product_name,
    PathImage: row.path_image || null,
    ProductType: row.product_type,
    Quantity: Number(row.quantity),
    Unit: row.unit,
    Price: Number(row.price),
    Description: row.description || '',
    CreateDate: row.create_date instanceof Date ? row.create_date.toISOString() : row.create_date,
    UpdateDate: row.update_date instanceof Date ? row.update_date.toISOString() : row.update_date
  };

  if (includeSecurityMeta) {
    product.FileSha256 = row.file_sha256 || null;
    product.AssetFilename = row.asset_filename || null;
  }

  return product;
}

module.exports = {
  pool,
  query,
  withTransaction,
  mapProductRow,
  isSslEnabled
};
