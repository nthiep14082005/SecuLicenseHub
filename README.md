# SecuLicense Hub — Nền tảng Quản lý, Phân phối Bản quyền Số An toàn & Trợ lý AI

**SecuLicense Hub** là dự án monorepo dùng **01 mã nguồn duy nhất** (**Node.js CommonJS + Express + PostgreSQL 16 + React/Vite + Tailwind CSS + Swagger UI**) được thiết kế chuẩn mực cho cả **02 môn học** — vừa hoàn chỉnh nghiệp vụ & AI (Môn 1), vừa tích hợp phòng thủ bảo mật Web thực chiến theo sách *Web Security Basics* (Môn 2).

---

## 1. Thông tin Khóa cứng (1 Mã nguồn — 2 Môn học)

| Hạng mục | Cấu hình chuẩn của dự án |
| :--- | :--- |
| **Đề tài Môn 1 (*Ngôn ngữ kịch bản*)** | *Xây dựng Hệ thống Quản lý & Phân phối Bản quyền Phần mềm, Tài nguyên Số tích hợp Tìm kiếm thông minh và Trợ lý AI* |
| **Đề tài Môn 2 (*Phát triển phần mềm web an toàn*)** | *Thiết kế và Xây dựng Nền tảng Phân phối Bản quyền Số An toàn phòng chống lỗ hổng Web* |
| **Giáo trình & Chuẩn tham chiếu** | *Web Security Basics — Shweta Bhasin (Premier Press, 2003)* & **OWASP Top 10** |
| **Tech Stack cố định** | **Backend:** Node.js 20+ (Express CommonJS) · **DB:** PostgreSQL 16 (Docker Local & Neon Serverless SSL) · **Frontend:** React 18 + Vite + Tailwind CSS · **API Docs:** Swagger UI (`/docs`) · **Search/AI:** Meilisearch + Web Speech API + Gemini (`@google/genai`) |
| **Nhóm thực hiện (2 thành viên)** | **Thành viên A** (`feat/a-core-admin-hardening`) & **Thành viên B** (`feat/b-portal-crypto-ai`) |
| **10 trường `Product` khóa cứng** | `ProductID`, `ProductName`, `PathImage`, `ProductType`, `Quantity`, `Unit`, `Price`, `Description`, `CreateDate`, `UpdateDate` |
| **Danh mục tài nguyên số** | `ProductType`: `License Key`, `Source Code`, `Plugin & UI Kit`, `API Quota`, `E-Book Kỹ thuật` \| `Unit`: `Key`, `Gói`, `License`, `Quota`, `Tài liệu` |

---

## 2. Bộ Tài liệu Đọc & Bản đồ "Bắt đầu từ đâu?"

Hãy mở đúng tài liệu theo vai trò của bạn ngay khi clone repo:

| Vai trò | Thứ tự đọc bắt buộc | Mục đích |
| :--- | :--- | :--- |
| **Giảng viên / Người xem mới** | 1. [guides/PROJECT_OVERVIEW.md](guides/PROJECT_OVERVIEW.md)<br>2. [guides/DEFENSE_DUAL_COURSE.md](guides/DEFENSE_DUAL_COURSE.md)<br>3. Đề cương: [NNKB (.docx)](guides/proposals/De_Cuong_NNKB_SecuLicense_Hub.docx) · [Web An Toàn (.docx)](guides/proposals/De_Cuong_WebAnToan_SecuLicense_Hub.docx) | Nắm mô hình 1 mã nguồn 2 môn, sơ đồ phòng thủ 4 lớp, kịch bản demo và bộ test `FUNC-01..12` / `SEC-01..08`. |
| **Thành viên A**<br>(`feat/a-core-admin-hardening`) | 1. [DEV_RULES.md](DEV_RULES.md)<br>2. [guides/GUIDE_FOR_A.md](guides/GUIDE_FOR_A.md)<br>3. [guides/AI_PROMPTS.md](guides/AI_PROMPTS.md) | Nắm hợp đồng 10 cột, ranh giới sở hữu, hướng dẫn làm Auth/2FA, Product 11 CN + Hardening, OCR & Audit Logs. |
| **Thành viên B**<br>(`feat/b-portal-crypto-ai`) | 1. [DEV_RULES.md](DEV_RULES.md)<br>2. [guides/GUIDE_FOR_B.md](guides/GUIDE_FOR_B.md)<br>3. [guides/AI_PROMPTS.md](guides/AI_PROMPTS.md) | Nắm hợp đồng 10 cột, hướng dẫn làm Seed 45 sản phẩm, 5 trang Portal, Checkout VietQR/HMAC, AES Vault/Signed URL, Meilisearch/Voice, Chatbot & AI Log Analyzer. |
| **Tiến độ chung 4 tuần** | [WORKPLAN.md](WORKPLAN.md) | Theo dõi checklist công việc theo tuần và mốc ghép nhánh `main`. |

