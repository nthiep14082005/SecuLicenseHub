const { query, withTransaction } = require('../../db/pool');
const { signOrderHmac, verifyOrderHmac } = require('../../utils/crypto.util');
const { writeAuditLog } = require('../../utils/audit.util');
const env = require('../../config/env');

const MAX_INTEGER = 2147483647;
const MAX_AMOUNT = 999999999999; // orders.total_amount NUMERIC(12, 0)

class OrderError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function positiveInteger(value, label, max = MAX_INTEGER) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new OrderError(400, `${label} phải là số nguyên dương hợp lệ`);
  }
  return value;
}

function parseInteger(value, label, fallback, max = MAX_INTEGER) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new OrderError(400, `${label} không hợp lệ`);
  }
  return positiveInteger(Number(value), label, max);
}

function authenticatedUser(user) {
  if (!Number.isInteger(user?.userId) || user.userId < 1 || user.userId > MAX_INTEGER) {
    throw new OrderError(401, 'Phiên đăng nhập không hợp lệ');
  }
  return user.userId;
}

function normalizeOrder(body) {
  if (!body || !['VIETQR', 'BANK_TRANSFER'].includes(body.paymentMethod)) {
    throw new OrderError(400, 'Phương thức thanh toán không hợp lệ');
  }
  if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 2000)) {
    throw new OrderError(400, 'Ghi chú phải là chuỗi tối đa 2000 ký tự');
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
    throw new OrderError(400, 'Đơn hàng phải có từ 1 đến 100 dòng sản phẩm');
  }
  const quantities = new Map();
  for (const item of body.items) {
    const id = positiveInteger(item?.ProductID, 'Mã sản phẩm');
    const quantity = positiveInteger(item?.Quantity, 'Số lượng');
    quantities.set(id, positiveInteger((quantities.get(id) || 0) + quantity, 'Tổng số lượng'));
  }
  // Lock products in a stable order to avoid deadlocks between overlapping carts.
  const items = [...quantities].sort(([a], [b]) => a - b)
    .map(([ProductID, Quantity]) => ({ ProductID, Quantity }));
  return { paymentMethod: body.paymentMethod, note: body.note?.trim() || '', items };
}

function mapOrder(row) {
  const transferContent = `SECULICENSE_${row.order_id}`;
  const qr = new URL(`https://img.vietqr.io/image/${encodeURIComponent(env.vietqr.bankId)}-${encodeURIComponent(env.vietqr.accountNo)}-compact2.png`);
  qr.searchParams.set('amount', String(Number(row.total_amount)));
  qr.searchParams.set('addInfo', transferContent);
  return {
    orderId: row.order_id,
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    status: row.status,
    note: row.note,
    createdAt: new Date(row.created_at).toISOString(),
    integrityHmac: row.integrity_hmac,
    vietqrUrl: qr.toString(),
    payment: { ...env.vietqr, transferContent }
  };
}

