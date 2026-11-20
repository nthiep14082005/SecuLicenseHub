const express = require('express');
const chatbotController = require('./chatbot.controller');

const router = express.Router();

router.post('/chat', chatbotController.chatWithAssistant);

module.exports = router;