> [!IMPORTANT]
> **Quy tắc khi dùng AI hỗ trợ code:** Thành viên A và Thành viên B **bắt buộc** cho AI đọc [DEV_RULES.md](DEV_RULES.md) + [guides/GUIDE_FOR_A.md](guides/GUIDE_FOR_A.md) (hoặc [guides/GUIDE_FOR_B.md](guides/GUIDE_FOR_B.md)). Hãy copy mẫu prompt sẵn trong **[guides/AI_PROMPTS.md](guides/AI_PROMPTS.md)** để AI không bao giờ sửa chéo thư mục hoặc phá vỡ chuẩn bảo mật của nhóm.

---

## 3. Toàn cảnh Tính năng & Bảo mật Dự án (Đang có vs. Sẽ hoàn thiện)

### 3.1. Những gì ĐÃ TÍCH HỢP & CHẠY THẬT SẴN trong bộ khung hiện tại

- **Hạ tầng & Hợp đồng CSDL / API:**
  - Script PostgreSQL 7 bảng chuẩn + trigger `trg_products_update_date` + index tại [specs/init.sql](specs/init.sql) (`users`, `products`, `orders`, `order_details`, `license_keys`, `contacts`, `audit_logs`).
  - Đặc tả OpenAPI 3.0.3 ([specs/openapi.json](specs/openapi.json)) gắn sẵn **Swagger UI trực quan tại `/docs`** và file JSON thô tại `/docs.json` (hỗ trợ test API ngay trên trình duyệt không cần Postman, hoặc import sang Postman nếu muốn).
  - Bộ dữ liệu mẫu test Import JSON/XML tại [specs/sample-files/](specs/sample-files/).
  - Kết nối PostgreSQL tại [server/src/db/pool.js](server/src/db/pool.js) tự động nhận diện **Docker local** lẫn **Neon Serverless PostgreSQL SSL** (`neon.tech` / `sslmode=require`), xuất sẵn `withTransaction()` và `mapProductRow()`.
  - Endpoint `GET /api/health` kiểm tra kết nối Express + PostgreSQL chạy thật ngay.
- **Lõi Bảo mật đã cài đặt & kiểm thử sẵn:**
  - [server/src/utils/crypto.util.js](server/src/utils/crypto.util.js): `encryptAesGcm` / `decryptAesGcm` (`AES-256-GCM`), `signOrderHmac` / `verifyOrderHmac` (`HMAC-SHA256`), `createSignedDownloadToken` / `verifySignedDownloadToken` (TTL 300s), `computeSha256Hex`, `sanitizeExcelCell` (chống Excel Formula Injection).
  - [server/src/utils/audit.util.js](server/src/utils/audit.util.js): hàm `writeAuditLog()` ghi nhật ký chống chối bỏ vào `audit_logs`.
  - [server/src/middlewares/security.middleware.js](server/src/middlewares/security.middleware.js): `apiLimiter`, `authLimiter`, `sanitizeInput` (`xss`), `csrfOriginGuard`, kết hợp `helmet` (CSP tách riêng `/api` và `/docs`), `cors` (`credentials: true`) và `cookie-parser` trong [server/src/index.js](server/src/index.js).
  - [server/src/middlewares/upload.middleware.js](server/src/middlewares/upload.middleware.js): `validateImageMagicBytes` (PNG/JPG/WEBP), `generateSafeFilename` (UUID), `assertNoPathTraversal`.
  - [client/src/api/axiosClient.js](client/src/api/axiosClient.js): cấu hình `withCredentials: true` sẵn sàng cho `HttpOnly Cookie`.
