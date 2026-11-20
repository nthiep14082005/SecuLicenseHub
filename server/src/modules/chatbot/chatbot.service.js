/**
 * ============================================================================
 * AI CHATBOT SERVICE SKELETON — TODO [Thành viên B]
 * ============================================================================
 * Kỹ thuật Grounded Prompting (chống bịa sản phẩm):
 * 1. SELECT product_id, product_name, product_type, price, quantity, description FROM products WHERE quantity > 0
 * 2. Gửi danh sách thật vào Gemini API (@google/genai)
 * 3. Ép model trả JSON { "reply": "...", "recommendedProductIds": [1, 2] }
 * 4. Đối chiếu ID trả về với danh sách thật trong DB trước khi gửi Frontend.
 */

module.exports = {};
