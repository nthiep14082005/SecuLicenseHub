# GUIDE_FOR_A.md — Cẩm nang Thực chiến cho Thành viên A

> **Vai trò:** Backend Core, Auth/Session + 2FA TOTP, Quản trị `Product` (11 chức năng + chống SQLi/XXE/Formula Injection/Upload độc hại), AI OCR & Audit Logs.
> **Nhánh Git riêng:** `feat/a-core-admin-hardening`

---

## 1. Phạm vi Thư mục được phép Sửa

### Backend (`server/`)
- `server/src/middlewares/*` (`auth.middleware.js`, `security.middleware.js`, `upload.middleware.js`)
- `server/src/modules/auth/*`
- `server/src/modules/products/*`
- `server/src/modules/ocr/*`
- Phần Admin của `server/src/modules/orders/*` (`listAllOrders`, `updateOrderStatus`)
- Phần Admin của `server/src/modules/contacts/*` (`listContacts`, `resolveContact`)
- Phần tra cứu nhật ký của `server/src/modules/security/*` (`listAuditLogs`, `getSecuritySummary`)

### Frontend (`client/`)
- `client/src/layouts/AdminLayout.jsx`
- `client/src/pages/auth/*` (`LoginPage.jsx`, `RegisterPage.jsx`)
- `client/src/pages/admin/AdminProductsPage.jsx`
- `client/src/pages/admin/AdminOrdersPage.jsx` (phần bảng & duyệt đơn)
- `client/src/pages/admin/AdminSecurityPage.jsx` (phần bảng `audit_logs`)
- `client/src/components/admin/*`
- `client/src/App.jsx` (khi bật `AdminGuard` kiểm tra `user?.role === 'ADMIN'`)

> **KHÔNG sửa chéo** `modules/{licenses,search,chatbot}`, `db/seed.js`, `pages/portal/*`, `components/portal/*`.

---

## 2. Hướng dẫn Từng bước Triển khai

### Bước 1: Auth An toàn (`HttpOnly Cookie` + Lockout + 2FA TOTP)
1. **`POST /api/auth/register`:**
   - Kiểm tra mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số.
   - Kiểm tra trùng email bằng Parameterized Query; nếu tồn tại trả HTTP `409`.
   - Băm mật khẩu bằng `bcryptjs.hash(password, 10)`. Mặc định `role = 'CUSTOMER'`.
   - Gọi `writeAuditLog({ action: 'USER_REGISTERED', resource: email, req, severity: 'INFO' })`.
2. **`POST /api/auth/login`:**
   - Kiểm tra `locked_until > NOW()`: nếu đang bị khóa trả HTTP `423 Locked` kèm số phút còn lại.
   - Nếu sai mật khẩu: tăng `failed_login_attempts`. Khi đạt **5 lần**, đặt `locked_until = NOW() + INTERVAL '15 minutes'`, ghi `writeAuditLog(..., severity: 'HIGH', action: 'ACCOUNT_LOCKED')`.
   - Nếu đúng mật khẩu: reset `failed_login_attempts = 0, locked_until = NULL`.
   - Nếu `is_2fa_enabled === true`: kiểm tra `totpCode` bằng `otplib` (`authenticator.verify({ token: totpCode, secret: user.totp_secret })`); nếu thiếu/sai trả `401` yêu cầu mã 2FA.
   - Ký JWT (`userId, email, role, fullName`) và gán vào Cookie:
     ```js
     res.cookie(env.auth.cookieName, token, {
       httpOnly: true,
       sameSite: 'strict',
       secure: env.auth.cookieSecure,
       maxAge: 24 * 60 * 60 * 1000
     });
     ```
   - Trả thêm `token` trong `data` nếu môi trường development để tiện test qua Swagger UI `/docs`.
3. **Bật Middleware bảo vệ:** Mở `requireAuth` và `requireRole('ADMIN')` trong các router quản trị (`products.routes.js`, `ocr.routes.js`, `orders.routes.js`, `contacts.routes.js`, `security.routes.js`).

### Bước 2: Module `Product` (10 Trường Chuẩn & 11 Chức năng + Hardening)
1. **Luôn dùng `mapProductRow(row)`** từ `server/src/db/pool.js` để đảm bảo đủ **10 key PascalCase** và `Price` là kiểu `Number`.
2. **Phân trang & Lọc (`GET /api/products`):**
   - Giới hạn `limit` từ `10` đến `15` (mặc định `12`).
   - Dùng `$1, $2` cho `product_type` và `ILIKE` tìm kiếm theo tên; chạy thêm `SELECT COUNT(*)` lấy `totalItems`.
