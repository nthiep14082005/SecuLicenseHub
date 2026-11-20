# DEV_RULES.md — Quy chuẩn Kỹ thuật, Luật Bảo mật & Ranh giới Nhóm A – B

> **Nguyên tắc vàng:** Thành viên A, Thành viên B và trợ lý AI sinh code **luôn tuân thủ tuyệt đối** file này để dùng chung **1 mã nguồn duy nhất** cho cả 2 môn: *Ngôn ngữ kịch bản* và *Phát triển phần mềm web an toàn*.

---

## 1. Thông số Cố định & Ranh giới Sở hữu Thư mục

- **Dự án:** **SecuLicense Hub** — Nền tảng Quản lý & Phân phối Bản quyền Phần mềm, Tài nguyên Số An toàn tích hợp AI.
- **Stack bắt buộc:**
  - **Backend:** Node.js 20+ (CommonJS `require`/`module.exports`), Express.js, `pg`, Swagger UI `/docs`.
  - **Database:** PostgreSQL 16 (Docker local hoặc Neon Cloud SSL; định nghĩa cứng tại `specs/init.sql`).
  - **Frontend:** React 18 + Vite + Tailwind CSS + React Router + Axios (`withCredentials: true`).
  - **Search & AI:** Meilisearch (`meilisearch`), Gemini API (`@google/genai`), Web Speech API (`vi-VN`).

### Ranh giới Sở hữu Thư mục (Không sửa chéo gây xung đột Git)

| Phạm vi | Thành viên A (`feat/a-core-admin-hardening`) | Thành viên B (`feat/b-portal-crypto-ai`) |
| :--- | :--- | :--- |
| **Backend Core & Middleware** | `server/src/db/pool.js`, `server/src/middlewares/*` | `server/src/db/seed.js` |
| **Backend Modules** | `modules/auth/*`, `modules/products/*`, `modules/ocr/*`, phần duyệt hóa đơn `modules/orders/*` (`GET /`, `PATCH /:id/status`), phần admin `modules/contacts/*` (`GET /`, `PATCH /:id/resolve`), phần xem nhật ký `modules/security/*` (`GET /audit-logs`, `GET /summary`) | `modules/licenses/*`, `modules/search/*`, `modules/chatbot/*`, phần đặt đơn `modules/orders/*` (`POST /`, `GET /my`, `GET /:id/verify-integrity`), phần gửi liên hệ `modules/contacts/*` (`POST /`), phần AI phân tích log `modules/security/*` (`POST /api/ai/analyze-logs`) |
| **Frontend Layouts & Pages** | `layouts/AdminLayout.jsx`, `pages/auth/*`, `pages/admin/AdminProductsPage.jsx`, `pages/admin/AdminOrdersPage.jsx`, phần bảng `audit_logs` trong `AdminSecurityPage.jsx`, `components/admin/*` | `layouts/PortalLayout.jsx`, `pages/portal/*`, panel AI Log Analyzer trong `AdminSecurityPage.jsx`, `components/portal/*` |
| **Thư mục khóa chung** | `specs/*`, `guides/*`, `README.md`, `DEV_RULES.md`, `WORKPLAN.md`, `docker-compose.yml`, `.env.example`, `server/src/utils/*`, `server/src/config/*`, `server/src/index.js` — chỉ sửa khi cả A và B cùng thống nhất. |

---

## 2. Luật Ánh xạ Dữ liệu PostgreSQL ↔ JSON API

### 2.1. Bảng `products` (Khóa cứng 10 trường PascalCase theo đề bài)

Trong PostgreSQL sử dụng `snake_case`; khi trả JSON ở REST API, mọi endpoint `/api/products` và `/api/search` **bắt buộc** dùng hàm `mapProductRow()` trả về đúng **10 key PascalCase**:

