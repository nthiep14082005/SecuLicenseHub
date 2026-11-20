const { sendNotImplemented } = require('../../utils/response.util');
const chatbotService = require('./chatbot.service');

void chatbotService;

exports.chatWithAssistant = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'POST /api/ai/chat',
    todo: 'Truy vấn sản phẩm còn tồn kho (quantity > 0) từ PostgreSQL đưa vào system prompt Gemini (@google/genai), ép trả JSON { reply, recommendedProductIds }.'
  });
