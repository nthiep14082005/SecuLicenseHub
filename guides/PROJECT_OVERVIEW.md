# PROJECT_OVERVIEW.md — Tổng quan Kiến trúc & Phòng thủ Chiều sâu (SecuLicense Hub)

> Tài liệu này giúp giảng viên hướng dẫn/chấm thi và toàn nhóm nắm rõ mô hình **"1 Mã nguồn — 2 Môn học"**, sơ đồ phòng thủ 4 lớp và giải thích thống nhất mọi thuật ngữ kỹ thuật sử dụng trong **SecuLicense Hub**.

---

## 1. Mô hình "1 Mã nguồn — 2 Môn học"

Thay vì xây dựng 2 dự án rời rạc, nhóm thiết kế **01 hệ thống duy nhất** trên nền **Node.js (Express CommonJS) + PostgreSQL 16 + React/Vite + Tailwind CSS + Swagger UI (`/docs`)** sao cho nghiệp vụ thương mại bản quyền số vừa đáp ứng trọn vẹn tính năng & AI của môn 1, vừa làm bài toán kiểm chứng trực tiếp cho toàn bộ lỗ hổng bảo mật ở môn 2:

| Tiêu chí | Môn 1: Ngôn ngữ kịch bản | Môn 2: Phát triển phần mềm web an toàn |
| :--- | :--- | :--- |
| **Tên đề tài đăng ký** | *Xây dựng Hệ thống Quản lý & Phân phối Bản quyền Phần mềm, Tài nguyên Số tích hợp Tìm kiếm thông minh và Trợ lý AI* | *Thiết kế và Xây dựng Nền tảng Phân phối Bản quyền Số An toàn phòng chống lỗ hổng Web* |
| **Tài liệu chuẩn hóa** | Đề cương môn Ngôn ngữ kịch bản ([đề cương Word](proposals/De_Cuong_NNKB_SecuLicense_Hub.docx)) | Giáo trình *Web Security Basics — Shweta Bhasin (Premier Press, 2003)* & **OWASP Top 10** ([đề cương Word](proposals/De_Cuong_WebAnToan_SecuLicense_Hub.docx)) |
| **Trọng tâm chấm điểm** | 9+ Form nghiệp vụ; Bảng `Product` đủ **10 trường PascalCase** & **11 chức năng** (phân trang 10–15 dòng, CRUD, Bulk Delete/Clone checkbox, Import/Export `.xlsx/.json/.xml`, ẩn/hiện cột `localStorage`, 10 phím tắt); Tìm kiếm **Meilisearch + Voice Search**; **Chatbot Gemini** kho thật; **AI OCR** phiếu nhập. | **Auth/Session an toàn** (`bcryptjs`, Lockout 5 lần, 2FA TOTP, `HttpOnly + SameSite=Strict` Cookie); **Chống SQLi** (`$1, $2`); **Chống XSS/CSRF/CSP**; **Chống XXE** & **Excel Formula Injection**; **Upload Magic Bytes + UUID**; **AES-256-GCM** License Vault; **HMAC-SHA256** + `FOR UPDATE` chống sửa giá; **Anti-IDOR** & **Signed URL 300s**; **`audit_logs` + AI Security Log Analyzer**. |

---

## 2. Sơ đồ Kiến trúc Hệ thống & Phòng thủ Chiều sâu 4 Lớp (Defense-in-Depth)