async function createOrder(body, user, req) {
  const userId = authenticatedUser(user);
  const input = normalizeOrder(body);
  const result = await withTransaction(async (client) => {
    const customer = await client.query('SELECT full_name, email FROM users WHERE user_id = $1', [userId]);
    if (!customer.rows.length) throw new OrderError(401, 'Tài khoản không còn tồn tại');
    const lines = [];
    let totalAmount = 0;
    for (const item of input.items) {
      const productResult = await client.query(
        'SELECT product_id, product_name, price, quantity FROM products WHERE product_id = $1 FOR UPDATE',
        [item.ProductID]
      );
      const product = productResult.rows[0];
      if (!product) throw new OrderError(400, 'Có sản phẩm không còn tồn tại');
      if (product.quantity < item.Quantity) throw new OrderError(400, 'Số lượng sản phẩm còn lại không đủ');
      const unitPrice = Number(product.price);
      totalAmount += unitPrice * item.Quantity;
      if (!Number.isSafeInteger(totalAmount) || totalAmount < 0 || totalAmount > MAX_AMOUNT) {
        throw new OrderError(400, 'Tổng tiền vượt giới hạn cho phép');
      }
      const keys = await client.query(
        `SELECT license_id FROM license_keys
         WHERE product_id = $1 AND status = 'AVAILABLE'
         ORDER BY license_id LIMIT $2 FOR UPDATE`,
        [item.ProductID, item.Quantity]
      );
      if (keys.rows.length !== item.Quantity) throw new OrderError(400, 'Kho license chưa đủ để cấp cho đơn hàng');
      lines.push({ ...item, ProductName: product.product_name, unitPrice, licenseIds: keys.rows.map((key) => key.license_id) });
    }
    // The temporary signature is replaced before this transaction can commit.
    const inserted = await client.query(
      `INSERT INTO orders (user_id, customer_name, customer_email, payment_method, total_amount, integrity_hmac, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, customer.rows[0].full_name, customer.rows[0].email, input.paymentMethod, totalAmount, '', input.note]
    );
    const order = inserted.rows[0];
    order.integrity_hmac = signOrderHmac({ orderId: order.order_id, userId, totalAmount, createdAt: order.created_at });
    await client.query('UPDATE orders SET integrity_hmac = $1 WHERE order_id = $2', [order.integrity_hmac, order.order_id]);
    for (const line of lines) {
      await client.query(
        'INSERT INTO order_details (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order.order_id, line.ProductID, line.Quantity, line.unitPrice]
      );
      await client.query('UPDATE products SET quantity = quantity - $1 WHERE product_id = $2', [line.Quantity, line.ProductID]);
      await client.query(
        `UPDATE license_keys SET status = 'ASSIGNED', order_id = $1, owner_user_id = $2, assigned_at = NOW()
         WHERE license_id = ANY($3::int[]) AND status = 'AVAILABLE'`,
        [order.order_id, userId, line.licenseIds]
      );
    }
    return { ...mapOrder(order), items: lines.map(({ licenseIds, ...line }) => line) };
  });
  await writeAuditLog({ userId, action: 'ORDER_CREATED', resource: 'orders', req, metadata: { orderId: result.orderId } });
  return result;
}

async function getMyOrders(params, user) {
  const userId = authenticatedUser(user);
  const page = parseInteger(params.page, 'Trang', 1);
  const limit = parseInteger(params.limit, 'Số dòng', 12, 50);
  const count = await query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [userId]);
  const result = await query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC, order_id DESC LIMIT $2 OFFSET $3',
    [userId, limit, (page - 1) * limit]
  );
  const details = result.rows.length ? await query(
    `SELECT od.order_id, od.product_id, p.product_name, od.quantity, od.unit_price
     FROM order_details od JOIN products p ON p.product_id = od.product_id
     JOIN orders o ON o.order_id = od.order_id
     WHERE o.user_id = $1 AND od.order_id = ANY($2::int[]) ORDER BY od.order_detail_id`,
    [userId, result.rows.map((order) => order.order_id)]
  ) : { rows: [] };
  const totalItems = Number(count.rows[0].count);
  return {
    orders: result.rows.map((order) => ({
      ...mapOrder(order),
      items: details.rows.filter((line) => line.order_id === order.order_id).map((line) => ({
        ProductID: line.product_id, ProductName: line.product_name, Quantity: line.quantity, unitPrice: Number(line.unit_price)
      }))
    })),
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) }
  };
}

async function verifyOrderIntegrity(id, user, req) {
  const userId = authenticatedUser(user);
  const orderId = parseInteger(id, 'Mã đơn hàng');
  const result = await query('SELECT order_id, user_id, total_amount, created_at, integrity_hmac FROM orders WHERE order_id = $1', [orderId]);
  const order = result.rows[0];
  if (!order) throw new OrderError(404, 'Không tìm thấy đơn hàng');
  if (order.user_id !== userId && user.role !== 'ADMIN') {
    await writeAuditLog({ userId, action: 'IDOR_ORDER_ACCESS_BLOCKED', resource: 'orders', req, severity: 'CRITICAL', metadata: { orderId } });
    throw new OrderError(403, 'Bạn không có quyền kiểm chứng đơn hàng này');
  }
  const valid = verifyOrderHmac({ orderId, userId: order.user_id, totalAmount: order.total_amount, createdAt: order.created_at, integrityHmac: order.integrity_hmac });
  if (!valid) {
    await writeAuditLog({ userId, action: 'ORDER_INTEGRITY_FAILED', resource: 'orders', req, severity: 'CRITICAL', metadata: { orderId } });
  }
  return { orderId, valid };
}

module.exports = { createOrder, getMyOrders, verifyOrderIntegrity, OrderError };
