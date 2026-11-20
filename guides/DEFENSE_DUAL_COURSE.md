# DEFENSE_DUAL_COURSE.md — Kịch bản Demo, Bộ Test Case 2 Môn & Bảo vệ Đồ án

> **Mục tiêu:** Dùng **01 phiên chạy SecuLicense Hub duy nhất** để tự kiểm thử, chụp ảnh bằng chứng cho báo cáo và trình diễn thuyết phục trước Hội đồng ở cả 2 học phần:
> 1. **Môn Ngôn ngữ kịch bản** *(Kịch bản Demo 8 phút + Bộ Test Case `FUNC-01` → `FUNC-12`)*
> 2. **Môn Phát triển phần mềm web an toàn** *(Kịch bản Live Attack & Defense 10 phút + Bộ Test Case `SEC-01` → `SEC-08` + Đối chiếu sách Web Security Basics — Shweta Bhasin, Premier Press, 2003)*

---

## PHẦN A — Kịch bản Live Demo 8 Phút (Môn Ngôn ngữ kịch bản)

### Phút 1 – 4 (Thành viên B): Portal Khách hàng, Tìm kiếm thông minh & Trợ lý AI
1. **Tìm kiếm Meilisearch + Giọng nói (`vi-VN`):**
   - Bấm nút micro trên Header và nói *"Bản quyền JetBrains"* → tự động gọi `GET /api/search` trả kết quả tức thì.
   - Gõ cố tình sai chính tả / không dấu: *"ma nguon node 2fa"* → Meilisearch vẫn tìm đúng gói *Node.js Enterprise Auth & 2FA Boilerplate*.
2. **Chatbot AI gắn tồn kho PostgreSQL thật:**
   - Mở widget AI góc phải, hỏi: *"Mình muốn tìm bộ UI Kit hoặc mã nguồn dưới 1 triệu còn hàng"*.
   - Chatbot trả lời đúng các sản phẩm còn `Quantity > 0` trong PostgreSQL kèm thẻ sản phẩm bấm xem chi tiết / thêm vào giỏ hàng.
3. **Xem Chi tiết (`SHA-256`), Đặt hàng `VietQR` & Kho License:**
   - Vào trang Chi tiết xem mã `FileSha256` → Thêm vào giỏ → Thanh toán sinh QR **VietQR** động → Qua **Kho License** giải mã xem Key và gửi 1 biểu mẫu **Liên hệ**.

### Phút 5 – 8 (Thành viên A): Quản trị `Product` (11 Chức năng), Phím tắt & AI OCR
1. **Đăng nhập Admin (2FA) & Duyệt hóa đơn:**
   - Đăng nhập bằng tài khoản `ADMIN` (kèm nhập mã 6 số **2FA TOTP**) → Vào `/admin/orders` duyệt đơn Thành viên B vừa đặt sang `CONFIRMED`.
2. **AI OCR + Phím tắt CRUD tại `/admin/products`:**
   - Nhấn `Alt + H` mở bảng hướng dẫn phím tắt → Nhấn `Alt + N` mở form Thêm mới → Tải ảnh phiếu nhập lô bản quyền lên **AI OCR** (`POST /api/ai/ocr-product`) tự điền `ProductName`, `ProductType`, `Quantity`, `Unit`, `Price` → Nhấn `Alt + S` lưu.
3. **Thao tác 11 chức năng nâng cao trên bảng `Product`:**
   - Đổi số dòng phân trang (`10`/`12`/`15`), Xem chi tiết (`Alt + V`), Sửa (`Alt + E`).
   - Bật/tắt cột ở thanh **Ẩn/Hiện cột**, nhấn `F5` tải lại trang chứng minh cấu hình cột vẫn giữ nguyên qua `localStorage` (`seculicense_admin_visible_columns`).
   - Tick 2 dòng → **Sao chép nhiều (`Alt + C`)** → Tick 2 bản sao mới → **Xóa nhiều (`Alt + D`)**.
   - Bấm **Export** tải đủ 3 định dạng `.xlsx`, `.json`, `.xml` (mở chứng minh đúng 10 cột chuẩn) và **Import** lại file mẫu trong [specs/sample-files/](../specs/sample-files/).