- **Khung Ứng dụng chờ A & B hoàn thiện nghiệp vụ:**
  - **Backend (`server/src/modules/`):** 9 nhóm router đã mount hoàn chỉnh tại `server/src/index.js`, hiện trả về HTTP `501 Not Implemented` kèm chỉ dẫn `TODO [Thành viên A / Thành viên B]`.
  - **Frontend (`client/`):** Bộ khung React + Vite + Tailwind CSS đã build sạch `0 errors` với đầy đủ Layout (`PortalLayout`, `AdminLayout`), Context (`AuthContext`, `CartContext`), 10 trang giao diện điều hướng và các component stub.

### 3.2. Tổng hợp ĐẦY ĐỦ chức năng & bảo mật mục tiêu của toàn dự án (Cả 2 Môn)

#### A. Môn Ngôn ngữ kịch bản (Nghiệp vụ, CRUD `Product` 11 CN & 4 Tính năng AI/Search)
- **9+ Form nghiệp vụ đầy đủ:** Đăng nhập (+ 2FA), Đăng ký (+ độ mạnh mật khẩu), Danh sách gói bản quyền, Chi tiết sản phẩm (+ SHA-256), Giỏ hàng & Thanh toán VietQR, Kho License & Lịch sử hóa đơn, Liên hệ hỗ trợ, Quản trị `Product` (11 CN), Quản trị Hóa đơn & Nhật ký Bảo mật AI.
- **Module `Product` chuẩn 10 cột (`ProductID` → `UpdateDate`) & trọn bộ 11 chức năng:**
  1. Phân trang (10–15 dòng/trang) & lọc; 2. Thêm mới; 3. Cập nhật; 4. Xem chi tiết; 5. Xóa 1 bản ghi; 6. Xóa nhiều bản ghi (checkbox + Transaction); 7. Sao chép 1 bản ghi; 8. Sao chép nhiều bản ghi (checkbox + Transaction); 9. Import & Export đủ 3 định dạng `.xlsx`, `.json`, `.xml` (kèm báo lỗi từng dòng); 10. Ẩn/Hiện cột Table lưu `localStorage` (`seculicense_admin_visible_columns`); 11. Đủ 10 phím tắt CRUD (`Alt+N`, `Alt+S`, `Alt+E`, `Alt+V`, `Alt+D`, `Alt+C`, `Alt+I`, `Alt+X`, `Alt+H`, `Esc`).
- **4 Kỹ thuật AI & Tìm kiếm thông minh:**
  1. **Chatbot AI Gemini (`POST /api/ai/chat`)** tư vấn gói bản quyền theo tồn kho PostgreSQL thật (*Grounded Prompting*);
  2. **AI OCR (`POST /api/ai/ocr-product`)** đọc ảnh hóa đơn/phiếu nhập tự động điền form thêm mới;
  3. **Meilisearch (`GET /api/search`) + Voice Search (`vi-VN`)** tìm kiếm tiếng Việt không dấu, chịu lỗi chính tả;
  4. **AI Security Log Analyzer (`POST /api/ai/analyze-logs`)** phát hiện bất thường từ `audit_logs`.

