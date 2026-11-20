/**
 * ============================================================================
 * PRODUCTS SERVICE SKELETON (11 Chức năng + Hardening) — TODO [Thành viên A]
 * ============================================================================
 * Quy tắc bắt buộc:
 * - Luôn trả về đúng 10 trường PascalCase bằng mapProductRow()
 * - Dùng withTransaction() cho bulk-delete, bulk-clone, import
 * - XML Parser (fast-xml-parser): processEntities: false + từ chối <!DOCTYPE / <!ENTITY (chống XXE)
 * - Export .xlsx: gọi sanitizeExcelCell() cho mọi ô văn bản (chống Formula Injection)
 * - Gọi syncProductsToMeilisearch() trong try/catch sau mọi thao tác ghi
 */

module.exports = {};
