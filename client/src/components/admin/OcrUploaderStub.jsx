import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ScanLine, Upload } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

/**
 * [Thành viên A] Khung AI OCR đọc ảnh hóa đơn/phiếu nhập -> POST /api/ai/ocr-product.
 * Tự động điền kết quả vào Form Thêm/Sửa Product.
 */
export default function OcrUploaderStub({ onExtracted }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setLoading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await axiosClient.post('/ai/ocr-product', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const extracted = res.data?.data;
      if (extracted && onExtracted) {
        onExtracted(extracted);
      }

      setStatus({
        type: extracted?.isFallback ? 'warning' : 'success',
        message: extracted?.isFallback
          ? 'Đã điền dữ liệu OCR mẫu (chế độ fallback khi chưa có GEMINI_API_KEY).'
          : 'AI OCR đã bóc tách và điền tự động thông tin vào biểu mẫu.'
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message:
          err.response?.data?.message ||
          'Không thể nhận diện ảnh OCR (vui lòng dùng ảnh PNG, JPEG hoặc WEBP hợp lệ).'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
            <ScanLine className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-950 text-xs">
              AI OCR Tự động điền Form (Gemini Vision)
            </h4>
            <p className="text-[11px] text-amber-800">
              Chọn ảnh phiếu nhập/hóa đơn (kiểm tra Magic Bytes) để tự điền 6 trường Product.
            </p>
          </div>
        </div>

        <label
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer transition ${
            loading ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>{loading ? 'Đang quét OCR...' : 'Chọn ảnh quét OCR'}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>

      {status && (
        <div
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : status.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
