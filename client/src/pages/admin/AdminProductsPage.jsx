import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  Loader2,
  Search,
  Upload,
  X
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import ImportExportBarStub from '../../components/admin/ImportExportBarStub';
import OcrUploaderStub from '../../components/admin/OcrUploaderStub';
import ColumnToggleStub, { PRODUCT_COLUMNS } from '../../components/admin/ColumnToggleStub';
import ProductTableStub, { resolveProductImageUrl } from '../../components/admin/ProductTableStub';
import ShortcutModalStub from '../../components/admin/ShortcutModalStub';

const STORAGE_KEY = 'seculicense_admin_visible_columns';

const PRODUCT_TYPES = [
  'License Key',
  'Source Code',
  'Plugin & UI Kit',
  'API Quota',
  'E-Book Kỹ thuật'
];

const UNIT_OPTIONS = ['Key', 'Gói', 'License', 'Quota', 'Tài liệu'];

const EMPTY_FORM = {
  ProductName: '',
  PathImage: '',
  ProductType: 'License Key',
  Quantity: 10,
  Unit: 'License',
  Price: 0,
  Description: '',
  fileSha256: '',
  assetFilename: ''
};

/**
 * [Form #8 — Thành viên A] Trang Quản trị Product (11 Chức năng + Phím tắt + AI OCR + Anti-XXE/Formula Inj).
 */
