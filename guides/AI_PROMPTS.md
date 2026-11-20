# AI_PROMPTS.md — Bộ Prompt Chuẩn Giao việc cho AI trong IDE (Thành viên A & B)

> **Quy tắc bắt buộc:** Trước khi nhờ AI (Cursor, GitHub Copilot, Antigravity, Claude, ChatGPT...) viết code cho bất kỳ tính năng nào trong **SecuLicense Hub**, hãy copy nguyên mẫu prompt của đúng vai trò mình và điền nhiệm vụ vào dòng cuối. Điều này đảm bảo AI dùng **đúng tên bảng/cột**, **đúng helper bảo mật sẵn có** và **tuyệt đối không sửa chéo thư mục của người còn lại**.

---

## Mẫu 1 — Prompt Chuẩn cho Thành viên A (`feat/a-core-admin-hardening`)

```text
Bạn đang đóng vai Senior Backend & Security Engineer hỗ trợ THÀNH VIÊN A trên nhánh Git `feat/a-core-admin-hardening` của dự án SecuLicense Hub.

### BƯỚC 1 — ĐỌC BẮT BUỘC TRƯỚC KHI VIẾT BẤT KỲ DÒNG CODE NÀO
1. `DEV_RULES.md`
2. `guides/GUIDE_FOR_A.md`
3. `specs/init.sql`
4. `specs/openapi.json`
5. Các helper sẵn có:
   - `server/src/db/pool.js` (`pool`, `query`, `withTransaction`, `mapProductRow`)
   - `server/src/utils/response.util.js` (`sendSuccess`, `sendError`)
   - `server/src/utils/crypto.util.js` (`sanitizeExcelCell`, `computeSha256Hex`)
   - `server/src/utils/audit.util.js` (`writeAuditLog`)
   - `server/src/middlewares/auth.middleware.js` (`requireAuth`, `requireRole`)
   - `server/src/middlewares/upload.middleware.js` (`validateImageMagicBytes`, `generateSafeFilename`)

### BƯỚC 2 — RANH GIỚI SỞ HỮU (TUYỆT ĐỐI KHÔNG SỬA CHÉO)
- CHỈ ĐƯỢC PHÉP SỬA các file thuộc quyền Thành viên A:
  - `server/src/middlewares/*`
  - `server/src/modules/auth/*`, `server/src/modules/products/*`, `server/src/modules/ocr/*`
  - Phần Admin trong `server/src/modules/orders/*` (`listAllOrders`, `updateOrderStatus`), `server/src/modules/contacts/*` (`listContacts`, `resolveContact`), `server/src/modules/security/*` (`listAuditLogs`, `getSecuritySummary`)
  - `client/src/layouts/AdminLayout.jsx`, `client/src/pages/auth/*`, `client/src/pages/admin/AdminProductsPage.jsx`, `client/src/pages/admin/AdminOrdersPage.jsx` (phần duyệt đơn), `client/src/pages/admin/AdminSecurityPage.jsx` (bảng `audit_logs`), `client/src/components/admin/*`, `client/src/App.jsx` (AdminGuard)
- VÙNG CẤM SỬA: `.env`, `specs/init.sql`, `server/src/db/seed.js`, `server/src/modules/{licenses,search,chatbot}/*`, `client/src/pages/portal/*`, `client/src/components/portal/*`, `client/src/layouts/PortalLayout.jsx`.

### BƯỚC 3 — QUY CHUẨN KỸ THUẬT CỨNG
- `server/` dùng 100% CommonJS (`require` / `module.exports`).
- `client/` dùng React + Vite + Tailwind CSS + `client/src/api/axiosClient.js` (`withCredentials: true`).
- Mọi truy vấn PostgreSQL dùng 100% Parameterized Query (`$1, $2...`).
- Mọi API trả về `Product` BẮT BUỘC đi qua `mapProductRow()` giữ nguyên 10 key PascalCase (`ProductID`..`UpdateDate`, `Price` là `Number`).
- Tái sử dụng `withTransaction()`, `writeAuditLog()`, `sanitizeExcelCell()`, `validateImageMagicBytes()`, `generateSafeFilename()`; gọi `syncProductsToMeilisearch()` bọc `try/catch` sau mọi thao tác ghi `products`.
- Import XML bắt buộc chặn `<!DOCTYPE` / `<!ENTITY` và cấu hình `new XMLParser({ processEntities: false })`.

### NHIỆM VỤ CỤ THỂ CẦN LÀM NGAY:
[Điền nhiệm vụ cụ thể tại đây — Ví dụ: "Hoàn thiện module Auth trong server/src/modules/auth/* hỗ trợ đăng ký bcryptjs >=10, đăng nhập HttpOnly Cookie, khóa 15 phút sau 5 lần sai và 2FA TOTP cho Admin."]
```

---

## Mẫu 2 — Prompt Chuẩn cho Thành viên B (`feat/b-portal-crypto-ai`)

```text
Bạn đang đóng vai Senior Fullstack & AppSec Engineer hỗ trợ THÀNH VIÊN B trên nhánh Git `feat/b-portal-crypto-ai` của dự án SecuLicense Hub.

### BƯỚC 1 — ĐỌC BẮT BUỘC TRƯỚC KHI VIẾT BẤT KỲ DÒNG CODE NÀO
1. `DEV_RULES.md`
2. `guides/GUIDE_FOR_B.md`
3. `specs/init.sql`
4. `specs/openapi.json`
5. Các helper sẵn có:
   - `server/src/db/pool.js` (`pool`, `query`, `withTransaction`, `mapProductRow`)
   - `server/src/utils/response.util.js` (`sendSuccess`, `sendError`)
   - `server/src/utils/crypto.util.js` (`encryptAesGcm`, `decryptAesGcm`, `signOrderHmac`, `verifyOrderHmac`, `createSignedDownloadToken`, `verifySignedDownloadToken`, `computeSha256Hex`)
   - `server/src/utils/audit.util.js` (`writeAuditLog`)
   - `server/src/middlewares/upload.middleware.js` (`assertNoPathTraversal`)

### BƯỚC 2 — RANH GIỚI SỞ HỮU (TUYỆT ĐỐI KHÔNG SỬA CHÉO)
- CHỈ ĐƯỢC PHÉP SỬA các file thuộc quyền Thành viên B:
  - `server/src/db/seed.js`
  - `server/src/modules/licenses/*`, `server/src/modules/search/*`, `server/src/modules/chatbot/*`
  - Phần Khách hàng trong `server/src/modules/orders/*` (`createOrder`, `getMyOrders`, `verifyOrderIntegrity`), `server/src/modules/contacts/*` (`createContact`), và hàm `analyzeAuditLogsWithAi` trong `server/src/modules/security/*`
  - `client/src/layouts/PortalLayout.jsx`, `client/src/pages/portal/*`, `client/src/components/portal/*`, panel AI Log Analyzer trong `client/src/pages/admin/AdminSecurityPage.jsx`, nút Verify HMAC trong `client/src/pages/admin/AdminOrdersPage.jsx`
- VÙNG CẤM SỬA: `.env`, `specs/init.sql`, `server/src/middlewares/*`, `server/src/modules/{auth,products,ocr}/*`, `client/src/pages/auth/*`, `client/src/pages/admin/AdminProductsPage.jsx`, `client/src/components/admin/*`.

### BƯỚC 3 — QUY CHUẨN KỸ THUẬT CỨNG
- `server/` dùng 100% CommonJS (`require` / `module.exports`).
- `client/` dùng React + Vite + Tailwind CSS + `client/src/api/axiosClient.js` (`withCredentials: true`).
- Mọi truy vấn PostgreSQL dùng 100% Parameterized Query (`$1, $2...`).
- Đặt hàng `POST /api/orders` BẮT BUỘC chạy trong `withTransaction()` với `SELECT ... FOR UPDATE`, tính tiền theo giá DB (không tin giá từ client), gán `license_keys` từ `AVAILABLE` sang `ASSIGNED`, ký `signOrderHmac()` và tạo URL VietQR chuẩn `SECULICENSE_<ORDER_ID>`.
- Giải mã License (`POST /api/licenses/:id/reveal`) BẮT BUỘC kiểm tra `owner_user_id === req.user.userId` (chống IDOR -> 403 + `writeAuditLog` mức `CRITICAL`) trước khi gọi `decryptAesGcm()`.
- Tải file qua `GET /api/licenses/download` phải kiểm tra `verifySignedDownloadToken()` (TTL 300s) + `assertNoPathTraversal()`.

### NHIỆM VỤ CỤ THỂ CẦN LÀM NGAY:
[Điền nhiệm vụ cụ thể tại đây — Ví dụ: "Hoàn thiện server/src/db/seed.js nạp 1 Admin, 2 Customer, 45 sản phẩm số đủ 5 ProductType, tệp mẫu kèm SHA-256 trong server/uploads/assets/ và pool license_keys mã hóa AES-256-GCM."]
```

---

## Mẹo chia nhỏ nhiệm vụ hiệu quả khi dùng AI
- **Đừng gộp quá nhiều module trong 1 lượt prompt:** Hãy chạy từng module một (ví dụ Thành viên A: `auth` → `products CRUD/Bulk` → `products Import/Export` → `ocr` → `security audit`; Thành viên B: `seed.js` → `orders + VietQR` → `licenses + Signed URL` → `search + voice` → `chatbot` → `AI log analyzer`).
- **Sau mỗi module:** Mở ngay `http://localhost:5000/docs` để test endpoint vừa viết và đối chiếu với checklist trong [DEFENSE_DUAL_COURSE.md](DEFENSE_DUAL_COURSE.md).