#### B. Môn Phát triển phần mềm web an toàn (8 Trụ cột Phòng thủ Web + `SEC-01` → `SEC-08`)
1. **Auth & Session an toàn:** Mật khẩu mạnh băm `bcryptjs` (salt ≥ 10); Lockout 15 phút sau 5 lần sai + `authLimiter`; **2FA TOTP** cho Admin (`otplib` + `qrcode`); JWT lưu trong `HttpOnly`, `SameSite=Strict`, `Secure` (prod) Cookie.
2. **Chống SQL Injection:** 100% truy vấn sử dụng Parameterized Query (`$1, $2...`), không nối chuỗi SQL.
3. **Chống XSS, CSRF & Clickjacking:** `Helmet` CSP & `X-Frame-Options`, làm sạch đầu vào `sanitizeInput` (`xss`), `SameSite=Strict` + `csrfOriginGuard` + CORS whitelist.
4. **Chống XXE & XML Bomb:** `fast-xml-parser` đặt `processEntities: false`, chặn tuyệt đối `<!DOCTYPE` và `<!ENTITY` trước khi parse XML Import, giới hạn file 5 MB.
5. **Chống Excel Formula Injection:** Escape tiền tố `=`, `+`, `-`, `@`, `\t`, `\r` qua `sanitizeExcelCell()` khi xuất `.xlsx`.
6. **Chống Upload độc hại & Path Traversal:** Không tin đuôi file; kiểm tra Magic Bytes thực tế (PNG/JPG/WEBP), đổi tên UUID và khóa đường dẫn tải file qua `assertNoPathTraversal()`.
7. **Bảo vệ Tài sản số & Toàn vẹn Giao dịch:** Mã hóa `license_keys` bằng `AES-256-GCM` (`encrypted_key`, `iv`, `auth_tag`); chống IDOR (`owner_user_id === req.user.userId`); chống Price Tampering bằng Transaction `SELECT ... FOR UPDATE` + chữ ký `HMAC-SHA256`; kiểm chứng tệp `SHA-256` & phát hành file qua `Signed URL` hết hạn 300s.
8. **Kiểm toán chống chối bỏ & AI Security Log Analyzer:** Ghi mọi hành vi nhạy cảm/tấn công vào `audit_logs` và kiểm thử đủ 8 ca `SEC-01` → `SEC-08` trong [guides/DEFENSE_DUAL_COURSE.md](guides/DEFENSE_DUAL_COURSE.md).

---

## 4. Cấu trúc Thư mục (Monorepo — Phân tách Sở hữu A & B)

