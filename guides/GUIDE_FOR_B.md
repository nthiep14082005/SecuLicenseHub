# GUIDE_FOR_B.md — Cẩm nang Thực chiến cho Thành viên B

> **Vai trò:** Seed 45 sản phẩm số & License Pool mã hóa, 5 trang Portal Khách hàng, Giao dịch nguyên tử (`FOR UPDATE` + `HMAC-SHA256` + VietQR), Kho License (`AES-256-GCM` + chống IDOR + `Signed URL` 300s), Meilisearch + Voice Search, Chatbot AI & AI Security Log Analyzer.
> **Nhánh Git riêng:** `feat/b-portal-crypto-ai`

> [!CAUTION]
> **CẢNH BÁO QUY TRÌNH GIT BẮT BUỘC CHO THÀNH VIÊN B (ĐỌC KỸ TRƯỚC KHI CHẠY LỆNH):**
> 1. Khi `git fetch` / kéo code mới nhất về để ghép hoặc chạy thử với code của Thành viên A, **BẮT BUỘC phải tạo một nhánh mới riêng biệt** (nhánh phát triển `feat/b-portal-crypto-ai` hoặc nhánh test ghép `test/b-integration`) rồi **merge code vào nhánh mới đó để test**.
> 2. **TUYỆT ĐỐI KHÔNG** commit, push, sửa code hay thao tác trực tiếp lên nhánh `main` và nhánh của Thành viên A (`feat/a-core-admin-hardening`).
>
> **Bộ lệnh Git mẫu chuẩn cho Thành viên B:**
> ```bash
> # A. Chuyển đúng sang nhánh làm việc của Thành viên B (tạo nếu chưa có ở local)
> git fetch origin
> git checkout feat/b-portal-crypto-ai || git checkout -b feat/b-portal-crypto-ai origin/feat/b-portal-crypto-ai
> git branch --show-current   # Phải hiện: feat/b-portal-crypto-ai
>
> # B. Khi cần kéo code mới của Thành viên A về ghép & test thử:
> git fetch origin
> git checkout -b test/b-integration feat/b-portal-crypto-ai
> git merge origin/feat/a-core-admin-hardening
> # (Chạy test trên test/b-integration; xong có thể quay lại feat/b-portal-crypto-ai để code tiếp)
>
> # C. Lưu & đẩy code của B lên GitHub (CHỈ push nhánh của B)
> git add <files_cua_B>
> git commit -m "feat(b): ..."
> git push -u origin feat/b-portal-crypto-ai
> ```

---

## 1. Phạm vi Thư mục được phép Sửa

### Backend (`server/`)
- `server/src/db/seed.js`
- `server/src/modules/licenses/*`
- `server/src/modules/search/*`
- `server/src/modules/chatbot/*`
- Phần Khách hàng của `server/src/modules/orders/*` (`createOrder`, `getMyOrders`, `verifyOrderIntegrity`)
- Phần gửi liên hệ công khai của `server/src/modules/contacts/*` (`createContact`)
- Phần AI Log Analyzer của `server/src/modules/security/*` (`analyzeAuditLogsWithAi`)

### Frontend (`client/`)
- `client/src/layouts/PortalLayout.jsx`
- `client/src/pages/portal/*` (`CatalogPage.jsx`, `ProductDetailPage.jsx`, `CheckoutPage.jsx`, `LicenseVaultPage.jsx`, `ContactPage.jsx`)
- `client/src/components/portal/*` (`SmartSearchBarStub.jsx`, `VoiceMicButtonStub.jsx`, `AiChatbotWidgetStub.jsx`, `LicenseRevealCardStub.jsx`)
- Panel kết quả AI Security Log Analyzer trong `client/src/pages/admin/AdminSecurityPage.jsx`
- Nút kiểm chứng HMAC trên `client/src/pages/admin/AdminOrdersPage.jsx`