---

## PHẦN B — Bộ Test Case Chức năng Môn Ngôn ngữ kịch bản (`FUNC-01` → `FUNC-12`)

> Thực hiện trực tiếp trên **Swagger UI (`http://localhost:5000/docs`)** và **Frontend (`http://localhost:5173`)** sau khi hoàn thành module tương ứng.

| Mã TC | Hạng mục kiểm thử | Cách thao tác trên Swagger UI `/docs` hoặc Giao diện | Kết quả kỳ vọng (Pass Criteria) |
| :--- | :--- | :--- | :--- |
| **FUNC-01** | Health Check & Swagger UI | Mở `http://localhost:5000/docs` → chạy `GET /api/health` | HTTP `200`, JSON `database: "connected"`, đủ 9 nhóm API hiển thị trên `/docs`. |
| **FUNC-02** | Đăng ký, Đăng nhập & Guard 9+ Form | Mở `/register` tạo Customer; thử vào `/admin/products`; đăng nhập `/login` bằng tài khoản Admin (kèm 2FA) | Customer bị chặn vào Admin; Admin vào đủ các trang `/admin/products`, `/admin/orders`, `/admin/security`. |
| **FUNC-03** | Phân trang `Product` (10–15 dòng) | Trên `/admin/products` hoặc `GET /api/products?page=1&limit=12` | Trả về tối đa 12 dòng/trang kèm `pagination.totalItems`, `totalPages`; đổi `limit=10`/`15` hoạt động đúng. |
| **FUNC-04** | Thêm, Xem chi tiết & Sửa `Product` | Nhấn `Alt+N` tạo bản ghi mới; bấm `Alt+V` xem chi tiết; bấm `Alt+E` sửa giá → `Alt+S` lưu | JSON trả về đủ đúng 10 key PascalCase (`ProductID`..`UpdateDate`), `Price` là số, `UpdateDate` tự tăng theo trigger DB. |
| **FUNC-05** | Xóa 1 & Xóa nhiều (Checkbox) | Xóa 1 dòng qua nút thùng rác; tick checkbox 2 dòng → bấm **Xóa nhiều** (`Alt+D`) | Xóa sạch trong Transaction (`POST /api/products/bulk-delete`), `totalItems` giảm tương ứng. |
| **FUNC-06** | Sao chép 1 & Sao chép nhiều (Checkbox) | Bấm **Sao chép** trên 1 dòng; tick checkbox 2 dòng → bấm **Sao chép nhiều** (`Alt+C`) | Tạo bản ghi mới có hậu tố ` (Bản sao)` với `CreateDate`/`UpdateDate` mới. |
| **FUNC-07** | Export đủ 3 định dạng | Bấm Export `.xlsx`, `.json`, `.xml` (hoặc gọi `GET /api/products/export?format=...`) | Cả 3 file tải về mở được, có đủ 10 cột chuẩn từ `ProductID` đến `UpdateDate`. |
| **FUNC-08** | Import `.xlsx/.json/.xml` & Bắt lỗi dòng | Import [products_sample.json](../specs/sample-files/products_sample.json) & [products_sample.xml](../specs/sample-files/products_sample.xml); sau đó thử file có `Price = -100` | File chuẩn nạp thành công vào PostgreSQL; file có dòng lỗi trả HTTP `400` chỉ rõ số dòng lỗi và rollback toàn bộ batch. |
| **FUNC-09** | Ẩn/Hiện cột & 10 Phím tắt CRUD | Tắt cột `CreateDate`, `UpdateDate` rồi bấm `F5`; bấm lần lượt `Alt+H`, `Esc`, `Alt+N`, `Alt+S` | Cấu hình cột giữ nguyên sau `F5` (`localStorage`); phím tắt mở/đóng đúng modal và không cản trở gõ chữ trong `<input>`. |
| **FUNC-10** | Luồng Portal 5 Form & VietQR | Trên `/`, lọc theo `ProductType` → vào `/products/:id` xem `SHA-256` → `/checkout` đặt đơn → `/vault` xem key → `/contact` gửi hỗ trợ | Đơn hàng trừ tồn kho trong DB, hiện ảnh QR VietQR động có nội dung `SECULICENSE_<ORDER_ID>`, form liên hệ báo thành công. |
| **FUNC-11** | Meilisearch + Voice Search (`vi-VN`) | Gõ không dấu/sai chính tả (`"jetbrain"`, `"tai lieu bao mat"`) và bấm nút micro trên Header | Trả kết quả tức thì từ `GET /api/search`; Web Speech API nhận tiếng Việt điền thẳng vào ô tìm kiếm. |
| **FUNC-12** | Chatbot AI & AI OCR | Hỏi Chatbot AI về gói dưới 1 triệu; tại `/admin/products` tải ảnh phiếu nhập lên `OcrUploader` | Chatbot chỉ gợi ý sản phẩm còn hàng trong DB kèm thẻ mua ngay; OCR trả JSON 6 trường tự điền vào form Thêm mới. |

