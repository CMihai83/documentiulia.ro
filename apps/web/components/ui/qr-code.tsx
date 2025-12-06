'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type QRCodeErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRCodeProps {
  value: string;
  size?: number;
  level?: QRCodeErrorCorrectionLevel;
  background?: string;
  foreground?: string;
  margin?: number;
  includeImage?: boolean;
  imageUrl?: string;
  imageSize?: number;
  className?: string;
}

// ============================================================================
// QR Code Generation (simplified implementation)
// ============================================================================

// This is a simplified QR code generator for demonstration
// In production, use a library like 'qrcode' or 'qr.js'

const generateQRMatrix = (data: string, size: number): boolean[][] => {
  // Simplified QR pattern generation
  const moduleCount = Math.max(21, Math.min(177, Math.ceil(data.length / 2) + 21));
  const matrix: boolean[][] = [];

  // Initialize matrix
  for (let i = 0; i < moduleCount; i++) {
    matrix[i] = [];
    for (let j = 0; j < moduleCount; j++) {
      matrix[i][j] = false;
    }
  }

  // Add finder patterns (corners)
  const addFinderPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const newRow = row + r;
        const newCol = col + c;
        if (newRow >= 0 && newRow < moduleCount && newCol >= 0 && newCol < moduleCount) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            matrix[newRow][newCol] = false;
          } else if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[newRow][newCol] = true;
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[newRow][newCol] = true;
          }
        }
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, moduleCount - 7);
  addFinderPattern(moduleCount - 7, 0);

  // Add timing patterns
  for (let i = 8; i < moduleCount - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Add data (pseudo-random based on input string)
  let dataIndex = 0;
  for (let row = moduleCount - 1; row >= 0; row -= 2) {
    if (row === 6) row = 5;
    for (let col = moduleCount - 1; col >= 0; col--) {
      for (let c = 0; c < 2; c++) {
        const actualCol = col - c;
        if (!isReserved(row, actualCol, moduleCount)) {
          if (dataIndex < data.length) {
            const charCode = data.charCodeAt(dataIndex % data.length);
            matrix[row][actualCol] = ((charCode + dataIndex) % 2) === 0;
            dataIndex++;
          }
        }
      }
    }
  }

  return matrix;
};

const isReserved = (row: number, col: number, size: number): boolean => {
  // Finder patterns
  if (row < 9 && col < 9) return true;
  if (row < 9 && col >= size - 8) return true;
  if (row >= size - 8 && col < 9) return true;
  // Timing patterns
  if (row === 6 || col === 6) return true;
  return false;
};

// ============================================================================
// Main QR Code Component
// ============================================================================

export function QRCode({
  value,
  size = 200,
  level = 'M',
  background = '#ffffff',
  foreground = '#000000',
  margin = 4,
  includeImage = false,
  imageUrl,
  imageSize = 40,
  className,
}: QRCodeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate QR matrix
    const matrix = generateQRMatrix(value, size);
    const moduleCount = matrix.length;
    const moduleSize = (size - margin * 2) / moduleCount;

    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Draw background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);

    // Draw QR modules
    ctx.fillStyle = foreground;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix[row][col]) {
          ctx.fillRect(
            margin + col * moduleSize,
            margin + row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }

    // Draw center image if provided
    if (includeImage && imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const x = (size - imageSize) / 2;
        const y = (size - imageSize) / 2;

        // Draw white background for image
        ctx.fillStyle = background;
        ctx.fillRect(x - 4, y - 4, imageSize + 8, imageSize + 8);

        // Draw image
        ctx.drawImage(img, x, y, imageSize, imageSize);
      };
      img.src = imageUrl;
    }
  }, [value, size, level, background, foreground, margin, includeImage, imageUrl, imageSize]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={cn('max-w-full', className)}
    />
  );
}

// ============================================================================
// QR Code with Download
// ============================================================================

export interface QRCodeWithDownloadProps extends QRCodeProps {
  filename?: string;
  downloadFormat?: 'png' | 'jpeg' | 'svg';
  showDownloadButton?: boolean;
}

export function QRCodeWithDownload({
  filename = 'qrcode',
  downloadFormat = 'png',
  showDownloadButton = true,
  className,
  ...props
}: QRCodeWithDownloadProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const mimeType = downloadFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType);

    const link = document.createElement('a');
    link.download = `${filename}.${downloadFormat}`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div ref={containerRef} className={cn('inline-flex flex-col items-center gap-2', className)}>
      <QRCode {...props} />

      {showDownloadButton && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descarcă
        </button>
      )}
    </div>
  );
}

// ============================================================================
// QR Code Scanner Component
// ============================================================================

export interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  active?: boolean;
  className?: string;
}

export function QRCodeScanner({
  onScan,
  onError,
  active = true,
  className,
}: QRCodeScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setScanning(true);
        }
      } catch (err) {
        setHasCamera(false);
        onError?.(err as Error);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [active, onError]);

  if (!hasCamera) {
    return (
      <div className={cn('flex items-center justify-center p-8 bg-muted rounded-lg', className)}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-muted-foreground">Camera nu este disponibilă</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-black aspect-square', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

          {/* Scanning animation */}
          {scanning && (
            <div
              className="absolute left-0 right-0 h-1 bg-primary/60 animate-bounce"
              style={{ animationDuration: '2s' }}
            />
          )}
        </div>
      </div>

      <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/80">
        Poziționați codul QR în casetă
      </p>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Payment QR Code
// ============================================================================

export interface PaymentQRCodeProps {
  amount: number;
  currency?: string;
  iban?: string;
  beneficiary?: string;
  reference?: string;
  description?: string;
  size?: number;
  className?: string;
}

export function PaymentQRCode({
  amount,
  currency = 'RON',
  iban,
  beneficiary,
  reference,
  description,
  size = 200,
  className,
}: PaymentQRCodeProps) {
  // Generate payment string (simplified format)
  const paymentData = [
    `BCD`,
    `002`,
    `1`,
    `SCT`,
    iban || '',
    beneficiary || '',
    `${currency}${amount.toFixed(2)}`,
    reference || '',
    description || '',
  ].join('\n');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
    }).format(value);
  };

  return (
    <div className={cn('p-4 border rounded-lg bg-white text-center', className)}>
      <QRCode
        value={paymentData}
        size={size}
        foreground="#000000"
        background="#ffffff"
      />

      <div className="mt-4 space-y-1">
        <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
        {beneficiary && (
          <p className="text-sm text-muted-foreground">{beneficiary}</p>
        )}
        {reference && (
          <p className="text-xs font-mono text-muted-foreground">{reference}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice QR Code
// ============================================================================

export interface InvoiceQRCodeProps {
  invoiceNumber: string;
  amount: number;
  currency?: string;
  issueDate: string;
  dueDate?: string;
  sellerName?: string;
  sellerCUI?: string;
  buyerName?: string;
  size?: number;
  className?: string;
}

export function InvoiceQRCode({
  invoiceNumber,
  amount,
  currency = 'RON',
  issueDate,
  dueDate,
  sellerName,
  sellerCUI,
  buyerName,
  size = 180,
  className,
}: InvoiceQRCodeProps) {
  // Generate invoice data string
  const invoiceData = JSON.stringify({
    nr: invoiceNumber,
    sum: amount,
    cur: currency,
    date: issueDate,
    due: dueDate,
    seller: sellerName,
    cui: sellerCUI,
    buyer: buyerName,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
    }).format(value);
  };

  return (
    <div className={cn('p-3 border rounded-lg bg-white', className)}>
      <div className="flex items-start gap-4">
        <QRCode
          value={invoiceData}
          size={size}
          foreground="#000000"
          background="#ffffff"
        />

        <div className="flex-1 min-w-0 py-2">
          <p className="text-xs text-muted-foreground">Factură</p>
          <p className="font-semibold">{invoiceNumber}</p>

          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Emisă:</span>
              <span>{new Date(issueDate).toLocaleDateString('ro-RO')}</span>
            </div>

            {dueDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scadență:</span>
                <span>{new Date(dueDate).toLocaleDateString('ro-RO')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Share QR Code Component
// ============================================================================

export interface ShareQRCodeProps {
  url: string;
  title?: string;
  description?: string;
  size?: number;
  className?: string;
}

export function ShareQRCode({
  url,
  title,
  description,
  size = 200,
  className,
}: ShareQRCodeProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={cn('p-4 border rounded-lg bg-card text-center', className)}>
      {title && <h3 className="font-semibold mb-2">{title}</h3>}
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}

      <QRCode
        value={url}
        size={size}
        className="mx-auto"
      />

      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={url}
          readOnly
          className="flex-1 px-3 py-2 text-sm bg-muted rounded-md truncate"
        />
        <button
          onClick={handleCopy}
          className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {copied ? 'Copiat!' : 'Copiază'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type QRCodeWithDownloadProps as QRCodeDownloadProps,
  type QRCodeScannerProps as QRCodeScannerComponentProps,
  type PaymentQRCodeProps as PaymentQRProps,
  type InvoiceQRCodeProps as InvoiceQRProps,
  type ShareQRCodeProps as ShareQRProps,
};
