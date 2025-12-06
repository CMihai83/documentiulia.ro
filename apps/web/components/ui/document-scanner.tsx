'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type DocumentType = 'invoice' | 'receipt' | 'contract' | 'id' | 'other';
export type ScanQuality = 'low' | 'medium' | 'high';
export type ScanStatus = 'idle' | 'capturing' | 'processing' | 'success' | 'error';

export interface ScannedDocument {
  id: string;
  image: string;
  type: DocumentType;
  extractedData?: Record<string, unknown>;
  confidence?: number;
  timestamp: Date;
}

export interface DocumentScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (document: ScannedDocument) => void;
  documentType?: DocumentType;
  enableOCR?: boolean;
  quality?: ScanQuality;
  className?: string;
}

// ============================================================================
// Document Type Configuration
// ============================================================================

const documentTypes: Record<DocumentType, { label: string; description: string; icon: React.ReactNode }> = {
  invoice: {
    label: 'Factură',
    description: 'Scanează o factură pentru extragerea datelor',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  receipt: {
    label: 'Bon fiscal',
    description: 'Scanează un bon pentru înregistrarea cheltuielilor',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      </svg>
    ),
  },
  contract: {
    label: 'Contract',
    description: 'Scanează un contract pentru arhivare',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  id: {
    label: 'Act de identitate',
    description: 'Scanează CI/Pașaport pentru verificare',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
      </svg>
    ),
  },
  other: {
    label: 'Alt document',
    description: 'Scanează orice alt tip de document',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
};

// ============================================================================
// Document Scanner Component
// ============================================================================

export function DocumentScanner({
  open,
  onOpenChange,
  onScan,
  documentType: initialType = 'invoice',
  enableOCR = true,
  quality = 'high',
  className,
}: DocumentScannerProps) {
  const [status, setStatus] = React.useState<ScanStatus>('idle');
  const [documentType, setDocumentType] = React.useState<DocumentType>(initialType);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [extractedData, setExtractedData] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Start camera
  const startCamera = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: quality === 'high' ? 1920 : quality === 'medium' ? 1280 : 640 },
          height: { ideal: quality === 'high' ? 1080 : quality === 'medium' ? 720 : 480 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError('Nu s-a putut accesa camera. Verificați permisiunile.');
    }
  }, [quality]);

  // Stop camera
  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture image from camera
  const captureFromCamera = React.useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setStatus('processing');

    // Simulate OCR processing
    processImage(imageData);
  }, []);

  // Handle file upload
  const handleFileUpload = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setCapturedImage(imageData);
      setStatus('processing');
      processImage(imageData);
    };
    reader.readAsDataURL(file);
  }, []);

  // Process image with OCR (simulated)
  const processImage = async (imageData: string) => {
    setProgress(0);

    // Simulate OCR processing with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setProgress(i);
    }

    // Simulate extracted data based on document type
    const mockData = getMockExtractedData(documentType);
    setExtractedData(mockData);
    setStatus('success');
  };

  // Get mock extracted data based on document type
  const getMockExtractedData = (type: DocumentType): Record<string, unknown> => {
    switch (type) {
      case 'invoice':
        return {
          invoiceNumber: 'FA-2024-001234',
          date: '2024-01-15',
          vendor: 'SC Exemplu SRL',
          vendorCUI: 'RO12345678',
          total: 1250.50,
          vat: 237.59,
          currency: 'RON',
          confidence: 0.92,
        };
      case 'receipt':
        return {
          date: '2024-01-15',
          vendor: 'Magazin SRL',
          total: 125.50,
          items: ['Produs 1', 'Produs 2'],
          confidence: 0.88,
        };
      default:
        return {
          text: 'Document text extracted...',
          confidence: 0.85,
        };
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
  };

  // Handle save
  const handleSave = () => {
    if (!capturedImage) return;

    const document: ScannedDocument = {
      id: `doc-${Date.now()}`,
      image: capturedImage,
      type: documentType,
      extractedData: extractedData || undefined,
      confidence: (extractedData?.confidence as number) || undefined,
      timestamp: new Date(),
    };

    onScan(document);
    onOpenChange(false);
    resetScanner();
  };

  // Cleanup on close
  React.useEffect(() => {
    if (!open) {
      stopCamera();
      resetScanner();
    }
  }, [open, stopCamera]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50',
              'md:w-full md:max-w-2xl md:max-h-[90vh]',
              'bg-background rounded-lg shadow-xl overflow-hidden flex flex-col',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Scanare document</h2>
                <p className="text-sm text-muted-foreground">
                  {documentTypes[documentType].description}
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {status === 'idle' && !capturedImage && (
                <div className="space-y-6">
                  {/* Document Type Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Tip document</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(Object.keys(documentTypes) as DocumentType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setDocumentType(type)}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all',
                            documentType === type
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-primary">{documentTypes[type].icon}</span>
                            <span className="font-medium text-sm">{documentTypes[type].label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Capture Options */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setStatus('capturing');
                        startCamera();
                      }}
                      className="p-6 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors text-center"
                    >
                      <svg className="w-8 h-8 mx-auto mb-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">Folosește camera</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors text-center"
                    >
                      <svg className="w-8 h-8 mx-auto mb-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Încarcă imagine</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {status === 'capturing' && (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Capture frame guide */}
                    <div className="absolute inset-4 border-2 border-white/50 rounded-lg pointer-events-none" />
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        stopCamera();
                        setStatus('idle');
                      }}
                      className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                    >
                      Anulează
                    </button>
                    <button
                      onClick={captureFromCamera}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                      Capturează
                    </button>
                  </div>
                </div>
              )}

              {status === 'processing' && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Se procesează documentul...</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {enableOCR ? 'Se extrag datele din document' : 'Se încarcă imaginea'}
                  </p>
                  <div className="max-w-xs mx-auto">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
                  </div>
                </div>
              )}

              {status === 'success' && capturedImage && (
                <div className="space-y-6">
                  {/* Preview Image */}
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Scanned document"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Extracted Data */}
                  {enableOCR && extractedData && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="font-medium">Date extrase</h4>
                        {typeof extractedData.confidence === 'number' && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            Încredere: {(extractedData.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {Object.entries(extractedData)
                          .filter(([key]) => key !== 'confidence')
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className="text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="ml-2 font-medium">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {status === 'success' && (
              <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
                <button
                  onClick={resetScanner}
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                >
                  Scanează din nou
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Salvează document
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Quick Scan Button Component
// ============================================================================

export interface QuickScanButtonProps {
  onScan: (document: ScannedDocument) => void;
  documentType?: DocumentType;
  className?: string;
}

export function QuickScanButton({
  onScan,
  documentType = 'receipt',
  className,
}: QuickScanButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md',
          'hover:bg-primary/90 transition-colors',
          className
        )}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        </svg>
        Scanează
      </button>

      <DocumentScanner
        open={isOpen}
        onOpenChange={setIsOpen}
        onScan={onScan}
        documentType={documentType}
      />
    </>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type ScannedDocument as ScanResult,
  type DocumentScannerProps as ScannerProps,
  type QuickScanButtonProps as ScanButtonProps,
  documentTypes as documentTypeConfig,
};