export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    totalItems: 0,
    totalPages: 1
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('ProductID');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [selectedIds, setSelectedIds] = useState([]);
  const [activeProductId, setActiveProductId] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return PRODUCT_COLUMNS;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return PRODUCT_COLUMNS;
      return parsed.includes('ProductName') ? parsed : ['ProductName', ...parsed];
    } catch {
      return PRODUCT_COLUMNS;
    }
  });

  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState(null);

  const [formModal, setFormModal] = useState({ open: false, mode: 'create', productId: null });
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formError, setFormError] = useState('');

  const [detailModal, setDetailModal] = useState({ open: false, loading: false, product: null });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Xác nhận',
    danger: false,
    onConfirm: null
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const importInputRef = useRef(null);
  const formRef = useRef(null);

  const showToast = useCallback((type, message) => {
    setToast({ id: Date.now(), type, message });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/products', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          keyword: keyword || undefined,
          type: typeFilter || undefined,
          sortBy,
          sortOrder
        }
      });
      const items = res.data?.data || [];
      setProducts(items);
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
      setSelectedIds((prev) => prev.filter((id) => items.some((item) => item.ProductID === id)));
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Không thể tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, keyword, typeFilter, sortBy, sortOrder, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggleColumn = (col) => {
    if (col === 'ProductName') return;
    setVisibleColumns((prev) => {
      const next = prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const handleResetColumns = () => {
    setVisibleColumns(PRODUCT_COLUMNS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCT_COLUMNS));
    } catch {
      // Ignore storage error
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setKeyword(keywordInput.trim());
  };

  const handleSortChange = (colKey) => {
    if (sortBy === colKey) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(colKey);
      setSortOrder('ASC');
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleToggleSelectAll = (pageIds) => {
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : pageIds);
  };

  const handleToggleSelectOne = (productId) => {
    setActiveProductId(productId);
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const openCreateModal = useCallback(() => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setFormModal({ open: true, mode: 'create', productId: null });
  }, []);

  const openEditModal = useCallback(
    async (productRow) => {
      if (!productRow) return;
      setFormError('');
      setFormData({
        ProductName: productRow.ProductName || '',
        PathImage: productRow.PathImage || '',
        ProductType: productRow.ProductType || 'License Key',
        Quantity: productRow.Quantity ?? 0,
        Unit: productRow.Unit || 'License',
        Price: productRow.Price ?? 0,
        Description: productRow.Description || '',
        fileSha256: '',
        assetFilename: ''
      });
      setFormModal({ open: true, mode: 'edit', productId: productRow.ProductID });

      try {
        const res = await axiosClient.get(`/products/${productRow.ProductID}`);
        const detail = res.data?.data;
        if (detail) {
          setFormData({
            ProductName: detail.ProductName || '',
            PathImage: detail.PathImage || '',
            ProductType: detail.ProductType || 'License Key',
            Quantity: detail.Quantity ?? 0,
            Unit: detail.Unit || 'License',
            Price: detail.Price ?? 0,
            Description: detail.Description || '',
            fileSha256: detail.FileSha256 || '',
            assetFilename: detail.AssetFilename || ''
          });
        }
      } catch {
        // Giữ dữ liệu bảng hiện tại nếu không tải được metadata mở rộng
      }
    },
    []
  );

  const openDetailModal = useCallback(
    async (productRow) => {
      if (!productRow) return;
      setDetailModal({ open: true, loading: true, product: productRow });
      try {
        const res = await axiosClient.get(`/products/${productRow.ProductID}`);
        setDetailModal({ open: true, loading: false, product: res.data?.data || productRow });
      } catch (err) {
        setDetailModal({ open: true, loading: false, product: productRow });
        showToast('error', err.response?.data?.message || 'Không thể tải chi tiết sản phẩm.');
      }
    },
    [showToast]
  );

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImageUploading(true);
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await axiosClient.post('/products/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const pathImage = res.data?.data?.PathImage;
      if (pathImage) {
        setFormData((prev) => ({ ...prev, PathImage: pathImage }));
        showToast('success', 'Upload ảnh sản phẩm thành công (đã kiểm tra Magic Bytes).');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Tệp ảnh bị từ chối (sai định dạng Magic Bytes).';
      setFormError(msg);
      showToast('error', msg);
    } finally {
      setImageUploading(false);
    }
  };

  const handleOcrExtracted = (extracted) => {
    setFormData((prev) => ({
      ...prev,
      ProductName: extracted.ProductName ?? prev.ProductName,
      ProductType: extracted.ProductType ?? prev.ProductType,
      Quantity: extracted.Quantity ?? prev.Quantity,
      Unit: extracted.Unit ?? prev.Unit,
      Price: extracted.Price ?? prev.Price,
      Description: extracted.Description ?? prev.Description
    }));
  };

  const submitProductForm = useCallback(async () => {
    setFormError('');
    if (!formData.ProductName.trim() || !formData.ProductType.trim() || !formData.Unit.trim()) {
      setFormError('Vui lòng nhập đầy đủ ProductName, ProductType và Unit.');
      return;
    }
    if (Number(formData.Quantity) < 0 || Number(formData.Price) < 0) {
      setFormError('Quantity và Price phải lớn hơn hoặc bằng 0.');
      return;
    }

    setFormSaving(true);
    try {
      const payload = {
        ProductName: formData.ProductName.trim(),
        PathImage: formData.PathImage.trim() || null,
        ProductType: formData.ProductType.trim(),
        Quantity: Number.parseInt(formData.Quantity, 10) || 0,
        Unit: formData.Unit.trim(),
        Price: Number(formData.Price) || 0,
        Description: formData.Description.trim(),
        fileSha256: formData.fileSha256.trim() || null,
        assetFilename: formData.assetFilename.trim() || null
      };

      if (formModal.mode === 'edit' && formModal.productId) {
        const res = await axiosClient.put(`/products/${formModal.productId}`, payload);
        showToast('success', res.data?.message || 'Cập nhật sản phẩm thành công');
      } else {
        const res = await axiosClient.post('/products', payload);
        showToast('success', res.data?.message || 'Thêm mới sản phẩm thành công');
      }
      setFormModal({ open: false, mode: 'create', productId: null });
      fetchProducts();
    } catch (err) {
      const payload = err.response?.data;
      const detail =
        Array.isArray(payload?.errors) && payload.errors.length > 0
          ? payload.errors.map((e) => e.message).join(' · ')
          : payload?.message || 'Lưu sản phẩm thất bại.';
      setFormError(detail);
    } finally {
      setFormSaving(false);
    }
  }, [formData, formModal, fetchProducts, showToast]);

  const requestDeleteOne = useCallback(
    (productRow) => {
      if (!productRow) return;
      setConfirmModal({
        open: true,
        title: 'Xác nhận xóa sản phẩm',
        message: `Bạn có chắc muốn xóa sản phẩm "${productRow.ProductName}" (ID #${productRow.ProductID})?`,
        confirmLabel: 'Xóa sản phẩm',
        danger: true,
        onConfirm: async () => {
          const res = await axiosClient.delete(`/products/${productRow.ProductID}`);
          showToast('success', res.data?.message || 'Đã xóa sản phẩm');
          setSelectedIds((prev) => prev.filter((id) => id !== productRow.ProductID));
          fetchProducts();
        }
      });
    },
    [fetchProducts, showToast]
  );

  const requestBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) {
      showToast('warning', 'Vui lòng chọn ít nhất 1 sản phẩm để xóa.');
      return;
    }
    setConfirmModal({
      open: true,
      title: 'Xác nhận xóa hàng loạt',
      message: `Bạn có chắc muốn xóa ${selectedIds.length} sản phẩm đã chọn trong Transaction?`,
      confirmLabel: `Xóa ${selectedIds.length} sản phẩm`,
      danger: true,
      onConfirm: async () => {
        const res = await axiosClient.post('/products/bulk-delete', { ids: selectedIds });
        showToast('success', res.data?.message || 'Đã xóa hàng loạt thành công');
        setSelectedIds([]);
        fetchProducts();
      }
    });
  }, [selectedIds, fetchProducts, showToast]);

  const requestCloneOne = useCallback(
    (productRow) => {
      if (!productRow) return;
      setConfirmModal({
        open: true,
        title: 'Xác nhận sao chép sản phẩm',
        message: `Tạo bản sao cho "${productRow.ProductName}" (hậu tố "(Copy)")?`,
        confirmLabel: 'Sao chép ngay',
        danger: false,
        onConfirm: async () => {
          const res = await axiosClient.post(`/products/${productRow.ProductID}/clone`);
          showToast('success', res.data?.message || 'Sao chép sản phẩm thành công');
          fetchProducts();
        }
      });
    },
    [fetchProducts, showToast]
  );

  const requestBulkClone = useCallback(() => {
    if (selectedIds.length === 0) {
      showToast('warning', 'Vui lòng chọn ít nhất 1 sản phẩm để sao chép.');
      return;
    }
    setConfirmModal({
      open: true,
      title: 'Xác nhận sao chép hàng loạt',
      message: `Sao chép ${selectedIds.length} sản phẩm đã chọn trong Transaction?`,
      confirmLabel: `Sao chép ${selectedIds.length} sản phẩm`,
      danger: false,
      onConfirm: async () => {
        const res = await axiosClient.post('/products/bulk-clone', { ids: selectedIds });
        showToast('success', res.data?.message || 'Sao chép hàng loạt thành công');
        setSelectedIds([]);
        fetchProducts();
      }
    });
  }, [selectedIds, fetchProducts, showToast]);

  const handleConfirmAction = async () => {
    if (!confirmModal.onConfirm) return;
    setConfirmLoading(true);
    try {
      await confirmModal.onConfirm();
      setConfirmModal((prev) => ({ ...prev, open: false, onConfirm: null }));
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Thao tác thất bại.');
      setConfirmModal((prev) => ({ ...prev, open: false, onConfirm: null }));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleImportFile = async (file) => {
    setImporting(true);
    setImportFeedback(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axiosClient.post('/products/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportFeedback({
        type: 'success',
        message: res.data?.message || 'Import sản phẩm thành công',
        errors: []
      });
      showToast('success', res.data?.message || 'Import thành công');
      fetchProducts();
    } catch (err) {
      const payload = err.response?.data;
      setImportFeedback({
        type: 'error',
        message: payload?.message || 'Import thất bại',
        errors: Array.isArray(payload?.errors) ? payload.errors : []
      });
      showToast('error', payload?.message || 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };

  const handleExportFormat = async (format) => {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      const res = await axiosClient.get('/products/export', {
        params: { format },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seculicense-products.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', `Đã tải xuống tệp Export (.${format})`);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Không thể xuất tệp sản phẩm.');
    } finally {
      setExporting(false);
    }
  };

  const resolveTargetRow = useCallback(() => {
    if (selectedIds.length === 1) {
      return products.find((p) => p.ProductID === selectedIds[0]) || null;
    }
    if (activeProductId) {
      return products.find((p) => p.ProductID === activeProductId) || null;
    }
    return null;
  }, [products, selectedIds, activeProductId]);

  // Global Keyboard Listener cho đủ 10 phím tắt CRUD
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      const isInputFocused =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT' ||
        Boolean(document.activeElement?.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        setShortcutOpen(false);
        setExportMenuOpen(false);
        setFormModal({ open: false, mode: 'create', productId: null });
        setDetailModal({ open: false, loading: false, product: null });
        setConfirmModal((prev) => ({ ...prev, open: false, onConfirm: null }));
        return;
      }

      if (!e.altKey) return;
      const key = e.key.toLowerCase();

      if (key === 's') {
        if (formModal.open) {
          e.preventDefault();
          submitProductForm();
        }
        return;
      }

      // Khi đang focus trong input/textarea/select chỉ giữ Alt+S và Esc
      if (isInputFocused) return;

      if (key === 'n') {
        e.preventDefault();
        openCreateModal();
      } else if (key === 'e') {
        e.preventDefault();
        const target = resolveTargetRow();
        if (target) openEditModal(target);
        else showToast('warning', 'Hãy chọn 1 dòng sản phẩm trước khi nhấn Alt+E.');
      } else if (key === 'v') {
        e.preventDefault();
        const target = resolveTargetRow();
        if (target) openDetailModal(target);
        else showToast('warning', 'Hãy chọn 1 dòng sản phẩm trước khi nhấn Alt+V.');
      } else if (key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) requestBulkDelete();
        else {
          const target = resolveTargetRow();
          if (target) requestDeleteOne(target);
          else showToast('warning', 'Hãy tick hoặc chọn sản phẩm để xóa.');
        }
      } else if (key === 'c') {
        e.preventDefault();
        if (selectedIds.length > 0) requestBulkClone();
        else {
          const target = resolveTargetRow();
          if (target) requestCloneOne(target);
          else showToast('warning', 'Hãy tick hoặc chọn sản phẩm để sao chép.');
        }
      } else if (key === 'i') {
        e.preventDefault();
        importInputRef.current?.click();
      } else if (key === 'x') {
        e.preventDefault();
        setExportMenuOpen((prev) => !prev);
      } else if (key === 'h') {
        e.preventDefault();
        setShortcutOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    formModal.open,
    selectedIds,
    submitProductForm,
    openCreateModal,
    openEditModal,
    openDetailModal,
    requestBulkDelete,
    requestDeleteOne,
    requestBulkClone,
    requestCloneOne,
    resolveTargetRow,
    showToast
  ]);

  return (
    <div className="space-y-4">
      {/* Toast thông báo */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-700 text-white border-emerald-600'
              : toast.type === 'warning'
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-rose-700 text-white border-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Quản trị Kho Bản quyền (Product — 11 Chức năng)
          </h1>
          <p className="text-xs text-slate-600">
            10 trường PascalCase chuẩn · Nhấn{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 font-mono">
              Alt + H
            </kbd>{' '}
            để xem 10 phím tắt CRUD.
          </p>
        </div>
      </div>

      {/* Thanh công cụ CRUD + Import/Export */}
      <ImportExportBarStub
        selectedCount={selectedIds.length}
        importing={importing}
        exporting={exporting}
        exportMenuOpen={exportMenuOpen}
        onToggleExportMenu={() => setExportMenuOpen((prev) => !prev)}
        onCloseExportMenu={() => setExportMenuOpen(false)}
        importInputRef={importInputRef}
        onOpenCreate={openCreateModal}
        onBulkClone={requestBulkClone}
        onBulkDelete={requestBulkDelete}
        onImportFile={handleImportFile}
        onExportFormat={handleExportFormat}
        onOpenShortcuts={() => setShortcutOpen(true)}
      />

      {/* Thanh tìm kiếm + lọc ProductType + Ẩn/Hiện cột */}
      <div className="relative z-20 bg-white/95 rounded-xl border border-rose-100/80 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Tìm theo tên hoặc mô tả sản phẩm..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Tất cả loại (ProductType)</option>
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
          >
            Tìm kiếm
          </button>

          {(keyword || typeFilter) && (
            <button
              type="button"
              onClick={() => {
                setKeywordInput('');
                setKeyword('');
                setTypeFilter('');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs"
            >
              Đặt lại
            </button>
          )}
        </form>

        <ColumnToggleStub
          visibleColumns={visibleColumns}
          onToggleColumn={handleToggleColumn}
          onResetColumns={handleResetColumns}
        />
      </div>

      {/* Thông báo kết quả / lỗi chi tiết khi Import */}
      {importFeedback && (
        <div
          className={`rounded-xl border p-4 text-xs space-y-2 ${
            importFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold flex items-center gap-1.5">
              {importFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{importFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportFeedback(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {importFeedback.errors.length > 0 && (
            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
              {importFeedback.errors.map((err, idx) => (
                <li key={idx}>
                  Dòng <strong>#{err.row}</strong>: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Bảng dữ liệu Product */}
      <ProductTableStub
        products={products}
        loading={loading}
        visibleColumns={visibleColumns}
        selectedIds={selectedIds}
        activeProductId={activeProductId}
        pagination={pagination}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelectOne={handleToggleSelectOne}
        onSelectActiveRow={setActiveProductId}
        onSortChange={handleSortChange}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setPagination((prev) => ({ ...prev, page: 1, limit }))}
        onView={openDetailModal}
        onEdit={openEditModal}
        onClone={requestCloneOne}
        onDelete={requestDeleteOne}
      />

      {/* Modal Thêm / Sửa Product (tích hợp AI OCR & Upload ảnh Magic Bytes) */}
      {formModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-rose-100 max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-rose-50/70 to-emerald-50/70">
              <h2 className="font-bold text-slate-900 text-base">
                {formModal.mode === 'edit'
                  ? `Cập nhật Sản phẩm #${formModal.productId}`
                  : 'Thêm mới Sản phẩm (Product)'}
              </h2>
              <button
                type="button"
                onClick={() => setFormModal({ open: false, mode: 'create', productId: null })}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              ref={formRef}
              onSubmit={(e) => {
                e.preventDefault();
                submitProductForm();
              }}
              className="p-5 space-y-4 overflow-y-auto"
            >
              <OcrUploaderStub onExtracted={handleOcrExtracted} />

              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ProductName *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ProductName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ProductName: e.target.value }))
                    }
                    placeholder="VD: JetBrains All Products Pack 1 Năm"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ProductType *
                  </label>
                  <select
                    value={formData.ProductType}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ProductType: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {PRODUCT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit *</label>
                  <select
                    value={formData.Unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, Unit: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.Quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, Quantity: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (VNĐ) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.Price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, Price: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PathImage (URL hoặc tải ảnh Magic Bytes)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={formData.PathImage}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, PathImage: e.target.value }))
                      }
                      placeholder="/uploads/products/... hoặc https://..."
                      className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <label
                      className={`px-3 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                        imageUploading ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      {imageUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-amber-700" />
                      )}
                      <span>{imageUploading ? 'Đang tải...' : 'Upload ảnh'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageFileUpload}
                        disabled={imageUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {formData.PathImage && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={resolveProductImageUrl(formData.PathImage)}
                        alt="Xem trước ảnh"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                      <span className="text-[11px] text-slate-500 truncate">
                        {formData.PathImage}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.Description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, Description: e.target.value }))
                    }
                    placeholder="Mô tả tính năng, thời hạn bản quyền, cấu hình yêu cầu..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-rose-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormModal({ open: false, mode: 'create', productId: null })}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
                >
                  Hủy (Esc)
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {formSaving ? 'Đang lưu...' : 'Lưu sản phẩm (Alt+S)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết 1 Product */}
      {detailModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-rose-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 to-emerald-50/70">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Eye className="w-5 h-5 text-emerald-600" />
                <span>Chi tiết Sản phẩm #{detailModal.product?.ProductID}</span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal({ open: false, loading: false, product: null })}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailModal.product && (
              <div className="p-5 space-y-4 text-xs">
                <div className="flex items-start gap-4">
                  {detailModal.product.PathImage ? (
                    <img
                      src={resolveProductImageUrl(detailModal.product.PathImage)}
                      alt={detailModal.product.ProductName}
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-base font-bold text-slate-900">
                      {detailModal.product.ProductName}
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                      {detailModal.product.ProductType}
                    </span>
                    <div className="text-sm font-bold text-emerald-700">
                      {Number(detailModal.product.Price || 0).toLocaleString('vi-VN')} đ /{' '}
                      {detailModal.product.Unit}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 bg-rose-50/40 border border-rose-100 rounded-xl p-3">
                  <div>
                    <span className="text-slate-500">ProductID:</span>{' '}
                    <strong className="font-mono">{detailModal.product.ProductID}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Quantity:</span>{' '}
                    <strong>{detailModal.product.Quantity}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">CreateDate:</span>{' '}
                    <span>{new Date(detailModal.product.CreateDate).toLocaleString('vi-VN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">UpdateDate:</span>{' '}
                    <span>{new Date(detailModal.product.UpdateDate).toLocaleString('vi-VN')}</span>
                  </div>
                  {detailModal.product.AssetFilename && (
                    <div className="col-span-2">
                      <span className="text-slate-500">AssetFilename:</span>{' '}
                      <span className="font-mono">{detailModal.product.AssetFilename}</span>
                    </div>
                  )}
                  {detailModal.product.FileSha256 && (
                    <div className="col-span-2 break-all">
                      <span className="text-slate-500">SHA-256:</span>{' '}
                      <span className="font-mono">{detailModal.product.FileSha256}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-semibold text-slate-700 mb-1">Description</div>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
                    {detailModal.product.Description || 'Không có mô tả'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa / Sao chép */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-100 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">{confirmModal.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, open: false, onConfirm: null }))
                }
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
              >
                Hủy (Esc)
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-60 ${
                  confirmModal.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {confirmLoading ? 'Đang xử lý...' : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <ShortcutModalStub open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
    </div>
  );
}
