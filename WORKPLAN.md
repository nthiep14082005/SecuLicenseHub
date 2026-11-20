# WORKPLAN.md — Kế hoạch Triển khai 4 Tuần cho 2 Môn học (Thành viên A & B)

> **Mục tiêu:** Dùng **01 mã nguồn SecuLicense Hub** đạt trọn vẹn **9 form**, **11 chức năng `Product`**, **4 tính năng AI/Tìm kiếm** (Môn *Ngôn ngữ kịch bản*) và **9 lớp phòng thủ bảo mật Web + Audit AI** (Môn *Phát triển phần mềm web an toàn*).

---

## 1. Bảng Phân công Trách nhiệm & Sản phẩm Bàn giao

| Thành viên | Vai trò chính | Nhánh Git & Phạm vi | Sản phẩm bàn giao (Cả 2 môn) |
| :--- | :--- | :--- | :--- |
| **Thành viên A** | Backend Core, Auth/2FA, Admin `Product` (11 CN), Hardening & OCR | `feat/a-core-admin-hardening`<br>`db/pool.js`, `middlewares/*`, `modules/{auth,products,ocr}`, Admin `orders/contacts/security`, `pages/{auth,admin}`, `components/admin` | Kết nối PG Local + Neon SSL; Auth `HttpOnly Cookie` + 2FA TOTP + Lockout; Middleware bảo mật (Rate limit, Magic Bytes, XSS, CSRF); Module `Product` đủ 11 chức năng (chống SQLi, XXE, Formula Injection); AI OCR; Quản lý Hóa đơn & Bảng `audit_logs`. |
| **Thành viên B** | Portal Khách hàng, AES-256-GCM, HMAC, Signed URL, Search/Voice & AI | `feat/b-portal-crypto-ai`<br>`db/seed.js`, `modules/{licenses,search,chatbot}`, Customer `orders/contacts`, `POST /api/ai/analyze-logs`, `pages/portal`, `components/portal`, AI Analyzer UI | Script `seed.js` nạp 45 tài nguyên số + `license_keys` mã hóa AES; 5 form Portal (Danh mục, Chi tiết SHA-256, Checkout VietQR + HMAC, Kho License AES + Signed URL 300s chống IDOR, Liên hệ chống XSS); Meilisearch + Voice Search; Chatbot AI kho thật; AI Security Log Analyzer. |

---

## 2. Lộ trình Thực hiện Chi tiết theo 4 Tuần

### Tuần 1: Dựng khung móng, CSDL 7 Bảng & Xác thực An toàn
- [ ] **Cả nhóm (A & B):** Chạy `docker compose up -d` (hoặc cấu hình Neon PostgreSQL SSL), nạp `specs/init.sql`, chạy `server/` kiểm tra `/api/health` và Swagger UI `/docs`.
- [ ] **Thành viên A:**
  - Hoàn thiện `auth.middleware.js` (`HttpOnly Cookie` + fallback Bearer Swagger, `requireRole('ADMIN')`) và `security.middleware.js` (`authLimiter`, `csrfOriginGuard`, `sanitizeInput`).
  - Hoàn thiện `POST /api/auth/register`, `POST /api/auth/login` (khóa 15 phút sau 5 lần sai), `POST /api/auth/logout`, `GET /api/auth/me`, và luồng 2FA TOTP (`2fa/setup`, `2fa/verify`).
  - Xây dựng Form Đăng nhập (+ bước nhập OTP 2FA) và Form Đăng ký (+ thanh độ mạnh mật khẩu).
- [ ] **Thành viên B:**
  - Hoàn thiện `server/src/db/seed.js`: nạp sẵn 1 Admin, 2 Customer, **45 sản phẩm tài nguyên số** (đủ 5 `ProductType`) kèm tệp demo trong `uploads/assets/` có mã `file_sha256` và pool `license_keys` mã hóa sẵn bằng `encryptAesGcm()`.
  - Hoàn thiện `CatalogPage` (danh sách, lọc theo loại/giá) và `ProductDetailPage` (hiển thị checksum SHA-256, nút thêm giỏ hàng).

