-- ============================================================================
-- SecuLicense Hub — Script Khởi tạo CSDL PostgreSQL 16 (7 bảng chuẩn)
-- Dùng chung cho 2 môn: Ngôn ngữ kịch bản & Phát triển phần mềm web an toàn
-- Hỗ trợ chạy tự động qua Docker Compose hoặc paste vào Neon SQL Editor
-- ============================================================================

-- 1. Bảng người dùng (Auth, Phân quyền ADMIN/CUSTOMER, 2FA TOTP & Khóa Brute-force)
CREATE TABLE IF NOT EXISTS users (
    user_id               SERIAL PRIMARY KEY,
    full_name             VARCHAR(120) NOT NULL,
    email                 VARCHAR(150) NOT NULL UNIQUE,
    password_hash         TEXT NOT NULL,
    role                  VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'
                          CHECK (role IN ('ADMIN', 'CUSTOMER')),
    totp_secret           VARCHAR(128),
    is_2fa_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked_until          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- 2. Bảng sản phẩm tài nguyên số / gói bản quyền
--    Ánh xạ chuẩn 10 trường bắt buộc của bảng Product (PascalCase trên REST API):
--    ProductID, ProductName, PathImage, ProductType, Quantity,
--    Unit, Price, Description, CreateDate, UpdateDate
--    + 2 cột metadata tùy chọn (file_sha256, asset_filename) phục vụ kiểm chứng toàn vẹn & Signed URL
CREATE TABLE IF NOT EXISTS products (
    product_id     SERIAL PRIMARY KEY,
    product_name   VARCHAR(200) NOT NULL,
    path_image     TEXT,
    product_type   VARCHAR(80) NOT NULL,
    quantity       INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit           VARCHAR(40) NOT NULL,
    price          NUMERIC(12, 0) NOT NULL CHECK (price >= 0),
    description    TEXT,
    file_sha256    VARCHAR(64),
    asset_filename VARCHAR(255),
    create_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    update_date    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger tự động cập nhật update_date mỗi khi bản ghi products được chỉnh sửa
CREATE OR REPLACE FUNCTION set_product_update_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.update_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_update_date ON products;
CREATE TRIGGER trg_products_update_date
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_product_update_date();

CREATE INDEX IF NOT EXISTS idx_products_type ON products (product_type);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_create_date ON products (create_date DESC);

-- 3. Bảng hóa đơn / đơn hàng (Tích hợp VietQR & chữ ký chống sửa giá HMAC-SHA256)
CREATE TABLE IF NOT EXISTS orders (
    order_id        SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users (user_id) ON DELETE SET NULL,
    customer_name   VARCHAR(120) NOT NULL,
    customer_email  VARCHAR(150) NOT NULL,
    payment_method  VARCHAR(20) NOT NULL DEFAULT 'VIETQR'
                    CHECK (payment_method IN ('VIETQR', 'BANK_TRANSFER')),
    total_amount    NUMERIC(12, 0) NOT NULL CHECK (total_amount >= 0),
    integrity_hmac  VARCHAR(128) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- 4. Bảng chi tiết hóa đơn
CREATE TABLE IF NOT EXISTS order_details (
    order_detail_id SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products (product_id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12, 0) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details (order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_product_id ON order_details (product_id);

-- 5. Bảng kho License Key mã hóa AES-256-GCM (chống rò rỉ dữ liệu & chống IDOR)
CREATE TABLE IF NOT EXISTS license_keys (
    license_id    SERIAL PRIMARY KEY,
    product_id    INTEGER NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
    order_id      INTEGER REFERENCES orders (order_id) ON DELETE SET NULL,
    owner_user_id INTEGER REFERENCES users (user_id) ON DELETE SET NULL,
    encrypted_key TEXT NOT NULL,
    iv            VARCHAR(64) NOT NULL,
    auth_tag      VARCHAR(64) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
                  CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'REVOKED')),
    assigned_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_keys_product_status ON license_keys (product_id, status);
CREATE INDEX IF NOT EXISTS idx_license_keys_owner ON license_keys (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_order ON license_keys (order_id);

-- 6. Bảng liên hệ & hỗ trợ khách hàng (chống Stored XSS)
CREATE TABLE IF NOT EXISTS contacts (
    contact_id  SERIAL PRIMARY KEY,
    full_name   VARCHAR(120) NOT NULL,
    email       VARCHAR(150) NOT NULL,
    subject     VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'NEW'
                CHECK (status IN ('NEW', 'RESOLVED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts (status);

-- 7. Bảng nhật ký kiểm toán & phát hiện xâm nhập (Non-repudiation & AI Log Analyzer)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id      BIGSERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users (user_id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(150) NOT NULL,
    ip_address  VARCHAR(64),
    user_agent  TEXT,
    severity    VARCHAR(20) NOT NULL DEFAULT 'INFO'
                CHECK (severity IN ('INFO', 'WARN', 'HIGH', 'CRITICAL')),
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