```text
NNKB_NODEJS/
├── README.md                               # [CHUNG] Trang chủ dự án, bản đồ tài liệu & Quick Start
├── DEV_RULES.md                            # [CHUNG] Luật kỹ thuật, Schema 10 cột, 9 Luật Bảo mật & ranh giới A/B
├── WORKPLAN.md                             # [CHUNG] Lộ trình 4 tuần cho cả 2 môn
├── .env.example                            # [CHUNG] Biến môi trường mẫu (PG/Neon, JWT, AES, HMAC, Meili, Gemini)
├── .gitignore                              # [CHUNG] Chặn .env, node_modules, client/dist, uploads/*
├── docker-compose.yml                      # [CHUNG] PostgreSQL 16 + Meilisearch (mount specs/init.sql)
│
├── specs/                                  # [CHUNG - KHÓA CỨNG]
│   ├── init.sql                            # 7 bảng PostgreSQL + Trigger + Index
│   ├── openapi.json                        # Đặc tả OpenAPI 3.0.3 cho Swagger UI /docs
│   └── sample-files/                       # products_sample.json & products_sample.xml
│
├── guides/                                 # [CHUNG - TÀI LIỆU NHÓM & BẢO VỆ]
│   ├── PROJECT_OVERVIEW.md                 # Tổng quan 1 mã nguồn 2 môn, sơ đồ Defense-in-Depth & thuật ngữ
│   ├── GUIDE_FOR_A.md                      # Cẩm nang từng bước cho Thành viên A
│   ├── GUIDE_FOR_B.md                      # Cẩm nang từng bước cho Thành viên B
│   ├── AI_PROMPTS.md                       # Mẫu prompt copy-paste cho AI theo đúng ranh giới A & B
│   ├── DEFENSE_DUAL_COURSE.md              # Demo 8p/10p + Bộ Test Case FUNC-01..12 & SEC-01..08
│   └── proposals/                          # Thư mục lưu 2 file đề cương Word (.docx) của 2 môn
│
├── server/                                 # Backend Node.js (Express CommonJS)
│   ├── package.json
│   ├── uploads/                            # Ảnh upload, tạm OCR & tài sản số (.gitkeep giữ cấu trúc)
│   └── src/
│       ├── index.js                        # [CHUNG] Helmet, CORS, CookieParser, RateLimit, Swagger /docs, Health
│       ├── config/                         # [CHUNG] env.js, swagger.js
│       ├── db/
│       │   ├── pool.js                     # [CHUNG] PG Pool (Docker + Neon SSL), withTransaction, mapProductRow
│       │   └── seed.js                     # [NGƯỜI B] Script nạp 45 sản phẩm số & license_keys mã hóa AES
│       ├── utils/                          # [CHUNG] crypto.util.js, audit.util.js, response.util.js
│       ├── middlewares/                    # [NGƯỜI A] auth, security, upload, error
│       └── modules/
│           ├── auth/                       # [NGƯỜI A] Đăng ký, Đăng nhập Cookie/Lockout, Logout, 2FA TOTP, /me
│           ├── products/                   # [NGƯỜI A] 11 CN Product + Import/Export chống XXE & Formula Injection
│           ├── ocr/                        # [NGƯỜI A] POST /api/ai/ocr-product (Gemini Vision)
│           ├── orders/                     # [NGƯỜI B & A] B: Đặt đơn FOR UPDATE + HMAC + VietQR; A: Duyệt đơn
│           ├── licenses/                   # [NGƯỜI B] Giải mã AES-256-GCM chống IDOR & Signed URL 300s
│           ├── contacts/                   # [NGƯỜI B & A] B: Gửi liên hệ chống XSS; A: Xem & xử lý
│           ├── search/                     # [NGƯỜI B] Meilisearch đồng bộ & tìm kiếm không dấu/sai chính tả
│           ├── chatbot/                    # [NGƯỜI B] Chatbot AI Gemini tư vấn theo tồn kho thật
│           └── security/                   # [NGƯỜI A & B] A: Audit Logs; B: POST /api/ai/analyze-logs
│
└── client/                                 # Frontend React 18 + Vite + Tailwind CSS
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx                         # [CHUNG / A bật Guard] Router 10 trang + AdminGuard
        ├── api/axiosClient.js              # [CHUNG] Axios bật withCredentials: true
        ├── context/                        # [CHUNG] AuthContext.jsx, CartContext.jsx
        ├── layouts/                        # PortalLayout.jsx [NGƯỜI B] & AdminLayout.jsx [NGƯỜI A]
        ├── components/
        │   ├── admin/                      # [NGƯỜI A] ProductTableStub, ColumnToggleStub, ShortcutModalStub, OcrUploaderStub, ImportExportBarStub
        │   └── portal/                     # [NGƯỜI B] SmartSearchBarStub, VoiceMicButtonStub, AiChatbotWidgetStub, LicenseRevealCardStub
        └── pages/
            ├── auth/                       # [NGƯỜI A] LoginPage.jsx (+2FA), RegisterPage.jsx (+Password Meter)
            ├── portal/                     # [NGƯỜI B] CatalogPage, ProductDetailPage, CheckoutPage, LicenseVaultPage, ContactPage
            └── admin/                      # [NGƯỜI A & B] AdminProductsPage, AdminOrdersPage, AdminSecurityPage
```

---

## 5. Hướng dẫn Quick Start sau khi Clone (Chạy — Build — Test nhanh)

> **Ghi chú:** Dưới đây là 5 bước khởi chạy bộ khung nhanh nhất. Hướng dẫn cài đặt logic từng module nằm trong [guides/GUIDE_FOR_A.md](guides/GUIDE_FOR_A.md) & [guides/GUIDE_FOR_B.md](guides/GUIDE_FOR_B.md); kịch bản test đầy đủ nằm ở [guides/DEFENSE_DUAL_COURSE.md](guides/DEFENSE_DUAL_COURSE.md).

### Bước 1: Clone repo & chuyển sang đúng nhánh làm việc
```bash
git clone <URL_GITHUB_REPO_CUA_NHOM>
cd NNKB_NODEJS

# Thành viên A chạy:
git checkout feat/a-core-admin-hardening
# Thành viên B chạy:
git checkout feat/b-portal-crypto-ai
```

### Bước 2: Tạo file `.env` từ `.env.example` & sinh khóa bí mật
Sao chép [.env.example](.env.example) thành `.env` (hoặc dán file `.env` Trưởng nhóm gửi riêng qua kênh bảo mật) và điền `GEMINI_API_KEY`. Có thể sinh nhanh 4 chuỗi bí mật (`JWT_SECRET`, `AES_256_SECRET_HEX`, `HMAC_ORDER_SECRET`, `SIGNED_URL_SECRET`) bằng 1 lệnh Node.js:
```bash
node -e "const c=require('crypto'); console.log('JWT_SECRET='+c.randomBytes(32).toString('hex')); console.log('AES_256_SECRET_HEX='+c.randomBytes(32).toString('hex')); console.log('HMAC_ORDER_SECRET='+c.randomBytes(32).toString('hex')); console.log('SIGNED_URL_SECRET='+c.randomBytes(32).toString('hex'));"
```