> **KHÔNG sửa chéo** `middlewares/*`, `modules/{auth,products,ocr}`, `pages/auth/*`, `pages/admin/AdminProductsPage.jsx`.

---

## 2. Hướng dẫn Từng bước Triển khai

### Bước 1: Hoàn thiện `server/src/db/seed.js` (Dữ liệu thật + Mã hóa sẵn)
1. Mở rộng danh sách lên **45–50 tài nguyên số** trải đều 5 `ProductType` (`License Key`, `Source Code`, `Plugin & UI Kit`, `API Quota`, `E-Book Kỹ thuật`).
2. Tạo sẵn 2–3 tệp zip/pdf mẫu nhỏ trong `server/uploads/assets/` (ví dụ `node-auth-boilerplate-v2.zip`, `web-security-ebook.pdf`), tính mã băm `computeSha256Hex(fileBuffer)` lưu vào cột `products.file_sha256` và tên tệp vào `products.asset_filename`.
3. Với mỗi sản phẩm, sinh số lượng bản ghi tương ứng trong bảng `license_keys` có key dạng `SECU-<CODE>-<RANDOM>`, mã hóa bằng `encryptAesGcm(plainKey)` (từ `utils/crypto.util.js`) để lưu đủ `{ encrypted_key, iv, auth_tag }` với `status = 'AVAILABLE'`.
4. Tạo 1 tài khoản `ADMIN` (`admin@seculicense.vn`) và 2 tài khoản `CUSTOMER` (`customer1@seculicense.vn`, `customer2@seculicense.vn`) dùng `bcryptjs` salt 10 (lưu ý tạo 2 user khách hàng để tiện demo kiểm thử **IDOR** lúc bảo vệ!).

### Bước 2: Đặt hàng An toàn (`FOR UPDATE` + `HMAC-SHA256` + VietQR)
1. **`POST /api/orders` (bật `requireAuth`):**
   - Không đọc giá hay `totalAmount` từ `req.body`. Chỉ nhận `{ paymentMethod, note, items: [{ ProductID, Quantity }] }`.
   - Dùng `withTransaction(async (client) => ...)`:
     - Với từng mặt hàng: chạy `SELECT product_id, product_name, price, quantity FROM products WHERE product_id = $1 FOR UPDATE`. Nếu `quantity < item.Quantity`, ném lỗi `400` (rollback).
     - Trừ tồn kho `UPDATE products SET quantity = quantity - $1 WHERE product_id = $2`.
     - Chọn các key đang rảnh: `SELECT license_id FROM license_keys WHERE product_id = $1 AND status = 'AVAILABLE' LIMIT $2 FOR UPDATE` và cập nhật `status = 'ASSIGNED'`, `order_id`, `owner_user_id`, `assigned_at = NOW()`.
     - Tính `totalAmount` từ giá DB; tạo bản ghi `orders` rồi tính `integrityHmac = signOrderHmac({ orderId, userId, totalAmount, createdAt })` và `UPDATE orders SET integrity_hmac = $1 WHERE order_id = $2`.
   - Sinh URL QR động:
     `https://img.vietqr.io/image/${env.vietqr.bankId}-${env.vietqr.accountNo}-compact2.png?amount=${totalAmount}&addInfo=SECULICENSE_${orderId}`.
   - Ghi `writeAuditLog({ userId, action: 'ORDER_CREATED', ... })`.
2. **`GET /api/orders/:id/verify-integrity`:**
   - Truy vấn đơn hàng; kiểm tra quyền (`order.user_id === req.user.userId || req.user.role === 'ADMIN'`).
   - Gọi `verifyOrderHmac(...)` để xác minh đơn hàng không bị sửa tiền trực tiếp trong DB.

