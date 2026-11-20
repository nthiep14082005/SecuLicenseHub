import React, { useState } from 'react';
import { Bot, ShieldAlert } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const DEMO_LOGS = [
  {
    logId: 501,
    severity: 'HIGH',
    action: 'LOGIN_FAILED_LOCKOUT',
    resource: 'POST /api/auth/login',
    ipAddress: '127.0.0.1',
    createdAt: '2026-11-21 08:15:02'
  },
  {
    logId: 502,
    severity: 'CRITICAL',
    action: 'IDOR_KEY_REVEAL_BLOCKED',
    resource: 'POST /api/licenses/101/reveal',
    ipAddress: '127.0.0.1',
    createdAt: '2026-11-21 08:16:40'
  }
];

/**
 * [Form #9B — Thành viên A & B] Giám sát Audit Logs (A) & AI Security Log Analyzer (B).
 */
export default function AdminSecurityPage() {
  const [aiMessage, setAiMessage] = useState('');

  const handleAnalyzeLogs = async () => {
    try {
      const res = await axiosClient.post('/ai/analyze-logs', { limit: 50, severityFilter: 'ALL' });
      setAiMessage(res.data?.message || 'Phân tích hoàn tất');
    } catch (err) {
      setAiMessage(err.response?.data?.message || 'Lỗi kết nối API /api/ai/analyze-logs');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký Kiểm toán &amp; Phân tích Bảo mật AI</h1>
          <p className="text-xs text-slate-600">
            Thành viên A hiển thị bảng <code>audit_logs</code> · Thành viên B tích hợp Gemini AI phát hiện chuỗi tấn công.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAnalyzeLogs}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2"
        >
          <Bot className="w-4 h-4" /> AI Security Log Analyzer
        </button>
      </div>

      {aiMessage && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
          {aiMessage}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Mức độ</th>
              <th className="p-3">Hành động</th>
              <th className="p-3">Tài nguyên</th>
              <th className="p-3">IP</th>
              <th className="p-3">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_LOGS.map((log) => (
              <tr key={log.logId}>
                <td className="p-3 font-mono text-xs">{log.logId}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                      log.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <ShieldAlert className="w-3 h-3" /> {log.severity}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3 text-xs text-slate-600">{log.resource}</td>
                <td className="p-3 font-mono text-xs">{log.ipAddress}</td>
                <td className="p-3 text-xs text-slate-500">{log.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
        <div>TODO [Thành viên A]: Nối <code>GET /api/security/audit-logs</code> và <code>GET /api/security/summary</code>.</div>
        <div>TODO [Thành viên B]: Hoàn thiện <code>POST /api/ai/analyze-logs</code> trả JSON riskLevel, summary, threats, recommendedActions.</div>
      </div>
    </div>
  );
}
