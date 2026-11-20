/**
 * ============================================================================
 * MEILISEARCH SERVICE SKELETON — TODO [Thành viên B]
 * ============================================================================
 * - Cấu hình index env.meili.indexProducts ('seculicense_products')
 * - searchableAttributes: ['ProductName', 'ProductType', 'Description']
 * - filterableAttributes: ['ProductType', 'Price', 'Quantity']
 * - sortableAttributes: ['Price', 'CreateDate']
 */

/**
 * Hook được Thành viên A gọi sau khi Thêm / Sửa / Xóa / Sao chép / Import Product.
 * Bọc try/catch để lỗi Meilisearch (nếu dịch vụ chưa bật) không làm hỏng PostgreSQL Transaction.
 */
async function syncProductsToMeilisearch() {
  // TODO [Thành viên B]: Implement đẩy danh sách products mới nhất sang Meilisearch
  return { synced: false, reason: 'TODO [Thành viên B]: Chưa cấu hình đồng bộ Meilisearch' };
}

module.exports = {
  syncProductsToMeilisearch
};