```text
+-----------------------------------------------------------------------------------+
| CLIENT (React 18 + Vite + Tailwind CSS + Axios withCredentials: true)             |
| - Portal Khách hàng (B): Catalog, Detail (SHA-256), VietQR Checkout, Vault, Contact|
| - Khu vực Auth & Admin (A & B): Login (+2FA), Register, Products 11 CN, Orders,   |
|   Audit Logs & AI Security Analyzer                                               |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / HTTP + HttpOnly Cookie (CORS)
                                          v
+-----------------------------------------------------------------------------------+
| LỚP 1 — BIÊN MẠNG & HTTP HEADERS (server/src/index.js & security.middleware.js)   |
| • Helmet: CSP (tách riêng /api và /docs), HSTS, X-Frame-Options                   |
| • CORS Whitelist (CLIENT_URL, credentials: true) + cookie-parser                  |
| • express-rate-limit: apiLimiter (200 req/15p) & authLimiter (10 req/15p -> 429)  |
| • csrfOriginGuard: chặn request thay đổi dữ liệu mang Origin lạ -> 403 + AuditLog |
+-----------------------------------------+-----------------------------------------+
                                          v
+-----------------------------------------------------------------------------------+
| LỚP 2 — ĐỊNH DANH, PHIÊN & PHÂN QUYỀN (auth.middleware.js & modules/auth,licenses)|
| • bcryptjs (salt >= 10) + Khóa tài khoản 15 phút sau 5 lần sai mật khẩu (423)     |
| • 2FA TOTP (otplib + qrcode) bắt buộc cho ADMIN                                   |
| • JWT ký trong HttpOnly, SameSite=Strict Cookie (fallback Bearer cho Swagger /docs)|
| • RBAC requireRole('ADMIN') + Anti-IDOR kiểm tra owner_user_id === req.user.userId|
+-----------------------------------------+-----------------------------------------+
                                          v
+-----------------------------------------------------------------------------------+
| LỚP 3 — KIỂM DUYỆT DỮ LIỆU & TỆP TIN (security.middleware.js & upload.middleware) |
| • 100% Parameterized Query ($1, $2...) qua pool.query() chống SQL Injection       |
| • sanitizeInput (xss) lọc đệ quy req.body & req.query chống Stored/Reflected XSS  |
| • Anti-XXE: từ chối <!DOCTYPE / <!ENTITY và tắt processEntities: false            |
| • Anti-Excel Formula Injection: sanitizeExcelCell() thêm (') trước =, +, -, @     |
| • validateImageMagicBytes() (PNG/JPG/WEBP) + UUID + assertNoPathTraversal()       |
+-----------------------------------------+-----------------------------------------+
                                          v
+-----------------------------------------------------------------------------------+
| LỚP 4 — MẬT MÃ HỌC, LƯU TRỮ POSTGRESQL & KIỂM TOÁN AI (crypto.util.js, audit.util)|
| • AES-256-GCM: mã hóa license_keys (lưu encrypted_key + iv + auth_tag)            |
| • HMAC-SHA256 + SELECT ... FOR UPDATE: chống sửa giá & bán âm tồn kho khi đặt đơn |
| • SHA-256 Checksum cho tệp tài nguyên + Signed Download URL hết hạn 300 giây      |
| • PostgreSQL 16 (7 bảng, Docker Local / Neon SSL) + Meilisearch + Gemini AI       |
| • Bảng audit_logs ghi vết chống chối bỏ -> AI Security Log Analyzer phát hiện sớm |
+-----------------------------------------------------------------------------------+
```

---

## 3. Bảng Giải thích Thuật ngữ Kỹ thuật (Cho cả 2 Môn)

