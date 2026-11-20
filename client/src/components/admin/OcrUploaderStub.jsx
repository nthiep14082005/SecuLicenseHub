import React from 'react';
import { ScanLine, Upload } from 'lucide-react';

/**
 * [Thành viên A] Khung AI OCR đọc ảnh hóa đơn/phiếu nhập lô bản quyền -> POST /api/ai/ocr-product.
 */
export default function OcrUploaderStub() {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-600 text-white">
          <ScanLine className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-indigo-950 text-sm">
            AI OCR Tự động điền Form (Gemini Vision)
          </h3>
          <p className="text-xs text-indigo-800">
            TODO [Thành viên A]: Tải ảnh hóa đơn/phiếu nhập (kiểm tra Magic Bytes) → gọi{' '}
            <code>POST /api/ai/ocr-product</code> để tự điền ProductName, ProductType, Quantity, Unit, Price.
          </p>
        </div>
      </div>
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer">
        <Upload className="w-4 h-4" />
        <span>Chọn ảnh quét OCR (Stub)</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" />
      </label>
    </div>
  );
}
