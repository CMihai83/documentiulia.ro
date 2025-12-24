'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileImage,
  Scan,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Eye,
  Edit,
  Receipt,
  RefreshCw,
  Globe,
  CheckSquare,
  Square,
  Trash2,
  FileStack,
} from 'lucide-react';
import { api } from '@/lib/api';
import { OCRViewer } from '@/components/ocr/OCRViewer';
import { FieldEditor } from '@/components/ocr/FieldEditor';
import { ExtractionPreview } from '@/components/ocr/ExtractionPreview';

const OCR_LANGUAGES = [
  { code: 'auto', label: 'Auto-detect', labelDe: 'Auto-Erkennung', labelRo: 'Auto-detectare' },
  { code: 'ro', label: 'Romanian', labelDe: 'Rumaenisch', labelRo: 'Romana' },
  { code: 'de', label: 'German', labelDe: 'Deutsch', labelRo: 'Germana' },
  { code: 'en', label: 'English', labelDe: 'Englisch', labelRo: 'Engleza' },
] as const;

interface ProcessingDocument {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    documentId: string;
    templateName?: string;
    documentType: 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'OTHER';
    language: string;
    overallConfidence: number;
    fields: { name: string; value: string | null; confidence: number }[];
    rawText?: string;
    boundingBoxes?: { x: number; y: number; width: number; height: number; field: string; confidence: number }[];
    imageUrl?: string;
  };
  error?: string;
}