### Tuần 2: 11 Chức năng `Product` (Chống XXE/Formula Inj) & Luồng Giao dịch Mã hóa
- [ ] **Thành viên A:**
  - Hoàn thiện CRUD phân trang (`10`–`15` dòng), Xóa 1/nhiều, Sao chép 1/nhiều trong `withTransaction()`.
  - Hoàn thiện Import/Export 3 định dạng `.xlsx`, `.json`, `.xml` (áp dụng `sanitizeExcelCell()` chống Formula Injection và chặn `<!DOCTYPE`/`<!ENTITY` chống XXE).
  - Hoàn thiện Upload ảnh kiểm tra Magic Bytes (`validateImageMagicBytes`) + tên UUID.
  - Hoàn thiện UI `AdminProductsPage`: Ẩn/Hiện cột lưu `seculicense_admin_visible_columns`, 10 phím tắt CRUD (`Alt+N/S/E/V/D/C/I/X/H`, `Esc`) và `AdminOrdersPage`.
- [ ] **Thành viên B:**
  - Hoàn thiện `POST /api/orders`: Transaction `FOR UPDATE` trừ kho, gán `license_keys`, ký `HMAC-SHA256`, sinh QR **VietQR** động; kèm `GET /api/orders/my` và `GET /api/orders/:id/verify-integrity`.
  - Hoàn thiện module `licenses`: `GET /api/licenses/my`, `POST /api/licenses/:id/reveal` (giải mã AES-256-GCM + chống IDOR + ghi `audit_logs`), `POST /api/licenses/:id/download-link` & `GET /api/licenses/download` (Signed URL 300s + chống Path Traversal).
  - Hoàn thiện `CheckoutPage`, `LicenseVaultPage`, và `ContactPage` (chống Stored XSS).

### Tuần 3: Tích hợp 4 Tính năng AI / Tìm kiếm & Giám sát Nhật ký Bảo mật
- [ ] **Thành viên A:**
  - Hoàn thiện `POST /api/ai/ocr-product` (Gemini Vision bóc tách hóa đơn nhập lô bản quyền thành JSON) & `OcrUploaderStub` trên form Thêm mới.
  - Gắn hook `syncProductsToMeilisearch()` vào mọi thao tác thay đổi dữ liệu bảng `products`.
  - Hoàn thiện `GET /api/security/audit-logs` & `GET /api/security/summary` + bảng hiển thị nhật ký trên `AdminSecurityPage`.
- [ ] **Thành viên B:**
  - Hoàn thiện đồng bộ & tìm kiếm `Meilisearch` (`GET /api/search`, `POST /api/search/sync`) và gắn nút micro **Web Speech API** (`vi-VN`) lên Header.
  - Hoàn thiện **Chatbot AI** (`POST /api/ai/chat`) dựa trên kho hàng PostgreSQL thật và widget chat nổi ở `PortalLayout`.
  - Hoàn thiện **AI Security Log Analyzer** (`POST /api/ai/analyze-logs`) tổng hợp cảnh báo tấn công từ `audit_logs` và hiển thị báo cáo mức độ rủi ro trên `AdminSecurityPage`.

### Tuần 4: Ghép nhánh, Kiểm thử Tấn công/Phòng thủ & Diễn tập Bảo vệ
- [ ] **Cả nhóm (A & B):** Merge `feat/a-core-admin-hardening` và `feat/b-portal-crypto-ai` về `main`, chạy kiểm thử End-to-End 9 form.
- [ ] **Thành viên A & B:** Chạy đủ **8 ca Attack & Defense Live** trong `guides/DEFENSE_DUAL_COURSE.md` (SQLi, Stored XSS, XXE, Excel Formula Injection, HMAC Price Tampering, IDOR, Brute-force Login, Fake `.jpg` Upload + Path Traversal).
- [ ] **Cả nhóm (A & B):** Đóng băng code trước 48 giờ, quay video dự phòng và diễn tập mượt mà cả **Kịch bản Demo 8 phút (Môn 1)** lẫn **Kịch bản Demo 10 phút Attack/Defense (Môn 2)**.
