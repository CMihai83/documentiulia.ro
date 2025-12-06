'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  FileText,
  Download,
  Printer,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  FileImage,
  File,
  FileSpreadsheet,
  FileCode,
  Image,
  Loader2,
  AlertCircle,
  Check,
  Mail,
  ExternalLink,
  Copy,
  MoreVertical,
} from 'lucide-react';

// Types
export type DocumentType = 'pdf' | 'image' | 'invoice' | 'receipt' | 'contract' | 'report' | 'spreadsheet' | 'other';

export interface DocumentPreviewProps {
  url: string;
  type: DocumentType;
  title: string;
  pages?: number;
  size?: string;
  date?: string;
  onDownload?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  onClose?: () => void;
  variant?: 'default' | 'compact' | 'fullscreen' | 'modal';
  className?: string;
}

export interface DocumentThumbnailProps {
  url: string;
  type: DocumentType;
  title: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export interface DocumentViewerProps {
  documents: Array<{
    id: string;
    url: string;
    type: DocumentType;
    title: string;
    pages?: number;
    size?: string;
    date?: string;
  }>;
  initialIndex?: number;
  onClose?: () => void;
  className?: string;
}

export interface DocumentActionsProps {
  onDownload?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  onEmail?: () => void;
  onCopy?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

// Helper functions
const getDocumentIcon = (type: DocumentType) => {
  switch (type) {
    case 'pdf':
      return FileText;
    case 'image':
      return Image;
    case 'invoice':
      return FileText;
    case 'receipt':
      return FileText;
    case 'contract':
      return FileCode;
    case 'report':
      return FileSpreadsheet;
    case 'spreadsheet':
      return FileSpreadsheet;
    default:
      return File;
  }
};

const getDocumentColor = (type: DocumentType): string => {
  switch (type) {
    case 'pdf':
      return 'text-red-500 bg-red-50 dark:bg-red-950/30';
    case 'image':
      return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30';
    case 'invoice':
      return 'text-green-500 bg-green-50 dark:bg-green-950/30';
    case 'receipt':
      return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30';
    case 'contract':
      return 'text-purple-500 bg-purple-50 dark:bg-purple-950/30';
    case 'report':
      return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30';
    case 'spreadsheet':
      return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
    default:
      return 'text-slate-500 bg-slate-50 dark:bg-slate-950/30';
  }
};

const getDocumentLabel = (type: DocumentType): string => {
  switch (type) {
    case 'pdf':
      return 'PDF';
    case 'image':
      return 'Imagine';
    case 'invoice':
      return 'Factură';
    case 'receipt':
      return 'Bon';
    case 'contract':
      return 'Contract';
    case 'report':
      return 'Raport';
    case 'spreadsheet':
      return 'Tabel';
    default:
      return 'Document';
  }
};

// Document Preview Component
export function DocumentPreview({
  url,
  type,
  title,
  pages = 1,
  size,
  date,
  onDownload,
  onPrint,
  onShare,
  onClose,
  variant = 'default',
  className,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const Icon = getDocumentIcon(type);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 25, 50));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, pages));
  }, [pages]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-slate-900',
          'hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer',
          className
        )}
      >
        <div className={cn('p-2 rounded-lg', getDocumentColor(type))}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {title}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{getDocumentLabel(type)}</span>
            {size && (
              <>
                <span>•</span>
                <span>{size}</span>
              </>
            )}
            {pages > 1 && (
              <>
                <span>•</span>
                <span>{pages} pagini</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onDownload}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4 text-slate-500" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col bg-white dark:bg-slate-900 rounded-xl border shadow-lg overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', getDocumentColor(type))}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{getDocumentLabel(type)}</span>
              {size && (
                <>
                  <span>•</span>
                  <span>{size}</span>
                </>
              )}
              {date && (
                <>
                  <span>•</span>
                  <span>{date}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Descarcă"
            >
              <Download className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          )}
          {onPrint && (
            <button
              onClick={onPrint}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Printează"
            >
              <Printer className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Distribuie"
            >
              <Share2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Ieși din ecran complet' : 'Ecran complet'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <Maximize2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Închide"
            >
              <X className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b bg-slate-100 dark:bg-slate-800/30">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 50}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          title="Micșorează"
        >
          <ZoomOut className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        <span className="text-xs text-slate-600 dark:text-slate-400 min-w-[4rem] text-center">
          {zoom}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 200}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          title="Mărește"
        >
          <ZoomIn className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-2" />
        <button
          onClick={handleRotate}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          title="Rotește"
        >
          <RotateCw className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        {pages > 1 && (
          <>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-2" />
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
              title="Pagina anterioară"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-400 min-w-[5rem] text-center">
              {currentPage} / {pages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= pages}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
              title="Pagina următoare"
            >
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          </>
        )}
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-slate-200 dark:bg-slate-950 p-4 min-h-[400px]">
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Se încarcă documentul...
              </p>
            </motion.div>
          )}
          {hasError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Nu s-a putut încărca documentul
              </p>
              <button
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                }}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Încearcă din nou
              </button>
            </motion.div>
          )}
          {!isLoading && !hasError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-center h-full"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out',
              }}
            >
              {type === 'image' ? (
                <img
                  src={url}
                  alt={title}
                  onLoad={handleLoad}
                  onError={handleError}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 min-w-[300px]">
                  <div className={cn('p-4 rounded-lg mx-auto w-fit mb-4', getDocumentColor(type))}>
                    <Icon className="h-16 w-16" />
                  </div>
                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    {title}
                  </p>
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {getDocumentLabel(type)} • {size || 'Necunoscut'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {type === 'image' && (
          <img
            src={url}
            alt=""
            onLoad={handleLoad}
            onError={handleError}
            className="hidden"
          />
        )}
      </div>
    </motion.div>
  );
}

// Document Thumbnail Component
export function DocumentThumbnail({
  url,
  type,
  title,
  onClick,
  selected = false,
  className,
}: DocumentThumbnailProps) {
  const Icon = getDocumentIcon(type);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-colors',
        selected
          ? 'border-blue-500 dark:border-blue-400'
          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600',
        className
      )}
    >
      <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {type === 'image' ? (
          <img
            src={url}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn('p-3 rounded-lg', getDocumentColor(type))}>
            <Icon className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ opacity: 1, scale: 1 }}
          className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg opacity-0 group-hover:opacity-100"
        >
          <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </motion.div>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 p-1 bg-blue-500 rounded-full">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      <div className="p-2 bg-white dark:bg-slate-900">
        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
          {title}
        </p>
      </div>
    </motion.div>
  );
}