| Thuật ngữ | Giải thích ngắn gọn | Vị trí trong mã nguồn SecuLicense Hub |
| :--- | :--- | :--- |
| **REST API & Swagger UI (`/docs`)** | Giao diện Web tự động đọc chuẩn OpenAPI 3.0.3 để kiểm thử từng API trực tiếp trên trình duyệt mà không cần Postman. | [specs/openapi.json](../specs/openapi.json), [server/src/config/swagger.js](../server/src/config/swagger.js) |
| **Meilisearch** | Công cụ tìm kiếm chỉ mục ngược tốc độ cao (ms), hỗ trợ tiếng Việt không dấu và chịu lỗi chính tả 1–2 ký tự. | [server/src/modules/search/search.service.js](../server/src/modules/search/search.service.js) |
| **Web Speech API (`vi-VN`)** | API nhận diện giọng nói tiếng Việt trực tiếp trên trình duyệt Chrome/Edge để điền từ khóa tìm kiếm. | [client/src/components/portal/VoiceMicButtonStub.jsx](../client/src/components/portal/VoiceMicButtonStub.jsx) |
| **Gemini OCR / Chatbot / Log Analyzer** | 3 ứng dụng của Google Gemini (`@google/genai`): đọc ảnh phiếu nhập điền form, chatbot tư vấn theo kho DB thật, và phân tích nhật ký bất thường. | [server/src/modules/ocr/](../server/src/modules/ocr/), [server/src/modules/chatbot/](../server/src/modules/chatbot/), [server/src/modules/security/](../server/src/modules/security/) |
| **`HttpOnly` + `SameSite=Strict` Cookie** | Cờ Cookie cấm JavaScript (`document.cookie`) đọc JWT (giảm tác hại XSS) và chặn trình duyệt gửi Cookie từ trang web lạ (chống CSRF). | [server/src/middlewares/auth.middleware.js](../server/src/middlewares/auth.middleware.js), [client/src/api/axiosClient.js](../client/src/api/axiosClient.js) |
| **2FA TOTP** | Mã xác thực một lần 6 chữ số thay đổi mỗi 30 giây (Google Authenticator) tạo lớp khóa thứ hai cho tài khoản quản trị. | [server/src/modules/auth/auth.routes.js](../server/src/modules/auth/auth.routes.js) |
| **Parameterized Query (`$1, $2`)** | Tách rời khung câu lệnh SQL và dữ liệu người dùng tại driver PostgreSQL (`pg`) để vô hiệu hóa hoàn toàn SQL Injection. | [server/src/db/pool.js](../server/src/db/pool.js) |
| **CSP / XSS / CSRF** | Bộ 3 phòng thủ trình duyệt: `Helmet` CSP khóa nguồn script được phép chạy; `xss` làm sạch input; `csrfOriginGuard` chặn `Origin` ngoại lai. | [server/src/index.js](../server/src/index.js), [server/src/middlewares/security.middleware.js](../server/src/middlewares/security.middleware.js) |
| **XXE (XML External Entity)** | Lỗ hổng khi parser XML giải quyết thực thể ngoài (`<!ENTITY ... SYSTEM "file://...">`) để đọc trộm tệp hệ thống; bị chặn bằng `processEntities: false` và lọc `<!DOCTYPE`. | [server/src/modules/products/products.controller.js](../server/src/modules/products/products.controller.js) |
| **Excel Formula Injection** | Kẻ tấn công nhập công thức `=CMD\|...` vào tên sản phẩm để Excel thực thi lệnh khi Export; khắc phục bằng hàm `sanitizeExcelCell()` chèn dấu `'` phía trước. | [server/src/utils/crypto.util.js](../server/src/utils/crypto.util.js) |
| **Magic Bytes** | Đọc 4–12 byte đầu thực tế của tệp nhị phân (PNG/JPG/WEBP) thay vì tin đuôi file `.jpg`, kết hợp đổi tên UUID chống ghi đè & thực thi script. | [server/src/middlewares/upload.middleware.js](../server/src/middlewares/upload.middleware.js) |
| **AES-256-GCM** | Chuẩn mã hóa đối xứng có xác thực (Authenticated Encryption) tạo `encrypted_key`, `iv` ngẫu nhiên và `auth_tag` chống giả mạo ciphertext cho `license_keys`. | [server/src/utils/crypto.util.js](../server/src/utils/crypto.util.js) |
| **HMAC-SHA256** | Mã xác thực thông điệp dùng khóa bí mật (`HMAC_ORDER_SECRET`) ký tổng tiền đơn hàng để phát hiện ngay nếu giá trị trong DB bị sửa lén. | [server/src/utils/crypto.util.js](../server/src/utils/crypto.util.js) |
| **Signed URL (300s)** | Đường dẫn tải tệp đính kèm chữ ký HMAC và thời điểm hết hạn (`exp` sau 300 giây), kết hợp kiểm tra chống `../` Path Traversal. | [server/src/utils/crypto.util.js](../server/src/utils/crypto.util.js), [server/src/middlewares/upload.middleware.js](../server/src/middlewares/upload.middleware.js) |
| **IDOR** | Lỗi truy cập chéo tài nguyên bằng cách đổi ID trên URL/body (`/licenses/101/reveal`); chặn bằng kiểm tra `owner_user_id === req.user.userId`. | [server/src/modules/licenses/licenses.controller.js](../server/src/modules/licenses/licenses.controller.js) |
| **`audit_logs` (Non-repudiation)** | Nhật ký bất biến ghi lại hành động, tài nguyên, IP, mức độ (`INFO`/`WARN`/`HIGH`/`CRITICAL`) giúp truy vết và nạp cho AI Log Analyzer. | [server/src/utils/audit.util.js](../server/src/utils/audit.util.js), [specs/init.sql](../specs/init.sql) |
