import React, { useState } from 'react';
import { Bot, MessageSquare, Send, X } from 'lucide-react';

/**
 * [Thành viên B] Widget Chatbot AI Gemini tư vấn gói bản quyền theo tồn kho thật (POST /api/ai/chat).
 */
export default function AiChatbotWidgetStub() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open ? (
        <div className="w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-rose-100 via-white to-emerald-100 text-slate-900 border-b border-rose-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="text-sm font-semibold text-slate-900">Trợ lý AI SecuLicense</div>
                <div className="text-[11px] text-slate-600">Grounded Prompting theo kho thật</div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-900">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 h-56 overflow-y-auto text-xs space-y-2 bg-rose-50/30">
            <div className="p-2.5 rounded-xl bg-white border border-rose-100 text-slate-700">
              Xin chào! TODO [Thành viên B]: Kết nối <code>POST /api/ai/chat</code> để tư vấn gói bản quyền còn hàng và hiển thị thẻ sản phẩm bấm mua ngay.
            </div>
          </div>
          <div className="p-2.5 border-t border-rose-100 flex items-center gap-2 bg-white">
            <input
              type="text"
              placeholder="VD: Gợi ý IDE dưới 2 triệu..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500"
            />
            <button type="button" className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center gap-2 text-sm font-semibold transition"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Hỏi AI Tư vấn</span>
        </button>
      )}
    </div>
  );
}