| JSON API Key (Bắt buộc) | Cột PostgreSQL | Kiểu dữ liệu | Quy tắc nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `ProductID` | `product_id` | `SERIAL PRIMARY KEY` | Khóa chính tự tăng |
| `ProductName` | `product_name` | `VARCHAR(200) NOT NULL` | Tên gói bản quyền / tài nguyên số |
| `PathImage` | `path_image` | `TEXT` | URL hoặc `/uploads/products/<uuid>.<ext>` |
| `ProductType` | `product_type` | `VARCHAR(80) NOT NULL` | `License Key`, `Source Code`, `Plugin & UI Kit`, `API Quota`, `E-Book Kỹ thuật` |
| `Quantity` | `quantity` | `INTEGER NOT NULL >= 0` | Số lượng tồn kho (license/suất còn lại) |
| `Unit` | `unit` | `VARCHAR(40) NOT NULL` | `Key`, `Gói`, `License`, `Quota`, `Tài liệu` |
| `Price` | `price` | `NUMERIC(12,0) NOT NULL >= 0` | Đơn giá VNĐ — **bắt buộc ép kiểu `Number()` trong JSON** |
| `Description` | `description` | `TEXT` | Mô tả tính năng, thời hạn bản quyền, cấu hình yêu cầu |
| `CreateDate` | `create_date` | `TIMESTAMPTZ` | ISO-8601 timestamp |
| `UpdateDate` | `update_date` | `TIMESTAMPTZ` | Tự cập nhật qua trigger `trg_products_update_date` |

> **Lưu ý mở rộng an toàn:** Hai cột tùy chọn `file_sha256` và `asset_filename` trong bảng `products` phục vụ kiểm chứng toàn vẹn tệp số & Signed URL tải file; chỉ trả riêng trong API chi tiết/kho tài nguyên khi cần, **không làm biến dạng** 10 trường chuẩn khi Export/Import bảng `Product`.

### 2.2. Chuẩn Response Envelope

```json
{
  "success": true,
  "message": "Thông báo ngắn gọn bằng tiếng Việt",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalItems": 45,
    "totalPages": 4
  }
}
```
Khi có lỗi (`400`, `401`, `403`, `404`, `423`, `429`, `500`, `501`):
```json
{
  "success": false,
  "message": "Mô tả lỗi rõ ràng bằng tiếng Việt",
  "errors": []
}
```

---

## 3. Luật Bảo mật Web Bắt buộc (*Web Security Basics — Shweta Bhasin, 2003* & OWASP)

1. **Chống SQL Injection (SQLi):**
   - Tuyệt đối không nối chuỗi biến người dùng vào SQL. Dùng 100% Parameterized Query (`$1, $2, ...`) qua `pool.query()`.
   - Với `ORDER BY` hoặc tên cột động, bắt buộc ánh xạ qua whitelist `Map` / `Set`.
2. **Xác thực, Mật khẩu, Cookie Session & 2FA TOTP:**
   - Băm mật khẩu bằng `bcryptjs` với `saltRounds >= 10`. Chính sách mật khẩu tối thiểu 8 ký tự gồm chữ hoa, chữ thường và số.
   - JWT lưu trong **`HttpOnly`**, **`SameSite=Strict`**, **`Secure`** (bật khi `COOKIE_SECURE=true`) Cookie; không lưu JWT vào `localStorage`. Swagger UI `/docs` hỗ trợ fallback header `Authorization: Bearer <token>` khi test API.
   - Tài khoản `ADMIN` bắt buộc hỗ trợ xác thực 2 bước **TOTP (`otplib` + `qrcode`)**.
   - Chống Brute-force: áp dụng `authLimiter` (tối đa 10 req / 15 phút) + cộng dồn `failed_login_attempts`; sai 5 lần liên tiếp khóa tài khoản **15 phút** (`locked_until`) và ghi `audit_logs`.
