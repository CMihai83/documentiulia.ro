'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PDFViewerProps {
  src: string;
  title?: string;
  initialPage?: number;
  initialZoom?: number;
  showToolbar?: boolean;
  showThumbnails?: boolean;
  allowDownload?: boolean;
  allowPrint?: boolean;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

// ============================================================================
// Main PDF Viewer Component
// ============================================================================

export function PDFViewer({
  src,
  title,
  initialPage = 1,
  initialZoom = 100,
  showToolbar = true,
  showThumbnails = false,
  allowDownload = true,
  allowPrint = true,
  onPageChange,
  onZoomChange,
  onLoad,
  onError,
  className,
}: PDFViewerProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [currentPage, setCurrentPage] = React.useState(initialPage);
  const [totalPages, setTotalPages] = React.useState(1);
  const [zoom, setZoom] = React.useState(initialZoom);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showThumbnailPanel, setShowThumbnailPanel] = React.useState(showThumbnails);

  const zoomLevels = [50, 75, 100, 125, 150, 200];

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError('Nu s-a putut încărca documentul PDF');
    onError?.(new Error('Failed to load PDF'));
  };

  const handlePageChange = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
    onPageChange?.(newPage);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = title || 'document.pdf';
    link.click();
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  // Build PDF URL with parameters
  const pdfUrl = React.useMemo(() => {
    const url = new URL(src, window.location.origin);
    url.hash = `page=${currentPage}&zoom=${zoom}`;
    return url.toString();
  }, [src, currentPage, zoom]);

  return (
    <div className={cn('flex flex-col h-full border rounded-lg overflow-hidden bg-background', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pagina anterioară"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-1 text-sm">
                <input
                  type="number"
                  value={currentPage}
                  onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
                  className="w-12 px-2 py-1 text-center border rounded"
                  min={1}
                  max={totalPages}
                />
                <span className="text-muted-foreground">/ {totalPages}</span>
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pagina următoare"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="w-px h-6 bg-border mx-2" />

            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleZoomChange(Math.max(50, zoom - 25))}
                disabled={zoom <= 50}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                title="Micșorează"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>

              <select
                value={zoom}
                onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                className="px-2 py-1 text-sm border rounded bg-background"
              >
                {zoomLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}%
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleZoomChange(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                title="Mărește"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Thumbnail toggle */}
            <button
              onClick={() => setShowThumbnailPanel(!showThumbnailPanel)}
              className={cn(
                'p-1.5 rounded hover:bg-muted',
                showThumbnailPanel && 'bg-muted'
              )}
              title="Miniaturi"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>

            {allowPrint && (
              <button
                onClick={handlePrint}
                className="p-1.5 rounded hover:bg-muted"
                title="Printează"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
            )}

            {allowDownload && (
              <button
                onClick={handleDownload}
                className="p-1.5 rounded hover:bg-muted"
                title="Descarcă"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnail panel */}
        <AnimatePresence>
          {showThumbnailPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 150, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r bg-muted/30 overflow-y-auto"
            >
              <div className="p-2 space-y-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={cn(
                      'w-full p-1 rounded border-2 transition-colors',
                      page === currentPage
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:border-muted-foreground/20'
                    )}
                  >
                    <div className="aspect-[3/4] bg-white rounded flex items-center justify-center text-xs text-muted-foreground">
                      {page}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF display */}
        <div className="flex-1 relative bg-muted">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Se încarcă documentul...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={pdfUrl}
            onLoad={handleLoad}
            onError={handleError}
            className="w-full h-full border-0"
            title={title || 'PDF Viewer'}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PDF Preview Component (simplified viewer)
// ============================================================================

export interface PDFPreviewProps {
  src: string;
  title?: string;
  showOverlay?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PDFPreview({
  src,
  title,
  showOverlay = true,
  onClick,
  className,
}: PDFPreviewProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative aspect-[3/4] border rounded-lg overflow-hidden cursor-pointer group',
        className
      )}
    >
      <iframe
        src={`${src}#page=1&view=FitH`}
        className="w-full h-full border-0 pointer-events-none"
        title={title || 'PDF Preview'}
      />

      {showOverlay && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-3 bg-white rounded-full shadow-lg">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-sm text-white truncate">{title}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice PDF Viewer
// ============================================================================

export interface InvoicePDFViewerProps {
  invoiceId: string;
  invoiceNumber: string;
  pdfUrl: string;
  onSendEmail?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  className?: string;
}

export function InvoicePDFViewer({
  invoiceId,
  invoiceNumber,
  pdfUrl,
  onSendEmail,
  onDownload,
  onPrint,
  className,
}: InvoicePDFViewerProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div>
          <h2 className="font-semibold">Factură {invoiceNumber}</h2>
          <p className="text-sm text-muted-foreground">Previzualizare document</p>
        </div>

        <div className="flex items-center gap-2">
          {onSendEmail && (
            <button
              onClick={onSendEmail}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Trimite email
            </button>
          )}

          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descarcă PDF
            </button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1">
        <PDFViewer
          src={pdfUrl}
          title={`Factura ${invoiceNumber}`}
          showToolbar
          allowDownload
          allowPrint
        />
      </div>
    </div>
  );
}

// ============================================================================
// Document List with PDF Previews
// ============================================================================

export interface DocumentItem {
  id: string;
  title: string;
  pdfUrl: string;
  type: 'invoice' | 'receipt' | 'contract' | 'report' | 'other';
  date: string;
}

export interface DocumentListProps {
  documents: DocumentItem[];
  onDocumentClick?: (document: DocumentItem) => void;
  className?: string;
}

const documentTypeLabels: Record<DocumentItem['type'], string> = {
  invoice: 'Factură',
  receipt: 'Chitanță',
  contract: 'Contract',
  report: 'Raport',
  other: 'Document',
};

const documentTypeColors: Record<DocumentItem['type'], string> = {
  invoice: 'bg-blue-100 text-blue-700',
  receipt: 'bg-green-100 text-green-700',
  contract: 'bg-purple-100 text-purple-700',
  report: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
};

export function DocumentList({
  documents,
  onDocumentClick,
  className,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-muted-foreground', className)}>
        Nu există documente
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => onDocumentClick?.(doc)}
          className="group cursor-pointer"
        >
          <PDFPreview
            src={doc.pdfUrl}
            title={doc.title}
            className="mb-2"
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                documentTypeColors[doc.type]
              )}>
                {documentTypeLabels[doc.type]}
              </span>
            </div>
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {doc.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(doc.date).toLocaleDateString('ro-RO')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type PDFPreviewProps as PDFPreviewComponentProps,
  type InvoicePDFViewerProps as InvoicePDFProps,
  type DocumentItem as PDFDocumentItem,
  type DocumentListProps as PDFDocumentListProps,
};