3. **Thêm, Sửa, Xem chi tiết, Xóa 1, Xóa nhiều, Sao chép 1, Sao chép nhiều:**
   - `bulkDeleteProducts`, `bulkCloneProducts`: chạy trong `withTransaction(async (client) => ...)`.
   - Bản sao giữ nguyên giá trị và thêm hậu tố `" (Bản sao)"` vào `product_name`.
   - Sau mọi thao tác thay đổi dữ liệu, gọi `await syncProductsToMeilisearch()` bọc trong `try/catch` và gọi `writeAuditLog()`.
4. **Import 3 định dạng (`.xlsx`, `.json`, `.xml`) an toàn chống XXE:**
   - Với `.xml`:
     1. Kiểm tra chuỗi thô `rawXml`: nếu khớp `/<!DOCTYPE|<!ENTITY/i`, từ chối ngay HTTP `400` và ghi `writeAuditLog({ action: 'XXE_ATTEMPT_BLOCKED', severity: 'CRITICAL', ... })`.
     2. Parse bằng `new XMLParser({ processEntities: false, ignoreAttributes: false })`.
   - Với `.xlsx`: đọc qua `xlsx.read(req.file.buffer, { type: 'buffer' })`.
   - Validate từng dòng (bắt buộc `ProductName`, `ProductType`, `Unit`; `Price >= 0`, `Quantity >= 0`). Nếu có dòng sai, trả HTTP `400` kèm danh sách `{ row, message }` và rollback transaction.
5. **Export 3 định dạng (`.xlsx`, `.json`, `.xml`) chống Excel Formula Injection:**
   - Khi xuất `.xlsx`, đi qua từng dòng và gọi `sanitizeExcelCell()` (từ `utils/crypto.util.js`) cho `ProductName`, `ProductType`, `Unit`, `Description`, `PathImage` để vô hiệu hóa các chuỗi bắt đầu bằng `=`, `+`, `-`, `@`.
6. **Upload ảnh sản phẩm (`POST /api/products/upload-image`):**
   - Bắt buộc gọi `validateImageMagicBytes(req.file.buffer)` trước khi lưu ra `server/uploads/products/`.
   - Nếu sai chữ ký PNG/JPG/WEBP → từ chối HTTP `400` và ghi `writeAuditLog({ action: 'MALICIOUS_UPLOAD_BLOCKED', severity: 'CRITICAL', ... })`.
   - Đổi tên bằng `generateSafeFilename(ext)`.

### Bước 3: Giao diện Admin (`AdminProductsPage` & `AdminSecurityPage`)
1. Gắn `localStorage` key `seculicense_admin_visible_columns` để lưu cột ẩn/hiện (không cho ẩn `ProductName` và checkbox).
2. Gắn đủ 10 phím tắt (`Alt+N`, `Alt+S`, `Alt+E`, `Alt+V`, `Alt+D`, `Alt+C`, `Alt+I`, `Alt+X`, `Alt+H`, `Esc`) với `e.preventDefault()`, xử lý thông minh khi đang focus trong `<input>`/`<textarea>`.
3. Kết nối `OcrUploaderStub` gọi `POST /api/ai/ocr-product` (Gemini Vision) để tự điền vào form Thêm mới.
4. Kết nối bảng `audit_logs` trên `AdminSecurityPage` (`GET /api/security/audit-logs`).

---

## 3. Checklist Tự Kiểm thử của Thành viên A trước khi Merge `main`
- [ ] Đăng nhập `ADMIN` nhận cookie `HttpOnly` + xác thực được mã 6 số TOTP từ app Authenticator.
- [ ] Nhập sai mật khẩu 5 lần bị khóa 15 phút (`423`) và có dòng log `HIGH` trong `audit_logs`.
- [ ] Gửi request `POST /api/products` bằng tài khoản `CUSTOMER` bị chặn `403 Forbidden`.
- [ ] Bảng `Product` chạy đủ 11 chức năng, Export `.xlsx` với tên `=CMD|...` bị thêm dấu `'` phía trước, Import file XML chứa `<!ENTITY` bị chặn `400`.
- [ ] Đổi tên một file `.js` thành `shell.jpg` và upload bị chặn `400` do sai Magic Bytes.
- [ ] Không sửa nhầm file của Thành viên B và không commit `.env`.