---

## PHẦN C — Kịch bản Live Attack & Defense 10 Phút và Bộ Test Bảo mật (`SEC-01` → `SEC-08`)

> **Lưu ý khi chạy lệnh `curl.exe` trên Windows PowerShell:** Luôn dùng `curl.exe` (tránh alias `Invoke-WebRequest` của PowerShell). Các lệnh dưới đây test trực tiếp trên Server đang chạy ở `http://localhost:5000` sau khi A & B hoàn tất module.

| Mã TC | Lỗ hổng & Kịch bản Tấn công | Cách thực hiện trực tiếp (Payload / Lệnh `curl.exe` / DevTools) | Cơ chế Phòng thủ & Bằng chứng cần chụp (`HTTP` + `audit_logs`) |
| :--- | :--- | :--- | :--- |
| **SEC-01** | **Brute-Force Login & Bypass 2FA** | Gửi sai mật khẩu liên tiếp 6 lần:<br>`for ($i=1; $i -le 6; $i++) { curl.exe -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@seculicense.vn\",\"password\":\"SaiMatKhau\"}' }` | Lần 1–4: `401`. Lần 5: `423 Locked` (khóa 15 phút). Gửi quá 10 lần/15p: `429 Too Many Requests`. Admin đăng nhập đúng mật khẩu nhưng thiếu `totpCode` bị từ chối. Trong `audit_logs` ghi `ACCOUNT_LOCKED` / `RATE_LIMIT_AUTH_BLOCKED` (`HIGH`). |
| **SEC-02** | **SQL Injection (SQLi)** | Bắn payload kinh điển vào Login & Tìm kiếm:<br>`curl.exe -s "http://localhost:5000/api/products?keyword=%27%20OR%201%3D1--"`<br>`curl.exe -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@seculicense.vn'\'' OR '\''1'\''='\''1\",\"password\":\"x\"}'` | Không đăng nhập lọt và không lộ toàn bộ bảng `products`. `pool.query(..., [$1])` coi chuỗi SQLi là text thuần. |
| **SEC-03** | **Stored XSS & CSP** | Gửi mã JS độc hại qua form `/contact`:<br>`curl.exe -s -X POST http://localhost:5000/api/contacts -H "Content-Type: application/json" -d '{\"fullName\":\"Attacker\",\"email\":\"xss@test.com\",\"subject\":\"XSS\",\"message\":\"<script>alert(1)</script><img src=x onerror=alert(1)>\"}'` | Middleware `sanitizeInput` (`xss`) vô hiệu hóa thẻ script trước khi lưu DB; React escape khi hiển thị; `helmet` CSP chặn inline script. Mở Admin xem liên hệ không hiện popup `alert(1)`. |
| **SEC-04** | **XXE Injection (XML)** | Tạo file `xxe_test.xml` nội dung:<br>`<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///C:/Windows/win.ini">]><Products><Product><ProductName>&xxe;</ProductName></Product></Products>`<br>Upload lên `/api/products/import` (qua Swagger UI `/docs` kèm JWT Admin). | Server chặn trước khi parse XML: trả HTTP `400`, không rò rỉ nội dung file hệ thống và ghi `XXE_ATTEMPT_BLOCKED` (`CRITICAL`) vào `audit_logs`. |
| **SEC-05** | **Excel Formula Injection** | Tạo 1 sản phẩm có `ProductName` = `=CMD\|'/C calc'!A0` → bấm Export `.xlsx` (`GET /api/products/export?format=xlsx`) và mở file Excel kiểm tra ô đó. | Hàm `sanitizeExcelCell()` tự động đổi giá trị thành `'=CMD\|'/C calc'!A0` — Excel hiển thị nguyên văn chuỗi văn bản, tuyệt đối không bật `calc.exe`. |
| **SEC-06** | **Malicious Upload (Magic Bytes) & Path Traversal / Expired Signed URL** | 1) Đổi tên file `malware.js` thành `fake_avatar.jpg` và upload qua `POST /api/products/upload-image`.<br>2) Gọi tải file kèm `../`:<br>`curl.exe -i "http://localhost:5000/api/licenses/download?token=invalid.token"` | 1) `validateImageMagicBytes()` phát hiện không đúng chữ ký JPEG/PNG/WEBP → trả `400`, không lưu vào `uploads/products/`, ghi `MALICIOUS_UPLOAD_BLOCKED` (`CRITICAL`).<br>2) Signed URL sai/hết hạn 300s hoặc chứa `../` → trả `403`. |
| **SEC-07** | **Price Tampering & IDOR Xem trộm Key** | 1) Chỉnh giá đơn hoặc sửa trực tiếp `total_amount` trong PostgreSQL xuống `1000` → gọi `GET /api/orders/<id>/verify-integrity`.<br>2) Dùng Cookie của **Customer B** gọi `POST /api/licenses/<ID_cua_Customer_A>/reveal`. | 1) Giá đặt đơn luôn tính từ DB trong Transaction `FOR UPDATE`; sửa DB làm `verify-integrity` trả `valid: false`.<br>2) Hệ thống chặn truy cập chéo chủ sở hữu trả `403 Forbidden`, không giải mã `AES-256-GCM`, ghi `IDOR_KEY_REVEAL_BLOCKED` (`CRITICAL`). |
| **SEC-08** | **Giám sát `audit_logs` & AI Security Log Analyzer** | Mở trang **`/admin/security`** (hoặc gọi `GET /api/security/audit-logs` và bấm nút **AI Security Log Analyzer** / `POST /api/ai/analyze-logs`). | Toàn bộ các sự kiện `SEC-01` → `SEC-07` hiện đầy đủ trên bảng kèm IP, User-Agent, Severity; Gemini AI trả về JSON `riskLevel: "CRITICAL"`, tóm tắt chuỗi tấn công và khuyến nghị khắc phục. |