### Bước 3: Kho License (`AES-256-GCM` + Chống IDOR + `Signed URL` 300s)
1. **`GET /api/licenses/my`:** Truy vấn `license_keys` kết hợp `products` và `orders` với `WHERE lk.owner_user_id = $1`. **Không giải mã hàng loạt**, chỉ trả chuỗi che `XXXX-XXXX-••••`.
2. **`POST /api/licenses/:id/reveal`:**
   - Truy vấn `license_keys WHERE license_id = $1`.
   - **Kiểm tra IDOR:** Nếu `row.owner_user_id !== req.user.userId` (và không phải Admin hỗ trợ), ghi `writeAuditLog({ action: 'IDOR_KEY_REVEAL_BLOCKED', severity: 'CRITICAL', metadata: { targetLicenseId: id } })` và trả HTTP `403`.
   - Nếu hợp lệ: gọi `decryptAesGcm({ encryptedKey: row.encrypted_key, iv: row.iv, authTag: row.auth_tag })`, ghi `writeAuditLog({ action: 'LICENSE_REVEALED', severity: 'INFO' })` và trả key.
3. **`POST /api/licenses/:id/download-link` & `GET /api/licenses/download`:**
   - Kiểm tra quyền sở hữu license + đơn hàng đã `CONFIRMED` hoặc `COMPLETED` → gọi `createSignedDownloadToken({ licenseId, userId, filename })` (TTL 300 giây) → trả về `/api/licenses/download?token=...`.
   - Tại `GET /api/licenses/download`: gọi `verifySignedDownloadToken(req.query.token)` (nếu hết hạn/sai chữ ký → `403` + audit log), sau đó gọi `assertNoPathTraversal(assetsDir, payload.filename)` trước khi `res.download(safePath)`.

### Bước 4: Meilisearch + Web Speech API + Chatbot + AI Log Analyzer
1. **Meilisearch (`modules/search/`):** Hoàn thiện `syncProductsToMeilisearch()` (xuất đúng 10 trường PascalCase, cấu hình `searchableAttributes`, `filterableAttributes`, `sortableAttributes`) và `GET /api/search?q=...` tìm kiếm không dấu/sai chính tả.
2. **Voice Search (`VoiceMicButtonStub.jsx`):** Dùng `SpeechRecognition` với `lang = 'vi-VN'`, tự điền từ khóa vào `SmartSearchBar` và gọi `/api/search`.
3. **Chatbot AI (`POST /api/ai/chat`):** Truy vấn danh sách sản phẩm `quantity > 0` từ PostgreSQL, đưa vào prompt của `@google/genai`, ép trả JSON `{ "reply": "...", "recommendedProductIds": [...] }`, lọc lại các ID có thật trong DB để Frontend render thẻ sản phẩm mua ngay.
4. **AI Security Log Analyzer (`POST /api/ai/analyze-logs`):** Đọc N dòng mới nhất từ `audit_logs`, gửi sang Gemini yêu cầu tóm tắt ngắn gọn `{ riskLevel, summary, threats, recommendedActions }` hiển thị trên `AdminSecurityPage`.

---

## 3. Checklist Tự Kiểm thử của Thành viên B trước khi Merge `main`
- [ ] `npm run seed` nạp đủ 45 sản phẩm số + toàn bộ `license_keys` đều ở dạng ciphertext (`iv` + `auth_tag`), không có plaintext key nào trong DB.
- [ ] Đặt đơn hàng tạo thành công mã `VietQR`, sinh đúng `integrity_hmac`; thử sửa trực tiếp `total_amount` trong PostgreSQL thì `verify-integrity` báo `valid: false`.
- [ ] Customer #2 gọi `POST /api/licenses/<id_cua_Customer_1>/reveal` bị chặn `403` và xuất hiện dòng log `CRITICAL` trong `audit_logs`.
- [ ] Signed URL hết hạn sau 300s (hoặc sửa 1 ký tự token) trả `403`.
- [ ] Tìm kiếm không dấu / gõ sai chính tả (`"jetbrain"`) và Voice Search trả kết quả tức thì; Chatbot không bịa sản phẩm ngoài DB; AI Log Analyzer tóm tắt được các vụ tấn công thử nghiệm.
