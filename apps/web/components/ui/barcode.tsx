'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type BarcodeFormat =
  | 'CODE128'
  | 'CODE39'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'ITF14'
  | 'MSI'
  | 'pharmacode';

export interface BarcodeProps {
  value: string;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: 'top' | 'bottom';
  textMargin?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  flat?: boolean;
  className?: string;
}

// ============================================================================
// Barcode Encoding Functions (CODE128 implementation)
// ============================================================================

const CODE128_PATTERNS: Record<number, string> = {
  0: '11011001100', 1: '11001101100', 2: '11001100110', 3: '10010011000',
  4: '10010001100', 5: '10001001100', 6: '10011001000', 7: '10011000100',
  8: '10001100100', 9: '11001001000', 10: '11001000100', 11: '11000100100',
  12: '10110011100', 13: '10011011100', 14: '10011001110', 15: '10111001100',
  16: '10011101100', 17: '10011100110', 18: '11001110010', 19: '11001011100',
  20: '11001001110', 21: '11011100100', 22: '11001110100', 23: '11101101110',
  24: '11101001100', 25: '11100101100', 26: '11100100110', 27: '11101100100',
  28: '11100110100', 29: '11100110010', 30: '11011011000', 31: '11011000110',
  32: '11000110110', 33: '10100011000', 34: '10001011000', 35: '10001000110',
  36: '10110001000', 37: '10001101000', 38: '10001100010', 39: '11010001000',
  40: '11000101000', 41: '11000100010', 42: '10110111000', 43: '10110001110',
  44: '10001101110', 45: '10111011000', 46: '10111000110', 47: '10001110110',
  48: '11101110110', 49: '11010001110', 50: '11000101110', 51: '11011101000',
  52: '11011100010', 53: '11011101110', 54: '11101011000', 55: '11101000110',
  56: '11100010110', 57: '11101101000', 58: '11101100010', 59: '11100011010',
  60: '11101111010', 61: '11001000010', 62: '11110001010', 63: '10100110000',
  64: '10100001100', 65: '10010110000', 66: '10010000110', 67: '10000101100',
  68: '10000100110', 69: '10110010000', 70: '10110000100', 71: '10011010000',
  72: '10011000010', 73: '10000110100', 74: '10000110010', 75: '11000010010',
  76: '11001010000', 77: '11110111010', 78: '11000010100', 79: '10001111010',
  80: '10100111100', 81: '10010111100', 82: '10010011110', 83: '10111100100',
  84: '10011110100', 85: '10011110010', 86: '11110100100', 87: '11110010100',
  88: '11110010010', 89: '11011011110', 90: '11011110110', 91: '11110110110',
  92: '10101111000', 93: '10100011110', 94: '10001011110', 95: '10111101000',
  96: '10111100010', 97: '11110101000', 98: '11110100010', 99: '10111011110',
  100: '10111101110', 101: '11101011110', 102: '11110101110',
  103: '11010000100', // Start Code B
  104: '11010010000', // Start Code A
  105: '11010011100', // Start Code C
  106: '1100011101011', // Stop
};

const encodeCode128 = (text: string): string => {
  let encoded = CODE128_PATTERNS[104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) - 32;
    if (charCode >= 0 && charCode < 95) {
      encoded += CODE128_PATTERNS[charCode];
      checksum += charCode * (i + 1);
    }
  }

  checksum = checksum % 103;
  encoded += CODE128_PATTERNS[checksum];
  encoded += CODE128_PATTERNS[106]; // Stop

  return encoded;
};

// ============================================================================
// Main Barcode Component
// ============================================================================