---

## PHẦN D — Đối chiếu Kiến trúc Code với Sách *Web Security Basics* (Shweta Bhasin, Premier Press, 2003) & OWASP

| Chủ đề trong sách *Web Security Basics (2003)* | Nguyên lý cốt lõi theo sách | Vị trí triển khai thực tế trong `SecuLicense Hub` |
| :--- | :--- | :--- |
| **Input Validation & Injection Flaws** | Không tin tưởng dữ liệu từ trình duyệt; lọc/tham số hóa mọi input ở phía server | `pool.query(..., [$1])` (chống SQLi); `sanitizeInput` ([security.middleware.js](../server/src/middlewares/security.middleware.js)); chặn DTD/ENTITY (chống XXE); `sanitizeExcelCell` ([crypto.util.js](../server/src/utils/crypto.util.js)) |
| **Authentication & Session Management** | Bảo vệ thông tin xác thực bằng hàm băm một chiều, giới hạn lần thử sai, phiên cookie an toàn | `bcryptjs` (salt ≥ 10), `HttpOnly; SameSite=Strict` Cookie ([auth.middleware.js](../server/src/middlewares/auth.middleware.js)), khóa 15p sau 5 lần sai, 2FA TOTP (`otplib`) |
| **Access Control & Authorization** | Phân tách rõ vai trò và luôn kiểm tra quyền sở hữu tài nguyên theo từng yêu cầu (chống leo thang đặc quyền / IDOR) | `requireRole('ADMIN')`, kiểm tra `owner_user_id === req.user.userId` tại `licenses` & `orders`, `assertNoPathTraversal` tại [upload.middleware.js](../server/src/middlewares/upload.middleware.js) |
| **Cryptography: Confidentiality & Integrity** | Dùng mật mã đối xứng bảo mật bí mật lưu trữ và hàm băm có khóa (MAC) bảo vệ tính toàn vẹn dữ liệu | `encryptAesGcm` / `decryptAesGcm` (`AES-256-GCM`) cho `license_keys`; `signOrderHmac` / `verifyOrderHmac` (`HMAC-SHA256`) cho `orders`; `computeSha256Hex` kiểm chứng tệp |
| **Secure File Handling & Transport** | Kiểm tra định dạng thực của tệp tải lên, đặt tên an toàn, không lộ đường dẫn vật lý | `validateImageMagicBytes()` + UUID `generateSafeFilename()`, tách riêng `uploads/assets/` khỏi `express.static` và cấp phát qua `Signed URL` 300s |
| **Auditing, Logging & Incident Response** | Lưu vết đầy đủ hành vi truy cập để chống chối bỏ (Non-repudiation) và phát hiện xâm nhập sớm | `writeAuditLog()` ([audit.util.js](../server/src/utils/audit.util.js)) ghi bảng `audit_logs` + giao diện Giám sát & `AI Security Log Analyzer` |