3. **Mã hóa Bản quyền Lưu trữ (`AES-256-GCM`):**
   - Cột `license_keys.encrypted_key` **không bao giờ lưu plaintext**. Dùng `encryptAesGcm()` trong `server/src/utils/crypto.util.js` để tạo và lưu đủ bộ `{ encrypted_key, iv, auth_tag }`.
   - Khi khách hàng bấm *Xem License Key*, `decryptAesGcm()` chỉ chạy sau khi xác minh đúng `owner_user_id === req.user.userId` và ghi sự kiện `LICENSE_REVEALED` vào `audit_logs`.
4. **Chống Sửa giá & Giả mạo Hóa đơn (`HMAC-SHA256`):**
   - Không tin tưởng `totalAmount` hay `unitPrice` từ trình duyệt. Giá lấy trực tiếp từ `products.price` trong PostgreSQL Transaction.
   - Ngay khi tạo đơn hàng, gọi `signOrderHmac()` tính chữ ký `orders.integrity_hmac` từ `(orderId, userId, totalAmount, createdAt)`. Admin có thể kiểm chứng tính toàn vẹn hóa đơn bằng `verifyOrderHmac()`.
5. **Tải Tài nguyên Số qua `Signed URL` hết hạn 300 giây:**
   - Không expose thư mục `server/uploads/assets/` qua `express.static`.
   - Mọi yêu cầu tải tệp sản phẩm phải cấp token ký HMAC hết hạn sau **300 giây** (`createSignedDownloadToken`), xác thực bằng `verifySignedDownloadToken()` kèm `assertNoPathTraversal()` trước khi stream file.
6. **Chống XXE & Excel Formula Injection (Import/Export):**
   - XML Parser (`fast-xml-parser`) phải đặt `processEntities: false`, và từ chối chuỗi XML chứa `<!DOCTYPE` hoặc `<!ENTITY` ngay trước khi parse (chống XML External Entity — XXE). Giới hạn file tối đa 5 MB.
   - Khi Export `.xlsx`, mọi giá trị chuỗi bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r` phải qua `sanitizeExcelCell()` (thêm dấu `'` phía trước) để vô hiệu hóa Excel Formula Injection.
7. **Chống Upload Độc hại & Path Traversal:**
   - Không tin phần mở rộng `.jpg`/`.png` hay `Content-Type` do client gửi. Dùng `validateImageMagicBytes(buffer)` kiểm tra 4–12 byte đầu thực tế (chỉ cho phép PNG, JPEG, WEBP) và đặt lại tên tệp bằng `crypto.randomUUID()`.
8. **Chống XSS, CSRF & IDOR:**
   - Bật `helmet` với Content-Security-Policy (CSP), chạy `sanitizeInput` (`xss`) trên input, và `csrfOriginGuard` kiểm tra `Origin` trên các request thay đổi trạng thái (`POST`/`PUT`/`PATCH`/`DELETE`).
   - Mọi API xem/sửa/tải đơn hàng hoặc license key cá nhân bắt buộc kiểm tra điều kiện `WHERE user_id = $1` / `owner_user_id = $1` để chặn **IDOR**.
9. **Nhật ký Chống Chối bỏ (`audit_logs`):**
   - Mọi hành vi nhạy cảm (đăng nhập thành công/thất bại, khóa tài khoản, đổi trạng thái 2FA, CRUD sản phẩm, export, tạo/duyệt đơn, giải mã key, tải file, truy cập trái phép 403, chặn XSS/XXE/Rate-limit) đều gọi `writeAuditLog()`.

---

## 4. Luật Kỹ thuật cho 11 Chức năng `Product` (Thành viên A)

