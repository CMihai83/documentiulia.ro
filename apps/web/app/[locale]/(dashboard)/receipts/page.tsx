'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  FileText,
  Receipt,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Download,
  Trash2,
  Plus,
  Calendar,
  Building2,
  DollarSign,
  Percent,
  Edit,
  Save,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Sparkles,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';

// Receipt status
type ReceiptStatus = 'uploading' | 'processing' | 'processed' | 'error' | 'saved';

interface ExtractedData {
  vendor?: string;
  date?: string;
  total?: number;
  vatAmount?: number;
  vatRate?: number;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  invoiceNumber?: string;
  currency?: string;
  paymentMethod?: string;
}

interface UploadedReceipt {
  id: string;
  file: File;
  preview: string;
  status: ReceiptStatus;
  extractedData?: ExtractedData;
  errorMessage?: string;
  uploadedAt: Date;
}

// Romanian currency formatting
function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Romanian date formatting
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReceiptsPage() {
  const t = useTranslations('receipts');
  const { selectedCompanyId, selectedCompany } = useCompanyStore();
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<UploadedReceipt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ExtractedData>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Simulate OCR processing (in production, this would call an API)
  const processReceipt = async (receipt: UploadedReceipt): Promise<ExtractedData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    // Simulate OCR extraction with mock data
    const mockData: ExtractedData = {
      vendor: ['Kaufland', 'Carrefour', 'Mega Image', 'Lidl', 'Penny'][Math.floor(Math.random() * 5)] + ' România SRL',
      date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total: Math.round((50 + Math.random() * 450) * 100) / 100,
      vatRate: 19,
      invoiceNumber: `BF-${Math.floor(Math.random() * 900000) + 100000}`,
      currency: 'RON',
      paymentMethod: ['Card', 'Numerar'][Math.floor(Math.random() * 2)],
      items: [
        {
          description: 'Produse alimentare',
          quantity: 1,
          unitPrice: Math.round((20 + Math.random() * 100) * 100) / 100,
          total: 0,
        },
        {
          description: 'Băuturi',
          quantity: Math.floor(Math.random() * 5) + 1,
          unitPrice: Math.round((5 + Math.random() * 20) * 100) / 100,
          total: 0,
        },
      ],
    };

    // Calculate totals
    if (mockData.items) {
      mockData.items = mockData.items.map(item => ({
        ...item,
        total: Math.round(item.quantity * item.unitPrice * 100) / 100,
      }));
    }
    mockData.vatAmount = Math.round((mockData.total || 0) * 0.19 / 1.19 * 100) / 100;

    return mockData;
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !selectedCompanyId) return;

    const newReceipts: UploadedReceipt[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        continue;
      }

      const id = `receipt-${Date.now()}-${i}`;
      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '/pdf-placeholder.png';

      const receipt: UploadedReceipt = {
        id,
        file,
        preview,
        status: 'uploading',
        uploadedAt: new Date(),
      };

      newReceipts.push(receipt);
    }

    setUploadedReceipts(prev => [...newReceipts, ...prev]);

    // Process each receipt
    for (const receipt of newReceipts) {
      // Update to processing state
      setUploadedReceipts(prev =>
        prev.map(r => r.id === receipt.id ? { ...r, status: 'processing' as ReceiptStatus } : r)
      );

      try {
        const extractedData = await processReceipt(receipt);
        setUploadedReceipts(prev =>
          prev.map(r => r.id === receipt.id
            ? { ...r, status: 'processed' as ReceiptStatus, extractedData }
            : r
          )
        );
      } catch (error) {
        setUploadedReceipts(prev =>
          prev.map(r => r.id === receipt.id
            ? { ...r, status: 'error' as ReceiptStatus, errorMessage: 'Eroare la procesarea bonului' }
            : r
          )
        );
      }
    }
  }, [selectedCompanyId]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Save receipt as expense
  const handleSaveAsExpense = async (receipt: UploadedReceipt) => {
    if (!receipt.extractedData || !selectedCompanyId) return;

    try {
      // In production, this would call the API
      console.log('Saving expense:', receipt.extractedData);

      setUploadedReceipts(prev =>
        prev.map(r => r.id === receipt.id ? { ...r, status: 'saved' as ReceiptStatus } : r)
      );

      // Close modal after short delay
      setTimeout(() => {
        setSelectedReceipt(null);
      }, 1500);
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  // Delete receipt
  const handleDelete = (receiptId: string) => {
    setUploadedReceipts(prev => prev.filter(r => r.id !== receiptId));
    if (selectedReceipt?.id === receiptId) {
      setSelectedReceipt(null);
    }
  };

  // Retry processing
  const handleRetry = async (receipt: UploadedReceipt) => {
    setUploadedReceipts(prev =>
      prev.map(r => r.id === receipt.id ? { ...r, status: 'processing' as ReceiptStatus, errorMessage: undefined } : r)
    );

    try {
      const extractedData = await processReceipt(receipt);
      setUploadedReceipts(prev =>
        prev.map(r => r.id === receipt.id
          ? { ...r, status: 'processed' as ReceiptStatus, extractedData }
          : r
        )
      );
    } catch (error) {
      setUploadedReceipts(prev =>
        prev.map(r => r.id === receipt.id
          ? { ...r, status: 'error' as ReceiptStatus, errorMessage: 'Eroare la procesarea bonului' }
          : r
        )
      );
    }
  };

  // Stats
  const stats = {
    total: uploadedReceipts.length,
    processed: uploadedReceipts.filter(r => r.status === 'processed').length,
    saved: uploadedReceipts.filter(r => r.status === 'saved').length,
    totalAmount: uploadedReceipts
      .filter(r => r.status === 'processed' || r.status === 'saved')
      .reduce((sum, r) => sum + (r.extractedData?.total || 0), 0),
  };

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Receipt className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Selectează o firmă
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Pentru a scana bonuri, selectează mai întâi o firmă din meniul de sus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Scanare Bonuri
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Scanează și extrage automat datele din bonuri pentru {selectedCompany?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Camera className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Fotografiază</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium">Încarcă Bon</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {uploadedReceipts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Încărcate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Procesate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.processed}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Salvate ca Cheltuieli</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.saved}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Valoare Totală</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(stats.totalAmount)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex flex-col items-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
            isDragging ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            {isDragging ? (
              <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            ) : (
              <ImageIcon className="w-10 h-10 text-gray-400" />
            )}
          </div>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {isDragging ? 'Eliberează pentru a încărca' : 'Trage și plasează bonurile aici'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            Acceptăm imagini (JPG, PNG) și documente PDF. Sistemul AI va extrage automat datele din bonuri.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Selectează fișiere
            </button>
            <span className="text-gray-400">sau</span>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Camera className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">Folosește camera</span>
            </button>
          </div>
        </div>

        {/* AI Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">OCR AI</span>
        </div>
      </div>

      {/* Uploaded Receipts Grid */}
      {uploadedReceipts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bonuri Încărcate
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
            <AnimatePresence>
              {uploadedReceipts.map((receipt, index) => (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  {/* Preview Image */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={receipt.preview}
                      alt="Receipt preview"
                      className="w-full h-full object-cover"
                    />

                    {/* Status Overlay */}
                    {(receipt.status === 'uploading' || receipt.status === 'processing') && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
                        <p className="text-white font-medium">
                          {receipt.status === 'uploading' ? 'Se încarcă...' : 'Se procesează...'}
                        </p>
                        <p className="text-white/70 text-sm">Extragere date OCR</p>
                      </div>
                    )}

                    {receipt.status === 'error' && (
                      <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center p-4">
                        <AlertCircle className="w-10 h-10 text-white mb-3" />
                        <p className="text-white font-medium text-center mb-3">
                          {receipt.errorMessage}
                        </p>
                        <button
                          onClick={() => handleRetry(receipt)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Încearcă din nou
                        </button>
                      </div>
                    )}

                    {receipt.status === 'saved' && (
                      <div className="absolute inset-0 bg-green-900/80 flex flex-col items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-white mb-3" />
                        <p className="text-white font-medium">Salvat cu succes!</p>
                      </div>
                    )}

                    {/* Hover Actions */}
                    {receipt.status === 'processed' && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                        <button
                          onClick={() => setSelectedReceipt(receipt)}
                          className="p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="w-5 h-5 text-gray-700" />
                        </button>
                        <button
                          onClick={() => handleDelete(receipt.id)}
                          className="p-3 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Receipt Info */}
                  <div className="p-4">
                    {receipt.status === 'processed' && receipt.extractedData && (
                      <>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {receipt.extractedData.vendor || 'Furnizor necunoscut'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {receipt.extractedData.date
                              ? formatDate(receipt.extractedData.date)
                              : 'Data necunoscută'}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(receipt.extractedData.total || 0)}
                          </span>
                        </div>
                      </>
                    )}

                    {(receipt.status === 'uploading' || receipt.status === 'processing') && (
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                      </div>
                    )}

                    {receipt.status === 'error' && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Procesare eșuată
                      </p>
                    )}

                    {receipt.status === 'saved' && receipt.extractedData && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Salvat ca cheltuială</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {uploadedReceipts.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
              <Receipt className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Nu ai încărcat niciun bon
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Încarcă bonuri fiscale și sistemul AI va extrage automat informațiile pentru a crea cheltuieli.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Recunoaștere OCR</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Procesare rapidă</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Export automat</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setSelectedReceipt(null);
              setIsEditing(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full shadow-xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Detalii Bon
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Verifică și editează datele extrase
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedReceipt(null);
                    setIsEditing(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex flex-col md:flex-row max-h-[calc(90vh-180px)] overflow-hidden">
                {/* Image Preview */}
                <div className="md:w-1/2 p-6 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center">
                  <img
                    src={selectedReceipt.preview}
                    alt="Receipt"
                    className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg"
                  />
                </div>

                {/* Extracted Data */}
                <div className="md:w-1/2 p-6 overflow-y-auto">
                  {selectedReceipt.extractedData && (
                    <div className="space-y-4">
                      {/* Vendor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Furnizor
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <Building2 className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">
                            {selectedReceipt.extractedData.vendor || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Date & Invoice Number */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Data
                          </label>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-900 dark:text-white">
                              {selectedReceipt.extractedData.date
                                ? formatDate(selectedReceipt.extractedData.date)
                                : '-'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nr. Bon
                          </label>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-900 dark:text-white font-mono">
                              {selectedReceipt.extractedData.invoiceNumber || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Total and VAT */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-700 dark:text-blue-300">Subtotal</span>
                          <span className="font-medium text-blue-800 dark:text-blue-200">
                            {formatCurrency(
                              (selectedReceipt.extractedData.total || 0) -
                              (selectedReceipt.extractedData.vatAmount || 0)
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-700 dark:text-blue-300">
                            TVA ({selectedReceipt.extractedData.vatRate || 19}%)
                          </span>
                          <span className="font-medium text-blue-800 dark:text-blue-200">
                            {formatCurrency(selectedReceipt.extractedData.vatAmount || 0)}
                          </span>
                        </div>
                        <hr className="border-blue-200 dark:border-blue-800 my-2" />
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-800 dark:text-blue-200">Total</span>
                          <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            {formatCurrency(selectedReceipt.extractedData.total || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Metodă de plată
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">
                            {selectedReceipt.extractedData.paymentMethod || 'Nespecificată'}
                          </span>
                        </div>
                      </div>

                      {/* Items (if available) */}
                      {selectedReceipt.extractedData.items && selectedReceipt.extractedData.items.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Articole detectate
                          </label>
                          <div className="space-y-2">
                            {selectedReceipt.extractedData.items.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                              >
                                <div>
                                  <p className="text-gray-900 dark:text-white">{item.description}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.quantity} x {formatCurrency(item.unitPrice)}
                                  </p>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(item.total)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => handleDelete(selectedReceipt.id)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Șterge
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedReceipt(null);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={() => handleSaveAsExpense(selectedReceipt)}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Salvează ca Cheltuială
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
