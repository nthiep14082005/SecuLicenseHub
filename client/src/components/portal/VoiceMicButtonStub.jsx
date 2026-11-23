import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

/**
 * [Thành viên B] Nút tìm kiếm bằng giọng nói sử dụng Web Speech API (lang = 'vi-VN').
 */
export default function VoiceMicButtonStub({ onTranscript }) {
  const [listening, setListening] = useState(false);

  const handleVoiceClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.alert('Trình duyệt hiện tại chưa hỗ trợ Web Speech API (hãy dùng Chrome/Edge).');
      return;
    }
    // TODO [Thành viên B]: Hoàn thiện SpeechRecognition (lang = 'vi-VN') và gọi API /api/search
    setListening((prev) => !prev);
    if (!listening && onTranscript) {
      onTranscript('jetbrains');
    }
  };

  return (
    <button
      type="button"
      onClick={handleVoiceClick}
      title="Tìm kiếm bằng giọng nói (Web Speech API vi-VN)"
      className={`p-2 rounded-lg border transition ${
        listening
          ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
          : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
      }`}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