---

## PHẦN E — Checklist Chuẩn bị 15 Phút Trước giờ Bảo vệ

- [ ] PostgreSQL (Docker `seculicense_postgres` hoặc Neon Cloud SSL) đang chạy, `GET /api/health` trả về `database: "connected"`.
- [ ] Meilisearch (`seculicense_meilisearch`) đang chạy và đã đồng bộ đủ 45 sản phẩm số.
- [ ] Đã tạo sẵn 1 tài khoản `ADMIN` (đã quét mã QR 2FA vào điện thoại) và **2 tài khoản `CUSTOMER`** (Customer A đã có đơn hàng & license để thử IDOR từ Customer B).
- [ ] Chuẩn bị sẵn thư mục test nhanh gồm:
  - 1 ảnh hóa đơn/phiếu nhập rõ chữ để test **AI OCR**;
  - 1 bộ file `.xlsx`, `.json`, `.xml` hợp lệ ([specs/sample-files/](../specs/sample-files/));
  - 1 file `xxe_test.xml` (chứa `<!DOCTYPE`) và 1 file `fake_shell.jpg` (nội dung JS) để test **SEC-04** & **SEC-06**;
  - 1 file `.zip`/`.pdf` mẫu khớp `file_sha256` trong `server/uploads/assets/` để test **Signed URL 300s**.
- [ ] Kiểm tra micro trình duyệt Chrome/Edge cho Web Speech API và kết nối mạng ổn định cho Gemini API.