1. **Phân trang:** `limit` mặc định `12` (chấp nhận `10`–`15`), dùng `LIMIT` / `OFFSET` kèm `COUNT(*)`.
2. **Xóa nhiều & Sao chép nhiều:** Chạy trong `withTransaction()`. Bản sao đặt tên `<ProductName> (Bản sao)` với `create_date = NOW()`, `update_date = NOW()`.
3. **Import / Export 3 định dạng (`.xlsx`, `.json`, `.xml`):** Giữ đủ 10 cột chuẩn `ProductID..UpdateDate`. Validate từng dòng (`ProductName`, `ProductType`, `Unit` không rỗng; `Price >= 0`, `Quantity >= 0`); trả về danh sách dòng lỗi (`400`) thay vì crash server.
4. **Ẩn/Hiện cột Table:** Lưu cấu hình vào `localStorage` với key `seculicense_admin_visible_columns`. Không cho ẩn đồng thời cột checkbox và `ProductName`.
5. **Phím tắt CRUD:** Gọi `e.preventDefault()` cho `Alt + N / S / E / V / D / C / I / X / H` và `Esc`. Khi focus trong `<input>` / `<textarea>`, bỏ qua phím tắt điều hướng ngoài, chỉ giữ `Alt + S` và `Esc`.
6. **Đồng bộ Meilisearch:** Sau Thêm/Sửa/Xóa/Sao chép/Import, gọi `syncProductsToMeilisearch()` trong `try/catch` để lỗi Meilisearch không rollback PostgreSQL.
7. **AI OCR (`POST /api/ai/ocr-product`):** Ép Gemini Vision trả JSON gồm `{ ProductName, ProductType, Quantity, Unit, Price, Description }` (`null` nếu ảnh không có thông tin, không bịa số liệu).

---

## 5. Luật Kỹ thuật cho Portal, Crypto & AI (Thành viên B)

1. **Đặt hàng & Cấp License Nguyên tử (`POST /api/orders`):**
   - Chạy trong `withTransaction()`, khóa dòng `SELECT quantity, price FROM products WHERE product_id = $1 FOR UPDATE`.
   - Khóa và gán các `license_keys` đang `AVAILABLE` sang `ASSIGNED` (`order_id`, `owner_user_id`, `assigned_at = NOW()`).
   - Tính `integrity_hmac = signOrderHmac(...)`.
   - Sinh URL QR động **VietQR**: `https://img.vietqr.io/image/<BANK>-<ACCOUNT>-compact2.png?amount=<TOTAL>&addInfo=SECULICENSE_<ORDER_ID>`.
2. **Meilisearch (`GET /api/search`):** Index `seculicense_products`; `searchableAttributes: ["ProductName", "ProductType", "Description"]`; `filterableAttributes: ["ProductType", "Price", "Quantity"]`; `sortableAttributes: ["Price", "CreateDate"]`.
3. **Voice Search (Web Speech API):** `window.SpeechRecognition || window.webkitSpeechRecognition`, `lang = 'vi-VN'`, có thông báo lịch sự nếu trình duyệt không hỗ trợ.
4. **Chatbot AI Tư vấn (`POST /api/ai/chat`):** Truy vấn sản phẩm còn hàng (`quantity > 0`) từ PostgreSQL làm ngữ cảnh, ép JSON `{ "reply": "...", "recommendedProductIds": [...] }`.
5. **AI Security Log Analyzer (`POST /api/ai/analyze-logs`):** Đọc N bản ghi `audit_logs` gần nhất, tóm tắt thành `{ riskLevel, summary, threats, recommendedActions }` hiển thị trên `AdminSecurityPage`.

---

## 6. Quy tắc Git & Điểm dừng Cứng cho AI

- **Nhánh chính:** `main` (chỉ merge code đã tự kiểm thử và không lỗi bảo mật).
- **Nhánh Thành viên A:** `feat/a-core-admin-hardening`.
- **Nhánh Thành viên B:** `feat/b-portal-crypto-ai`.
- **Điểm dừng cứng:** Tuyệt đối không sửa `specs/init.sql`, không đổi tên 10 key bảng `Product`, không sửa chéo thư mục của người còn lại, và **không bao giờ commit `.env`, API key hoặc tệp trong `server/uploads/`**.