export function Barcode({
  value,
  format = 'CODE128',
  width = 2,
  height = 100,
  displayValue = true,
  fontSize = 14,
  textAlign = 'center',
  textPosition = 'bottom',
  textMargin = 2,
  background = 'transparent',
  lineColor = 'currentColor',
  margin = 10,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  flat = false,
  className,
}: BarcodeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const mTop = marginTop ?? margin;
  const mBottom = marginBottom ?? margin;
  const mLeft = marginLeft ?? margin;
  const mRight = marginRight ?? margin;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Encode the barcode
    let encoded: string;
    try {
      encoded = encodeCode128(value);
    } catch {
      encoded = '';
    }

    if (!encoded) return;

    // Calculate dimensions
    const barcodeWidth = encoded.length * width;
    const textHeight = displayValue ? fontSize + textMargin : 0;
    const totalWidth = barcodeWidth + mLeft + mRight;
    const totalHeight = height + mTop + mBottom + textHeight;

    // Set canvas size
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Clear and fill background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw barcode
    ctx.fillStyle = lineColor;
    let x = mLeft;
    const y = textPosition === 'top' ? mTop + textHeight : mTop;

    for (let i = 0; i < encoded.length; i++) {
      if (encoded[i] === '1') {
        ctx.fillRect(x, y, width, height);
      }
      x += width;
    }

    // Draw text
    if (displayValue) {
      ctx.fillStyle = lineColor;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = textAlign;

      let textX: number;
      switch (textAlign) {
        case 'left':
          textX = mLeft;
          break;
        case 'right':
          textX = mLeft + barcodeWidth;
          break;
        default:
          textX = mLeft + barcodeWidth / 2;
      }

      const textY = textPosition === 'top'
        ? mTop + fontSize
        : mTop + height + textMargin + fontSize;

      ctx.fillText(value, textX, textY);
    }
  }, [value, format, width, height, displayValue, fontSize, textAlign, textPosition, textMargin, background, lineColor, mTop, mBottom, mLeft, mRight]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('max-w-full', className)}
    />
  );
}

// ============================================================================
// Barcode Scanner Component (using Camera)
// ============================================================================

export interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  active?: boolean;
  className?: string;
}

export function BarcodeScanner({
  onScan,
  onError,
  active = true,
  className,
}: BarcodeScannerProps) {
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
    <div className={cn('relative overflow-hidden rounded-lg bg-black', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-64 h-32">
          {/* Corners */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />

          {/* Scanning line */}
          {scanning && (
            <div className="absolute left-0 right-0 h-0.5 bg-primary animate-pulse" style={{ top: '50%' }} />
          )}
        </div>
      </div>

      <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/80">
        Poziționați codul de bare în casetă
      </p>
    </div>
  );
}

// ============================================================================
// Barcode Display Component (for printing)
// ============================================================================

export interface BarcodeDisplayProps {
  value: string;
  label?: string;
  format?: BarcodeFormat;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 1, height: 40, fontSize: 10 },
  md: { width: 2, height: 60, fontSize: 12 },
  lg: { width: 3, height: 80, fontSize: 14 },
};

export function BarcodeDisplay({
  value,
  label,
  format = 'CODE128',
  size = 'md',
  showValue = true,
  className,
}: BarcodeDisplayProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <Barcode
        value={value}
        format={format}
        width={config.width}
        height={config.height}
        fontSize={config.fontSize}
        displayValue={showValue}
        margin={4}
      />
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Product Barcode
// ============================================================================

export interface ProductBarcodeProps {
  sku: string;
  productName?: string;
  price?: number;
  className?: string;
}

export function ProductBarcode({
  sku,
  productName,
  price,
  className,
}: ProductBarcodeProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  return (
    <div className={cn('p-4 border rounded-lg bg-white text-center', className)}>
      {productName && (
        <p className="text-sm font-medium mb-2 truncate">{productName}</p>
      )}

      <Barcode
        value={sku}
        width={2}
        height={50}
        displayValue
        fontSize={12}
        margin={4}
        lineColor="#000"
      />

      {price !== undefined && (
        <p className="text-lg font-bold mt-2">{formatPrice(price)}</p>
      )}
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Barcode
// ============================================================================

export interface InvoiceBarcodeProps {
  invoiceNumber: string;
  issueDate?: string;
  className?: string;
}

export function InvoiceBarcode({
  invoiceNumber,
  issueDate,
  className,
}: InvoiceBarcodeProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Barcode
        value={invoiceNumber}
        width={2}
        height={40}
        displayValue={false}
        margin={2}
      />
      <div className="text-center">
        <p className="text-xs font-mono">{invoiceNumber}</p>
        {issueDate && (
          <p className="text-[10px] text-muted-foreground">
            {new Date(issueDate).toLocaleDateString('ro-RO')}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type BarcodeScannerProps as BarcodeScannerComponentProps,
  type BarcodeDisplayProps as BarcodeDisplayComponentProps,
  type ProductBarcodeProps as ProductBarcodeComponentProps,
  type InvoiceBarcodeProps as InvoiceBarcodeComponentProps,
};