### Bước 3: Khởi động Cơ sở dữ liệu (Chọn 1 trong 2 cách)
- **(a) Docker Local (PostgreSQL 16 + Meilisearch):**
  ```bash
  docker compose up -d
  ```
  *(Container PostgreSQL tự nạp [specs/init.sql](specs/init.sql) ở lần khởi tạo đầu tiên.)*
- **(b) Neon Serverless PostgreSQL (Cloud):**
  Dán chuỗi `DATABASE_URL` có `?sslmode=require` từ Neon Console vào `.env`, sau đó chạy toàn bộ nội dung [specs/init.sql](specs/init.sql) trong **Neon SQL Editor**. ([pool.js](server/src/db/pool.js) tự động bật SSL khi phát hiện `neon.tech` hoặc `sslmode=require`.)

### Bước 4: Cài đặt & chạy Backend + Frontend
```bash
npm --prefix server install
npm --prefix client install

# Mở Terminal 1 — chạy Backend API (cổng 5000):
npm --prefix server run dev

# Mở Terminal 2 — chạy Frontend Vite (cổng 5173):
npm --prefix client run dev
```

### Bước 5: Smoke Test & Kiểm tra Build
1. Mở **Swagger UI** tại `http://localhost:5000/docs`, bấm vào `GET /api/health` → **Try it out** → **Execute**: kỳ vọng HTTP `200 OK` và JSON `"database": "connected"`. *(Các route nghiệp vụ ở trạng thái skeleton sẽ trả `501 Not Implemented` kèm hướng dẫn `TODO A/B`.)*
2. Mở Frontend tại `http://localhost:5173` (Portal Khách hàng) và `http://localhost:5173/admin/products` (Khu vực Quản trị).
3. Chạy build kiểm tra sản phẩm Frontend không lỗi:
   ```bash
   npm --prefix client run build
   ```

---

## 6. Quy trình Git Nhóm (Chống xung đột code)

1. **Không commit trực tiếp lên `main`:** Nhánh `main` chỉ giữ code sạch đã kiểm thử. A luôn code trên `feat/a-core-admin-hardening`, B luôn code trên `feat/b-portal-crypto-ai`.
2. **Không sửa chéo thư mục:** Tuân thủ đúng bảng ranh giới trong [DEV_RULES.md](DEV_RULES.md). Nếu cần chỉnh file dùng chung (`specs/`, `utils/`, `index.js`), hai bạn thống nhất trước khi sửa.
3. **Tuyệt đối không commit bí mật:** Không push `.env`, API key, `node_modules/`, `client/dist/` hay ảnh thật trong `server/uploads/`.
4. **Đồng bộ & Merge định kỳ:** Cuối Tuần 2 và Tuần 3–4 mở Pull Request về `main`, review chéo và chạy test lại toàn luồng trước khi chốt code.

---

## 7. Tham khảo nhanh Tài liệu Bảo vệ & Đề cương 2 Môn

- **Kịch bản Demo 8p/10p & Bộ Test Case `FUNC-01..12` + `SEC-01..08`:** [guides/DEFENSE_DUAL_COURSE.md](guides/DEFENSE_DUAL_COURSE.md)
- **Tổng quan Kiến trúc & Thuật ngữ 2 môn:** [guides/PROJECT_OVERVIEW.md](guides/PROJECT_OVERVIEW.md)
- **Đề cương Môn Ngôn ngữ kịch bản:** [guides/proposals/De_Cuong_NNKB_SecuLicense_Hub.docx](guides/proposals/De_Cuong_NNKB_SecuLicense_Hub.docx)
- **Đề cương Môn Phát triển phần mềm web an toàn:** [guides/proposals/De_Cuong_WebAnToan_SecuLicense_Hub.docx](guides/proposals/De_Cuong_WebAnToan_SecuLicense_Hub.docx)
