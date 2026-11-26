// Run: node --test src/modules/orders/orders.integration.test.js (from server/).
// Uses a disposable PostgreSQL 16 Docker container; never uses the project's DB.
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const containerName = `seculicense-orders-test-${randomUUID()}`;
let pool;
let server;
let baseUrl;
let jwt;
let cryptoHelpers;
let containerStarted = false;

function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) throw new Error('Docker test setup failed. Check Docker Desktop and postgres:16 availability.');
  return result.stdout.trim();
}

before(async () => {
  const password = randomBytes(24).toString('hex');
  docker(['run', '--detach', '--rm', '--name', containerName,
    '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data',
    '--env', `POSTGRES_PASSWORD=${password}`, '--env', 'POSTGRES_DB=seculicense_orders_test', 'postgres:16']);
  containerStarted = true;
  const binding = docker(['port', containerName, '5432/tcp']);
  assert.match(binding, /^127\.0\.0\.1:\d+$/);
  process.env.DATABASE_URL = `postgresql://postgres:${password}@${binding}/seculicense_orders_test`;
  process.env.NODE_ENV = 'test';
  process.env.PGSSLMODE = 'disable';
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.HMAC_ORDER_SECRET = randomBytes(32).toString('hex');
  process.env.AES_256_SECRET_HEX = randomBytes(32).toString('hex');
  process.env.SIGNED_URL_SECRET = randomBytes(32).toString('hex');
  process.env.COOKIE_NAME = 'orders_test_session';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.VIETQR_BANK_ID = 'MB';
  process.env.VIETQR_ACCOUNT_NO = '0000000000';
  process.env.VIETQR_ACCOUNT_NAME = 'TEST ONLY';
  ({ pool } = require('../../db/pool'));
  jwt = require('jsonwebtoken');
  cryptoHelpers = require('../../utils/crypto.util');
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { await pool.query('SELECT 1'); ready = true; break; } catch { await delay(500); }
  }
  assert.equal(ready, true, 'Temporary PostgreSQL must be ready');
  await pool.query(readFileSync(path.resolve(__dirname, '../../../../specs/init.sql'), 'utf8'));
  const app = require('../../index');
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/orders`;
}, { timeout: 180000 });

after(async () => {
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
  } finally {
    if (containerStarted) docker(['rm', '--force', containerName]);
  }
});

async function product({ quantity = 3, keyCount = quantity, price = 125000 } = {}) {
  const result = await pool.query(
    `INSERT INTO products (product_name, product_type, quantity, unit, price)
     VALUES ('Test license', 'License Key', $1, 'Key', $2) RETURNING product_id`, [quantity, price]
  );
  const id = result.rows[0].product_id;
  for (let index = 0; index < keyCount; index += 1) {
    const encrypted = cryptoHelpers.encryptAesGcm(`TEST-${randomUUID()}`);
    await pool.query(
      'INSERT INTO license_keys (product_id, encrypted_key, iv, auth_tag) VALUES ($1, $2, $3, $4)',
      [id, encrypted.encryptedKey, encrypted.iv, encrypted.authTag]
    );
  }
  return id;
}

beforeEach(async () => {
  await pool.query('TRUNCATE users, products, orders, order_details, license_keys, contacts, audit_logs RESTART IDENTITY CASCADE');
  for (const [name, role] of [['Owner', 'CUSTOMER'], ['Other', 'CUSTOMER'], ['Admin', 'ADMIN']]) {
    await pool.query('INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [name, `${name.toLowerCase()}@example.test`, randomBytes(32).toString('hex'), role]);
  }
  await product();
});

function body(items = [{ ProductID: 1, Quantity: 1 }]) {
  return { paymentMethod: 'VIETQR', items };
}

async function request(route = '', { method = 'GET', payload, userId = 1, role = 'CUSTOMER', cookie = false, origin } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId !== null) {
    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '5m' });
    if (cookie) headers.Cookie = `${process.env.COOKIE_NAME}=${token}`;
    else headers.Authorization = `Bearer ${token}`;
  }
  if (origin) headers.Origin = origin;
  const response = await fetch(baseUrl + route, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload) });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

async function place(payload = body(), options = {}) {
  return request('', { method: 'POST', payload, ...options });
}

test('requires authentication on all three customer routes', async () => {
  for (const [route, method, payload] of [['', 'POST', body()], ['/my', 'GET'], ['/1/verify-integrity', 'GET']]) {
    assert.equal((await request(route, { method, payload, userId: null })).status, 401);
  }
  assert.equal((await place(body(), { userId: '1' })).status, 401);
});

test('ignores browser prices and owner, assigns encrypted keys, signs HMAC and builds VietQR', async () => {
  const response = await place({ ...body([{ ProductID: 1, Quantity: 2, unitPrice: 1 }]), totalAmount: 1, userId: 2 }, { cookie: true });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const order = response.body.data;
  assert.equal(order.totalAmount, 250000);
  assert.equal(order.status, 'PENDING');
  assert.match(order.integrityHmac, /^[a-f0-9]{64}$/);
  const qr = new URL(order.vietqrUrl);
  assert.equal(qr.origin, 'https://img.vietqr.io');
  assert.equal(qr.searchParams.get('amount'), '250000');
  assert.equal(qr.searchParams.get('addInfo'), `SECULICENSE_${order.orderId}`);
  assert.equal((await request(`/${order.orderId}/verify-integrity`)).body.data.valid, true);
  assert.equal((await pool.query('SELECT quantity FROM products WHERE product_id = 1')).rows[0].quantity, 1);
  const keys = (await pool.query("SELECT owner_user_id, order_id, encrypted_key, assigned_at FROM license_keys WHERE status = 'ASSIGNED'")).rows;
  assert.equal(keys.length, 2);
  assert.ok(keys.every((key) => key.owner_user_id === 1 && key.order_id === order.orderId && key.assigned_at));
  assert.ok(keys.every((key) => !JSON.stringify(response.body).includes(key.encrypted_key)));
  assert.equal((await pool.query("SELECT COUNT(*) FROM audit_logs WHERE action = 'ORDER_CREATED'")).rows[0].count, '1');
});

test('validates input, duplicate quantities and amount overflow before persisting', async () => {
  const invalid = [
    null, {}, { ...body(), paymentMethod: 'CASH' }, body([]),
    body([{ ProductID: '1', Quantity: 1 }]), body([{ ProductID: 1, Quantity: 0 }]),
    body([{ ProductID: 1, Quantity: 1.5 }]), body([{ ProductID: 1, Quantity: -1 }]),
    body([{ ProductID: 2147483648, Quantity: 1 }]), body([null]),
    { ...body(), note: {} }, { ...body(), note: 'x'.repeat(2001) },
    body(Array.from({ length: 101 }, () => ({ ProductID: 1, Quantity: 1 }))),
    body([{ ProductID: 1, Quantity: 2 }, { ProductID: 1, Quantity: 2 }]),
    body([{ ProductID: 1, Quantity: 2147483647 }, { ProductID: 1, Quantity: 1 }])
  ];
  // Express rejects JSON null before the controller; other cases exercise module validation.
  for (const payload of invalid) assert.equal((await place(payload)).status, 400);
  const expensiveId = await product({ price: 999999999999, quantity: 2 });
  assert.equal((await place(body([{ ProductID: expensiveId, Quantity: 2 }]))).status, 400);
  assert.equal((await pool.query('SELECT COUNT(*) FROM orders')).rows[0].count, '0');
});

test('merges duplicate product lines without allocating the same key twice', async () => {
  const response = await place(body([{ ProductID: 1, Quantity: 1 }, { ProductID: 1, Quantity: 2 }]));
  assert.equal(response.status, 201);
  assert.equal(response.body.data.items.length, 1);
  assert.equal(response.body.data.totalAmount, 375000);
  assert.equal((await pool.query("SELECT COUNT(*) FROM license_keys WHERE status = 'ASSIGNED'")).rows[0].count, '3');
});

test('missing products, stock or license pool leave the whole cart unchanged', async () => {
  const missingKeys = await product({ quantity: 2, keyCount: 0 });
  for (const items of [
    [{ ProductID: 1, Quantity: 1 }, { ProductID: 999, Quantity: 1 }],
    [{ ProductID: 1, Quantity: 4 }],
    [{ ProductID: 1, Quantity: 1 }, { ProductID: missingKeys, Quantity: 1 }]
  ]) assert.equal((await place(body(items))).status, 400);
  assert.equal((await pool.query('SELECT quantity FROM products WHERE product_id = 1')).rows[0].quantity, 3);
  assert.equal((await pool.query('SELECT COUNT(*) FROM orders')).rows[0].count, '0');
  assert.equal((await pool.query("SELECT COUNT(*) FROM license_keys WHERE status = 'ASSIGNED'")).rows[0].count, '0');
});

test('database failure mid-write rolls back orders, details, stock, keys and hides internals', async () => {
  await pool.query(`CREATE FUNCTION fail_test_assignment() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'PRIVATE_TEST_SQL_ERROR'; END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER test_assignment_failure BEFORE UPDATE ON license_keys FOR EACH ROW EXECUTE FUNCTION fail_test_assignment()`);
  try {
    const result = await place();
    assert.equal(result.status, 500);
    assert.ok(!JSON.stringify(result.body).includes('PRIVATE_TEST_SQL_ERROR'));
    assert.deepEqual(result.body.errors, []);
    assert.equal((await pool.query('SELECT COUNT(*) FROM orders')).rows[0].count, '0');
    assert.equal((await pool.query('SELECT COUNT(*) FROM order_details')).rows[0].count, '0');
    assert.equal((await pool.query('SELECT quantity FROM products WHERE product_id = 1')).rows[0].quantity, 3);
    assert.equal((await pool.query("SELECT COUNT(*) FROM license_keys WHERE status = 'ASSIGNED'")).rows[0].count, '0');
    assert.equal((await pool.query("SELECT COUNT(*) FROM audit_logs WHERE action = 'ORDER_CREATED'")).rows[0].count, '0');
  } finally {
    await pool.query('DROP TRIGGER test_assignment_failure ON license_keys; DROP FUNCTION fail_test_assignment()');
  }
});

test('concurrent purchases cannot oversell or double-assign licenses', async () => {
  const results = await Promise.all([place(body([{ ProductID: 1, Quantity: 2 }])), place(body([{ ProductID: 1, Quantity: 2 }]), { userId: 2 })]);
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 400]);
  assert.equal((await pool.query('SELECT quantity FROM products WHERE product_id = 1')).rows[0].quantity, 1);
  assert.equal((await pool.query('SELECT COUNT(*) FROM orders')).rows[0].count, '1');
  assert.equal((await pool.query("SELECT COUNT(*) FROM license_keys WHERE status = 'ASSIGNED'")).rows[0].count, '2');
});

test('opposite cart order completes without deadlock', async () => {
  const second = await product();
  const firstCart = [{ ProductID: 1, Quantity: 1 }, { ProductID: second, Quantity: 1 }];
  const results = await Promise.all([place(body(firstCart)), place(body([...firstCart].reverse()), { userId: 2 })]);
  assert.deepEqual(results.map((result) => result.status), [201, 201]);
});

test('history is owner-scoped and paginated with details at the purchase price', async () => {
  const first = await place();
  await place({ ...body(), paymentMethod: 'BANK_TRANSFER' }, { userId: 2 });
  await place();
  await pool.query('UPDATE products SET price = 999 WHERE product_id = 1');
  const response = await request('/my?page=2&limit=1');
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].orderId, first.body.data.orderId);
  assert.equal(response.body.data[0].items[0].unitPrice, 125000);
  assert.deepEqual(response.body.pagination, { page: 2, limit: 1, totalItems: 2, totalPages: 2 });
  for (const queryString of ['page=0', 'limit=51', 'page=1%20OR%201=1', 'page[]=1']) {
    assert.equal((await request(`/my?${queryString}`)).status, 400);
  }
});

test('only owner or admin can verify; tampered DB amount fails HMAC with audit', async () => {
  const created = await place();
  const id = created.body.data.orderId;
  assert.equal((await request(`/${id}/verify-integrity`, { userId: 2 })).status, 403);
  assert.equal((await request(`/${id}/verify-integrity`, { userId: 3, role: 'ADMIN' })).body.data.valid, true);
  assert.equal((await request('/999/verify-integrity')).status, 404);
  assert.equal((await request('/1abc/verify-integrity')).status, 400);
  await pool.query('UPDATE orders SET total_amount = 1000 WHERE order_id = $1', [id]);
  assert.equal((await request(`/${id}/verify-integrity`)).body.data.valid, false);
  const logs = (await pool.query("SELECT action, severity FROM audit_logs WHERE severity = 'CRITICAL' ORDER BY log_id")).rows;
  assert.deepEqual(logs.map((log) => log.action), ['IDOR_ORDER_ACCESS_BLOCKED', 'ORDER_INTEGRITY_FAILED']);
});

test('foreign origins are blocked and stored notes are sanitized without SQL execution', async () => {
  assert.equal((await place(body(), { origin: 'https://attacker.example' })).status, 403);
  const note = "<script>alert(1)</script> '; DROP TABLE orders; --";
  const response = await place({ ...body(), note });
  assert.equal(response.status, 201);
  const stored = (await pool.query('SELECT note FROM orders')).rows[0].note;
  assert.ok(!stored.includes('<script>'));
  assert.ok(stored.includes('DROP TABLE orders'));
});
