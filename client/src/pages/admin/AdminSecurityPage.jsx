import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const SEVERITY_FILTERS = ['ALL', 'INFO', 'WARN', 'HIGH', 'CRITICAL'];

const SEVERITY_BADGE_MAP = {
  INFO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  WARN: 'bg-amber-50 text-amber-800 border-amber-200',
  HIGH: 'bg-orange-100 text-orange-900 border-orange-300',
  CRITICAL: 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
};

/**
 * [Form #9B — Thành viên A & B] Giám sát Audit Logs (A) & AI Security Log Analyzer (B).
 */
export default function AdminSecurityPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiState, setAiState] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSecurityData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [logsRes, summaryRes] = await Promise.all([
        axiosClient.get('/security/audit-logs', {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            severity: severityFilter === 'ALL' ? undefined : severityFilter,
            keyword: keyword || undefined
          }
        }),
        axiosClient.get('/security/summary')
      ]);

      setLogs(logsRes.data?.data || []);
      if (logsRes.data?.pagination) {
        setPagination(logsRes.data.pagination);
      }
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể tải dữ liệu nhật ký bảo mật.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, severityFilter, keyword]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const handleAnalyzeLogs = async () => {
    setAiLoading(true);
    setAiState(null);
    try {
      const res = await axiosClient.post('/ai/analyze-logs', {
        limit: 50,
        severityFilter: severityFilter === 'ALL' ? 'ALL' : severityFilter
      });
      setAiState({
        type: 'success',
        message: res.data?.message || 'Phân tích AI hoàn tất',
        report: res.data?.data || null
      });
    } catch (err) {
      if (err.response?.status === 501) {
        setAiState({
          type: 'pending',
          message: 'Chức năng AI Log Analyzer đang được Thành viên B hoàn thiện'
        });
      } else {
        setAiState({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi kết nối API /api/ai/analyze-logs'
        });
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Nhật ký Kiểm toán &amp; Phân tích Bảo mật AI
          </h1>
          <p className="text-xs text-slate-600">
            Theo dõi sự kiện chống chối bỏ (<code>audit_logs</code>) theo thời gian thực và lọc mức độ rủi ro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSecurityData}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleAnalyzeLogs}
            disabled={aiLoading}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition"
          >
            <Bot className="w-4 h-4" />
            <span>{aiLoading ? 'Đang phân tích...' : 'Phân tích bằng AI'}</span>
          </button>
        </div>
      </div>

      {/* Thống kê tổng quan theo severity */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white/90 rounded-xl border border-rose-100/80 p-3.5 shadow-sm">
            <div className="text-[11px] text-slate-500 font-medium">Tổng sự kiện (24h: {summary.last24hLogs})</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{summary.totalLogs}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3.5">
            <div className="text-[11px] text-emerald-700 font-semibold">INFO</div>
            <div className="text-xl font-bold text-emerald-900 mt-1">{summary.bySeverity?.INFO ?? 0}</div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3.5">
            <div className="text-[11px] text-amber-700 font-semibold">WARN</div>
            <div className="text-xl font-bold text-amber-900 mt-1">{summary.bySeverity?.WARN ?? 0}</div>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-3.5">
            <div className="text-[11px] text-orange-800 font-semibold">HIGH</div>
            <div className="text-xl font-bold text-orange-950 mt-1">{summary.bySeverity?.HIGH ?? 0}</div>
          </div>
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-3.5">
            <div className="text-[11px] text-rose-700 font-semibold">CRITICAL</div>
            <div className="text-xl font-bold text-rose-900 mt-1">{summary.bySeverity?.CRITICAL ?? 0}</div>
          </div>
        </div>
      )}

      {/* Kết quả AI Security Log Analyzer (Thành viên B) */}
      {aiState && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            aiState.type === 'pending'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : aiState.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {aiState.type === 'pending' ? (
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
            ) : aiState.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span>{aiState.message}</span>
          </div>

          {aiState.report && (
            <div className="space-y-1.5 pt-1 text-xs">
              {aiState.report.riskLevel && (
                <div>
                  Mức độ rủi ro: <strong>{aiState.report.riskLevel}</strong>
                </div>
              )}
              {aiState.report.summary && <p>{aiState.report.summary}</p>}
              {Array.isArray(aiState.report.threats) && aiState.report.threats.length > 0 && (
                <ul className="list-disc pl-5 space-y-0.5">
                  {aiState.report.threats.map((t, i) => (
                    <li key={i}>{typeof t === 'string' ? t : JSON.stringify(t)}</li>
                  ))}
                </ul>
              )}
              {Array.isArray(aiState.report.recommendedActions) &&
                aiState.report.recommendedActions.length > 0 && (
                  <ul className="list-disc pl-5 space-y-0.5">
                    {aiState.report.recommendedActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bộ lọc severity & tìm kiếm */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-rose-100/80 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {SEVERITY_FILTERS.map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => {
                setSeverityFilter(sev);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                severityFilter === sev
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sev === 'ALL' ? 'Tất cả' : sev}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPagination((prev) => ({ ...prev, page: 1 }));
            setKeyword(keywordInput.trim());
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Lọc action / resource / email..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            Lọc
          </button>
        </form>
      </div>

      {/* Bảng audit_logs */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-rose-100/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-rose-50/70 to-emerald-50/70 border-b border-rose-100/80 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Mức độ</th>
                <th className="p-3">Hành động</th>
                <th className="p-3">Người dùng</th>
                <th className="p-3">Tài nguyên</th>
                <th className="p-3">IP</th>
                <th className="p-3">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-500">
                    Đang tải nhật ký kiểm toán...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-500">
                    Chưa có bản ghi nhật ký nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-rose-50/40">
                    <td className="p-3 font-mono text-xs text-slate-600">{log.logId}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${
                          SEVERITY_BADGE_MAP[log.severity] || SEVERITY_BADGE_MAP.INFO
                        }`}
                      >
                        <ShieldAlert className="w-3 h-3" /> {log.severity}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs font-semibold text-slate-800">
                      {log.action}
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {log.userEmail || <span className="text-slate-400">Guest / System</span>}
                    </td>
                    <td className="p-3 text-xs text-slate-600 max-w-xs truncate" title={log.resource}>
                      {log.resource}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-600">{log.ipAddress || '—'}</td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-rose-100/80 bg-rose-50/30 flex items-center justify-between text-xs text-slate-600">
          <span>
            Tổng <strong>{pagination.totalItems}</strong> bản ghi nhật ký
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Trước
            </button>
            <span className="font-medium text-slate-800">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 disabled:opacity-40 inline-flex items-center gap-1"
            >
              Sau <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