export default function OCRPage() {
  const t = useTranslations('ocr');
  const locale = useLocale();
  const toast = useToast();
  const [documents, setDocuments] = useState<ProcessingDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'preview' | 'edit' | 'viewer'>('preview');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState<string>('auto');

  // Toggle document selection
  const toggleSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Select/deselect all completed documents
  const toggleSelectAll = () => {
    const completedDocs = documents.filter((d) => d.status === 'completed');
    if (selectedDocIds.size === completedDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(completedDocs.map((d) => d.id)));
    }
  };

  // Batch create invoices for all selected documents
  const handleBatchCreateInvoices = async () => {
    const invoiceDocs = documents.filter(
      (d) => selectedDocIds.has(d.id) && d.result?.documentType === 'INVOICE'
    );
    if (invoiceDocs.length === 0) return;

    setIsBatchProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const doc of invoiceDocs) {
      try {
        await api.post(`/ocr/convert-to-invoice/${doc.id}`);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsBatchProcessing(false);
    setSelectedDocIds(new Set());
    toast.success(
      'Facturi create',
      t('batchInvoicesCreated', { success: successCount, errors: errorCount }) ||
        `Succes: ${successCount}, Erori: ${errorCount}`
    );
  };

  // Delete selected documents
  const handleDeleteSelected = () => {
    setDocuments((prev) => prev.filter((d) => !selectedDocIds.has(d.id)));
    setSelectedDocIds(new Set());
    if (selectedDoc && selectedDocIds.has(selectedDoc)) {
      setSelectedDoc(null);
    }
  };

  // Get language label based on current locale
  const getLanguageLabel = (lang: typeof OCR_LANGUAGES[number]) => {
    if (locale === 'de') return lang.labelDe;
    if (locale === 'ro') return lang.labelRo;
    return lang.label;
  };

  const processDocument = async (file: File): Promise<ProcessingDocument> => {
    // For now, simulate document upload and processing
    // In production, this would upload to your document storage first
    const formData = new FormData();
    formData.append('file', file);

    // First upload the document
    const uploadResponse = await fetch('/api/v1/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload document');
    }

    const { id: documentId, url: imageUrl } = await uploadResponse.json();

    // Then process with OCR (pass language for accuracy)
    const ocrResponse = await api.post<ProcessingDocument['result']>(
      `/ocr/process/${documentId}`,
      { language: ocrLanguage }
    );

    if (ocrResponse.error) {
      throw new Error(ocrResponse.error);
    }

    return {
      id: documentId,
      name: file.name,
      status: 'completed',
      result: { ...ocrResponse.data!, imageUrl },
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Add pending documents
    const newDocs = acceptedFiles.map((file) => ({
      id: `temp-${Date.now()}-${file.name}`,
      name: file.name,
      status: 'pending' as const,
    }));
    setDocuments((prev) => [...prev, ...newDocs]);

    // Process each document
    for (const file of acceptedFiles) {
      const tempId = newDocs.find((d) => d.name === file.name)?.id;
      if (!tempId) continue;

      // Update to processing
      setDocuments((prev) =>
        prev.map((d) => (d.id === tempId ? { ...d, status: 'processing' as const } : d))
      );

      try {
        const result = await processDocument(file);
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === tempId
              ? { ...result, id: result.id, name: file.name }
              : d
          )
        );
        // Auto-select the first processed document
        if (!selectedDoc) {
          setSelectedDoc(result.id);
        }
      } catch (error) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === tempId
              ? {
                  ...d,
                  status: 'failed' as const,
                  error: error instanceof Error ? error.message : 'Processing failed',
                }
              : d
          )
        );
      }
    }
  }, [selectedDoc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const selectedDocument = documents.find((d) => d.id === selectedDoc);

  const handleCorrectionsSubmit = async (corrections: Record<string, string>) => {
    if (!selectedDocument?.id) return;

    const response = await api.post(`/ocr/correct/${selectedDocument.id}`, {
      corrections,
    });

    if (response.data) {
      // Update the document with corrected values
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDocument.id
            ? {
                ...d,
                result: {
                  ...d.result!,
                  fields: d.result!.fields.map((f) => ({
                    ...f,
                    value: corrections[f.name] ?? f.value,
                    confidence: corrections[f.name] ? 1 : f.confidence,
                  })),
                },
              }
            : d
        )
      );
      setView('preview');
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedDocument?.id) return;

    setIsCreatingInvoice(true);
    try {
      const response = await api.post(`/ocr/convert-to-invoice/${selectedDocument.id}`);
      if (response.data) {
        // Show success and optionally redirect to invoice
        toast.success('Factură creată', t('invoiceCreated') || 'Factura a fost creată cu succes!');
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Eroare', 'Nu s-a putut crea factura.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const getStatusIcon = (status: ProcessingDocument['status']) => {
    switch (status) {
      case 'pending':
        return <FileImage className="w-5 h-5 text-gray-400" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {t('title') || 'Procesare OCR'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('subtitle') || 'Extrageti automat date din documente folosind Claude Vision'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Language Selector for OCR */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <select
              value={ocrLanguage}
              onChange={(e) => setOcrLanguage(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={t('language') || 'Document language'}
            >
              {OCR_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {getLanguageLabel(lang)}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-500">
            {documents.filter((d) => d.status === 'completed').length} /{' '}
            {documents.length} {t('processed') || 'procesate'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Document List */}
        <div className="w-72 bg-white border-r flex flex-col">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`m-3 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                {isDragActive
                  ? t('dropHere') || 'Eliberati aici'
                  : t('dragOrClick') || 'Trageti sau click'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPG, PNG
              </p>
            </div>
          </div>

          {/* Batch Action Bar */}
          {selectedDocIds.size > 0 && (
            <div className="mx-3 mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">
                  {selectedDocIds.size} {t('selected') || 'selectate'}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handleBatchCreateInvoices}
                    disabled={isBatchProcessing}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <FileStack className="w-3 h-3" />
                    {t('createInvoices') || 'Creeaza Facturi'}
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Select All Header */}
          {documents.length > 0 && (
            <div className="mx-3 mb-1 flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {selectedDocIds.size === documents.filter((d) => d.status === 'completed').length && documents.filter((d) => d.status === 'completed').length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {t('selectAll') || 'Selecteaza tot'}
              </button>
            </div>
          )}

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Scan className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{t('noDocuments') || 'Niciun document'}</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedDoc === doc.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Selection checkbox */}
                    {doc.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(doc.id);
                        }}
                        className="flex-shrink-0"
                      >
                        {selectedDocIds.has(doc.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedDoc(doc.id);
                        setView('preview');
                      }}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      {getStatusIcon(doc.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.name}
                        </p>
                        {doc.result && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {doc.result.documentType}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                doc.result.overallConfidence >= 0.9
                                  ? 'bg-green-100 text-green-700'
                                  : doc.result.overallConfidence >= 0.7
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {Math.round(doc.result.overallConfidence * 100)}%
                            </span>
                          </div>
                        )}
                        {doc.error && (
                          <p className="text-xs text-red-500 mt-1 truncate">
                            {doc.error}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden">
          {selectedDocument?.result ? (
            <>
              {/* View Tabs */}
              <div className="flex items-center gap-2 p-3 bg-white border-b">
                <button
                  onClick={() => setView('preview')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    view === 'preview'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Receipt className="w-4 h-4 inline mr-1.5" />
                  {t('preview') || 'Previzualizare'}
                </button>
                <button
                  onClick={() => setView('viewer')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    view === 'viewer'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Eye className="w-4 h-4 inline mr-1.5" />
                  {t('document') || 'Document'}
                </button>
                <button
                  onClick={() => setView('edit')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    view === 'edit'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Edit className="w-4 h-4 inline mr-1.5" />
                  {t('edit') || 'Editare'}
                </button>

                {selectedDocument.result.overallConfidence < 0.7 && (
                  <div className="flex-1" />
                )}
                {selectedDocument.result.overallConfidence < 0.7 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-md">
                    <AlertTriangle className="w-4 h-4" />
                    {t('lowConfidenceWarning') || 'Verificati campurile'}
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-4">
                {view === 'preview' && (
                  <ExtractionPreview
                    data={selectedDocument.result}
                    onEdit={() => setView('edit')}
                    onCreateInvoice={handleCreateInvoice}
                    isCreatingInvoice={isCreatingInvoice}
                  />
                )}

                {view === 'viewer' && selectedDocument.result.imageUrl && (
                  <OCRViewer
                    imageUrl={selectedDocument.result.imageUrl}
                    boundingBoxes={selectedDocument.result.boundingBoxes}
                    showConfidence
                  />
                )}

                {view === 'edit' && (
                  <FieldEditor
                    fields={selectedDocument.result.fields}
                    onSave={handleCorrectionsSubmit}
                    onCancel={() => setView('preview')}
                  />
                )}
              </div>
            </>
          ) : selectedDocument?.status === 'processing' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-gray-600">
                  {t('processing') || 'Se proceseaza...'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {t('processingHint') || 'Claude Vision analizeaza documentul'}
                </p>
              </div>
            </div>
          ) : selectedDocument?.status === 'failed' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <p className="text-gray-900 font-medium">
                  {t('processingFailed') || 'Procesarea a esuat'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedDocument.error}
                </p>
                <button className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800">
                  <RefreshCw className="w-4 h-4 inline mr-1.5" />
                  {t('retry') || 'Reincearca'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Scan className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">
                  {t('selectDocument') || 'Selectati un document'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {t('selectDocumentHint') ||
                    'Incarcati un document pentru a incepe procesarea OCR'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
