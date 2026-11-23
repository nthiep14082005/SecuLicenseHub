const { query, withTransaction } = require('../../db/pool');
const { verifyOrderHmac } = require('../../utils/crypto.util');
const { writeAuditLog } = require('../../utils/audit.util');

const VALID_ORDER_STATUSES = new Set(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']);

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parsePositiveInt(value, fieldLabel = 'ID') {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw createHttpError(400, `${fieldLabel} phải là số nguyên dương hợp lệ`);
  }
  return num;
}

function mapOrderRow(row, items = []) {
  const totalAmount = Number(row.total_amount);
  const createdAtIso = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;

  return {
    orderId: row.order_id,
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    paymentMethod: row.payment_method,
    totalAmount,
    integrityHmac: row.integrity_hmac,
    hmacValid: verifyOrderHmac({
      orderId: row.order_id,
      userId: row.user_id,
      totalAmount,
      createdAt: row.created_at,
      integrityHmac: row.integrity_hmac
    }),
    status: row.status,
    note: row.note || '',
    createdAt: createdAtIso,
    items
  };
}

/**
 * [Thành viên A] Danh sách toàn bộ hóa đơn cho Admin (phân trang, lọc status, kiểm chứng HMAC).
 */
async function listAllOrders({ page = 1, limit = 20, status = '' }) {
  const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const rawLimit = Number.parseInt(limit, 10) || 20;
  const clampedLimit = Math.min(100, Math.max(1, rawLimit));
  const offset = (parsedPage - 1) * clampedLimit;

  const cleanStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
  if (cleanStatus && !VALID_ORDER_STATUSES.has(cleanStatus)) {
    throw createHttpError(400, 'Trạng thái đơn hàng lọc không hợp lệ (PENDING/CONFIRMED/COMPLETED/CANCELLED)');
  }

  const params = [];
  const whereClauses = [];
  if (cleanStatus) {
    params.push(cleanStatus);
    whereClauses.push(`status = $${params.length}`);
  }
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM orders ${whereSql}`,
    params
  );
  const totalItems = countResult.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / clampedLimit));

  const dataParams = [...params, clampedLimit, offset];
  const ordersResult = await query(
    `SELECT order_id, user_id, customer_name, customer_email, payment_method,
            total_amount, integrity_hmac, status, note, created_at
     FROM orders
     ${whereSql}
     ORDER BY created_at DESC, order_id DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  const orderIds = ordersResult.rows.map((r) => r.order_id);
  const itemsByOrderId = new Map();

  if (orderIds.length > 0) {
    const detailsResult = await query(
      `SELECT od.order_detail_id, od.order_id, od.product_id, od.quantity, od.unit_price,
              p.product_name
       FROM order_details od
       LEFT JOIN products p ON p.product_id = od.product_id
       WHERE od.order_id = ANY($1::int[])
       ORDER BY od.order_detail_id ASC`,
      [orderIds]
    );

    for (const d of detailsResult.rows) {
      if (!itemsByOrderId.has(d.order_id)) {
        itemsByOrderId.set(d.order_id, []);
      }
      itemsByOrderId.get(d.order_id).push({
        orderDetailId: d.order_detail_id,
        ProductID: d.product_id,
        ProductName: d.product_name || null,
        Quantity: Number(d.quantity),
        UnitPrice: Number(d.unit_price)
      });
    }
  }

  const items = ordersResult.rows.map((row) =>
    mapOrderRow(row, itemsByOrderId.get(row.order_id) || [])
  );

  return {
    items,
    pagination: {
      page: parsedPage,
      limit: clampedLimit,
      totalItems,
      totalPages
    }
  };
}

/**
 * [Thành viên A] Admin duyệt / cập nhật trạng thái đơn hàng.
 * Nếu chuyển sang CANCELLED từ trạng thái khác: hoàn tồn kho & giải phóng license_keys.
 */
async function updateOrderStatus({ orderId, status, user, req }) {
  const parsedOrderId = parsePositiveInt(orderId, 'OrderID');
  const nextStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';

  if (!VALID_ORDER_STATUSES.has(nextStatus)) {
    throw createHttpError(
      400,
      'Trạng thái đơn hàng phải thuộc: PENDING, CONFIRMED, COMPLETED hoặc CANCELLED'
    );
  }

  const { updatedOrder, previousStatus } = await withTransaction(async (client) => {
    const existingResult = await client.query(
      `SELECT order_id, user_id, customer_name, customer_email, payment_method,
              total_amount, integrity_hmac, status, note, created_at
       FROM orders
       WHERE order_id = $1
       FOR UPDATE`,
      [parsedOrderId]
    );

    if (existingResult.rows.length === 0) {
      throw createHttpError(404, `Không tìm thấy đơn hàng ID ${parsedOrderId}`);
    }

    const existing = existingResult.rows[0];

    const updateResult = await client.query(
      `UPDATE orders
       SET status = $1
       WHERE order_id = $2
       RETURNING order_id, user_id, customer_name, customer_email, payment_method,
                 total_amount, integrity_hmac, status, note, created_at`,
      [nextStatus, parsedOrderId]
    );

    if (nextStatus === 'CANCELLED' && existing.status !== 'CANCELLED') {
      const detailsResult = await client.query(
        `SELECT product_id, quantity
         FROM order_details
         WHERE order_id = $1`,
        [parsedOrderId]
      );

      for (const detail of detailsResult.rows) {
        await client.query(
          `UPDATE products
           SET quantity = quantity + $1
           WHERE product_id = $2`,
          [detail.quantity, detail.product_id]
        );
      }

      await client.query(
        `UPDATE license_keys
         SET status = 'AVAILABLE',
             order_id = NULL,
             owner_user_id = NULL,
             assigned_at = NULL
         WHERE order_id = $1 AND status = 'ASSIGNED'`,
        [parsedOrderId]
      );
    }

    return {
      updatedOrder: updateResult.rows[0],
      previousStatus: existing.status
    };
  });

  await writeAuditLog({
    userId: user?.userId || null,
    action: 'ORDER_STATUS_UPDATED',
    resource: `order:${parsedOrderId}`,
    req,
    severity: 'INFO',
    metadata: {
      orderId: parsedOrderId,
      previousStatus,
      newStatus: nextStatus
    }
  });

  return mapOrderRow(updatedOrder);
}

module.exports = {
  listAllOrders,
  updateOrderStatus
};
