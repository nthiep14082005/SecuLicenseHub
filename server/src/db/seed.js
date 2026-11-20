/**
 * ============================================================================
 * SKELETON SEED SCRIPT — TODO [Thành viên B]
 * Mục tiêu:
 * 1. Nạp sẵn 1 tài khoản ADMIN và 2 tài khoản CUSTOMER (băm bcryptjs salt >= 10).
 * 2. Nạp 45 sản phẩm tài nguyên số đủ 5 ProductType:
 *    - "License Key" (Unit: "License" / "Key")
 *    - "Source Code" (Unit: "Gói")
 *    - "Plugin & UI Kit" (Unit: "Gói")
 *    - "API Quota" (Unit: "Quota")
 *    - "E-Book Kỹ thuật" (Unit: "Tài liệu")
 * 3. Sinh sẵn pool bản ghi license_keys cho từng sản phẩm và mã hóa bằng
 *    encryptAesGcm() từ ../utils/crypto.util.js (không lưu plaintext key trong DB).
 * 4. Tạo tệp demo mẫu trong server/uploads/assets/ và tính file_sha256 bằng
 *    computeSha256Hex() để hiển thị trên ProductDetailPage.
 * 5. Gọi syncProductsToMeilisearch() nếu Meilisearch đang bật.
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('./pool');
const { encryptAesGcm, computeSha256Hex } = require('../utils/crypto.util');

const STARTER_PRODUCTS = [
  {
    productName: 'JetBrains All Products Pack 1 Năm',
    pathImage: 'https://placehold.co/400x400/0f172a/38bdf8?text=JetBrains+Pack',
    productType: 'License Key',
    quantity: 10,
    unit: 'License',
    price: 1850000,
    description: 'Bản quyền trọn bộ IDE JetBrains chính hãng 12 tháng, cấp key mã hóa AES-256-GCM.'
  },
  {
    productName: 'Node.js Enterprise Auth & 2FA Boilerplate',
    pathImage: 'https://placehold.co/400x400/0f172a/34d399?text=Node+Auth+Kit',
    productType: 'Source Code',
    quantity: 15,
    unit: 'Gói',
    price: 790000,
    description: 'Mã nguồn mẫu Express + PostgreSQL tích hợp HttpOnly Cookie, 2FA TOTP & Audit Logs.'
  },
  {
    productName: 'Tailwind Pro SaaS & Security Admin UI Kit',
    pathImage: 'https://placehold.co/400x400/0f172a/a78bfa?text=Tailwind+UI+Kit',
    productType: 'Plugin & UI Kit',
    quantity: 20,
    unit: 'Gói',
    price: 450000,
    description: 'Bộ 120+ component React + Tailwind CSS tối ưu cho giao diện quản trị an toàn.'
  },
  {
    productName: 'Gemini & LLM Proxy API Quota 1M Tokens',
    pathImage: 'https://placehold.co/400x400/0f172a/fbbf24?text=API+Quota+1M',
    productType: 'API Quota',
    quantity: 30,
    unit: 'Quota',
    price: 290000,
    description: 'Gói 1.000.000 token API có rate-limit theo project key phục vụ Chatbot & OCR.'
  },
  {
    productName: 'Cẩm nang Web Security Thực chiến (E-Book)',
    pathImage: 'https://placehold.co/400x400/0f172a/f87171?text=Web+Sec+Ebook',
    productType: 'E-Book Kỹ thuật',
    quantity: 25,
    unit: 'Tài liệu',
    price: 180000,
    description: 'Tài liệu phòng chống SQLi, XSS, CSRF, XXE, IDOR và mật mã ứng dụng Node.js.'
  }
];

async function runSeedSkeleton() {
  console.log('[Seed Skeleton] Bắt đầu kiểm tra kết nối PostgreSQL...');
  console.log('[Seed Skeleton] Tham khảo helpers sẵn có:', {
    hasBcrypt: typeof bcrypt.hash === 'function',
    hasTransaction: typeof withTransaction === 'function',
    hasAesHelper: typeof encryptAesGcm === 'function',
    hasSha256Helper: typeof computeSha256Hex === 'function',
    starterCount: STARTER_PRODUCTS.length
  });

  // TODO [Thành viên B]:
  // 1. Mở rộng STARTER_PRODUCTS lên 45–50 tài nguyên số thực tế.
  // 2. Chạy withTransaction() để insert users (Admin/Customer), products, và license_keys mã hóa AES-256-GCM.
  // 3. Đồng bộ dữ liệu products sang Meilisearch.
  console.log('TODO [Thành viên B]: Hãy hoàn thiện script nạp 45 sản phẩm số & license_keys trong server/src/db/seed.js');
}

if (require.main === module) {
  runSeedSkeleton()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error('[Seed] Lỗi:', err.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runSeedSkeleton, STARTER_PRODUCTS };