// Document Viewer (Multi-document)
export function DocumentViewer({
  documents,
  initialIndex = 0,
  onClose,
  className,
}: DocumentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentDocument = documents[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
  }, [documents.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
  }, [documents.length]);

  if (!currentDocument) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn('fixed inset-0 z-50 flex', className)}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative flex flex-col flex-1 m-4 md:m-8">
        {/* Main Preview */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={handlePrev}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>

          <DocumentPreview
            url={currentDocument.url}
            type={currentDocument.type}
            title={currentDocument.title}
            pages={currentDocument.pages}
            size={currentDocument.size}
            date={currentDocument.date}
            onClose={onClose}
            variant="fullscreen"
            className="w-full max-w-4xl h-full"
          />

          <button
            onClick={handleNext}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Thumbnail Strip */}
        {documents.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 p-2 bg-black/50 rounded-lg overflow-x-auto">
            {documents.map((doc, index) => (
              <button
                key={doc.id}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-16 h-20 rounded overflow-hidden border-2 transition-colors flex-shrink-0',
                  index === currentIndex
                    ? 'border-blue-500'
                    : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                <div className={cn('w-full h-full flex items-center justify-center', getDocumentColor(doc.type))}>
                  {React.createElement(getDocumentIcon(doc.type), { className: 'h-6 w-6' })}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Document Actions Component
export function DocumentActions({
  onDownload,
  onPrint,
  onShare,
  onEmail,
  onCopy,
  variant = 'default',
  className,
}: DocumentActionsProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy?.();
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  }, [onCopy]);

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {onDownload && (
          <button
            onClick={onDownload}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="Descarcă"
          >
            <Download className="h-4 w-4 text-slate-500" />
          </button>
        )}
        {onShare && (
          <button
            onClick={onShare}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="Distribuie"
          >
            <Share2 className="h-4 w-4 text-slate-500" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Descarcă</span>
          </button>
        )}
        {onPrint && (
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Printează</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onDownload && (
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Descarcă</span>
        </button>
      )}
      {onPrint && (
        <button
          onClick={onPrint}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Printer className="h-4 w-4" />
          <span>Printează</span>
        </button>
      )}
      {onShare && (
        <button
          onClick={onShare}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span>Distribuie</span>
        </button>
      )}
      {onEmail && (
        <button
          onClick={onEmail}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Mail className="h-4 w-4" />
          <span>Trimite email</span>
        </button>
      )}
      {onCopy && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          {copiedMessage ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Copiat!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copiază link</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Document List Component
export function DocumentList({
  documents,
  onSelect,
  selectedId,
  variant = 'grid',
  className,
}: {
  documents: Array<{
    id: string;
    url: string;
    type: DocumentType;
    title: string;
    size?: string;
    date?: string;
  }>;
  onSelect?: (id: string) => void;
  selectedId?: string;
  variant?: 'grid' | 'list';
  className?: string;
}) {
  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        {documents.map((doc) => (
          <DocumentPreview
            key={doc.id}
            url={doc.url}
            type={doc.type}
            title={doc.title}
            size={doc.size}
            date={doc.date}
            variant="compact"
            className={cn(
              selectedId === doc.id && 'ring-2 ring-blue-500',
              'cursor-pointer'
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4', className)}>
      {documents.map((doc) => (
        <DocumentThumbnail
          key={doc.id}
          url={doc.url}
          type={doc.type}
          title={doc.title}
          onClick={() => onSelect?.(doc.id)}
          selected={selectedId === doc.id}
        />
      ))}
    </div>
  );
}

// Empty State Component
export function DocumentEmptyState({
  onUpload,
  className,
}: {
  onUpload?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl',
        className
      )}
    >
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
        <FileText className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
        Niciun document
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Încărcați documente pentru a le vizualiza aici
      </p>
      {onUpload && (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          <FileImage className="h-4 w-4" />
          <span>Încarcă document</span>
        </button>
      )}
    </motion.div>
  );
}

export default DocumentPreview;
