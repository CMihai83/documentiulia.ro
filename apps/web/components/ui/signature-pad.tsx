'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export interface SignaturePoint {
  x: number;
  y: number;
  time: number;
  pressure?: number;
}

export interface SignaturePath {
  points: SignaturePoint[];
  color: string;
  width: number;
}

export interface SignatureData {
  paths: SignaturePath[];
  width: number;
  height: number;
  timestamp: number;
}

// ============================================================================
// Signature Pad Component
// ============================================================================

interface SignaturePadProps {
  width?: number;
  height?: number;
  penColor?: string;
  penWidth?: number;
  backgroundColor?: string;
  onChange?: (data: SignatureData | null) => void;
  onBegin?: () => void;
  onEnd?: () => void;
  disabled?: boolean;
  className?: string;
}

export const SignaturePad = React.forwardRef<
  { clear: () => void; toDataURL: (type?: string) => string; toJSON: () => SignatureData; isEmpty: () => boolean },
  SignaturePadProps
>(
  (
    {
      width = 500,
      height = 200,
      penColor = '#000000',
      penWidth = 2,
      backgroundColor = 'transparent',
      onChange,
      onBegin,
      onEnd,
      disabled = false,
      className,
    },
    ref
  ) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [paths, setPaths] = React.useState<SignaturePath[]>([]);
    const currentPath = React.useRef<SignaturePath | null>(null);

    // Get canvas context
    const getContext = React.useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext('2d');
    }, []);

    // Clear canvas
    const clear = React.useCallback(() => {
      const ctx = getContext();
      if (!ctx || !canvasRef.current) return;

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setPaths([]);
      onChange?.(null);
    }, [getContext, backgroundColor, onChange]);

    // Check if empty
    const isEmpty = React.useCallback(() => {
      return paths.length === 0;
    }, [paths]);

    // Convert to data URL
    const toDataURL = React.useCallback((type = 'image/png') => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL(type);
    }, []);

    // Convert to JSON
    const toJSON = React.useCallback((): SignatureData => {
      return {
        paths,
        width,
        height,
        timestamp: Date.now(),
      };
    }, [paths, width, height]);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      clear,
      toDataURL,
      toJSON,
      isEmpty,
    }));

    // Initialize canvas
    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Set background
      const ctx = canvas.getContext('2d');
      if (ctx && backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }
    }, [width, height, backgroundColor]);

    // Redraw paths when they change
    React.useEffect(() => {
      const ctx = getContext();
      if (!ctx || !canvasRef.current) return;

      // Clear and redraw background
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      // Redraw all paths
      paths.forEach((path) => {
        if (path.points.length < 2) return;

        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const [firstPoint, ...restPoints] = path.points;
        ctx.moveTo(firstPoint.x, firstPoint.y);

        restPoints.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });

        ctx.stroke();
      });
    }, [paths, backgroundColor, getContext]);

    // Get point from event
    const getPoint = (e: React.MouseEvent | React.TouchEvent): SignaturePoint => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, time: Date.now() };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number;
      let clientY: number;
      let pressure: number | undefined;

      if ('touches' in e) {
        const touch = e.touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
        // @ts-ignore - force property may not exist
        pressure = touch.force;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
        time: Date.now(),
        pressure,
      };
    };

    // Handle drawing start
    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();

      const point = getPoint(e);
      currentPath.current = {
        points: [point],
        color: penColor,
        width: penWidth,
      };

      setIsDrawing(true);
      onBegin?.();

      // Draw initial point
      const ctx = getContext();
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    };

    // Handle drawing move
    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled || !currentPath.current) return;
      e.preventDefault();

      const point = getPoint(e);
      currentPath.current.points.push(point);

      // Draw line
      const ctx = getContext();
      if (ctx) {
        const points = currentPath.current.points;
        if (points.length >= 2) {
          const lastPoint = points[points.length - 2];
          ctx.strokeStyle = penColor;
          ctx.lineWidth = penWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
      }
    };

    // Handle drawing end
    const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled || !currentPath.current) return;
      e.preventDefault();

      setIsDrawing(false);

      if (currentPath.current.points.length > 0) {
        const newPaths = [...paths, currentPath.current];
        setPaths(newPaths);
        onChange?.({
          paths: newPaths,
          width,
          height,
          timestamp: Date.now(),
        });
      }

      currentPath.current = null;
      onEnd?.();
    };

    return (
      <div className={cn('relative inline-block', className)}>
        <canvas
          ref={canvasRef}
          className={cn(
            'border border-input rounded-md cursor-crosshair touch-none',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{ width, height }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
    );
  }
);
SignaturePad.displayName = 'SignaturePad';

// ============================================================================
// Signature Field Component (with controls)
// ============================================================================

interface SignatureFieldProps extends Omit<SignaturePadProps, 'onChange'> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  value?: SignatureData | null;
  onChange?: (data: SignatureData | null) => void;
  showClearButton?: boolean;
  showDownloadButton?: boolean;
}

export function SignatureField({
  label,
  description,
  error,
  required,
  value,
  onChange,
  showClearButton = true,
  showDownloadButton = false,
  className,
  ...props
}: SignatureFieldProps) {
  const padRef = React.useRef<{
    clear: () => void;
    toDataURL: (type?: string) => string;
    toJSON: () => SignatureData;
    isEmpty: () => boolean;
  }>(null);

  const handleClear = () => {
    padRef.current?.clear();
    onChange?.(null);
  };

  const handleDownload = () => {
    const dataURL = padRef.current?.toDataURL('image/png');
    if (dataURL) {
      const link = document.createElement('a');
      link.download = `semnatura_${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="space-y-2">
        <SignaturePad
          ref={padRef}
          onChange={onChange}
          {...props}
        />

        <div className="flex gap-2">
          {showClearButton && (
            <motion.button
              type="button"
              onClick={handleClear}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-1.5 text-sm border border-input rounded-md hover:bg-muted transition-colors"
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Sterge
              </span>
            </motion.button>
          )}

          {showDownloadButton && (
            <motion.button
              type="button"
              onClick={handleDownload}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-1.5 text-sm border border-input rounded-md hover:bg-muted transition-colors"
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descarca
              </span>
            </motion.button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// Signature Display Component (read-only)
// ============================================================================

interface SignatureDisplayProps {
  data?: SignatureData | null;
  imageUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  emptyMessage?: string;
}

export function SignatureDisplay({
  data,
  imageUrl,
  width = 300,
  height = 100,
  className,
  emptyMessage = 'Nicio semnatura',
}: SignatureDisplayProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Draw signature from data
  React.useEffect(() => {
    if (!data || imageUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale to fit
    const scaleX = width / data.width;
    const scaleY = height / data.height;
    const scale = Math.min(scaleX, scaleY);

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw paths
    data.paths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const [firstPoint, ...restPoints] = path.points;
      ctx.moveTo(firstPoint.x * scale, firstPoint.y * scale);

      restPoints.forEach((point) => {
        ctx.lineTo(point.x * scale, point.y * scale);
      });

      ctx.stroke();
    });
  }, [data, width, height, imageUrl]);

  if (!data && !imageUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-md text-muted-foreground',
          className
        )}
        style={{ width, height }}
      >
        {emptyMessage}
      </div>
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Semnatura"
        className={cn('border border-input rounded-md', className)}
        style={{ width, height, objectFit: 'contain' }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('border border-input rounded-md', className)}
      style={{ width, height }}
    />
  );
}

// ============================================================================
// Signature Modal Component
// ============================================================================

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SignatureData) => void;
  title?: string;
  penColor?: string;
  penWidth?: number;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSave,
  title = 'Adauga semnatura',
  penColor = '#000000',
  penWidth = 2,
}: SignatureModalProps) {
  const padRef = React.useRef<{
    clear: () => void;
    toDataURL: (type?: string) => string;
    toJSON: () => SignatureData;
    isEmpty: () => boolean;
  }>(null);
  const [signatureData, setSignatureData] = React.useState<SignatureData | null>(null);

  const handleSave = () => {
    if (signatureData) {
      onSave(signatureData);
      onClose();
    }
  };

  const handleClear = () => {
    padRef.current?.clear();
    setSignatureData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-background border border-border rounded-lg shadow-lg p-6 max-w-lg w-full mx-4"
      >
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">
            Deseneaza semnatura in spatiul de mai jos
          </p>
          <SignaturePad
            ref={padRef}
            width={450}
            height={150}
            penColor={penColor}
            penWidth={penWidth}
            backgroundColor="#ffffff"
            onChange={setSignatureData}
            className="w-full"
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted transition-colors"
          >
            Sterge
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted transition-colors"
            >
              Anuleaza
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!signatureData}
              className={cn(
                'px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md transition-colors',
                signatureData ? 'hover:bg-primary/90' : 'opacity-50 cursor-not-allowed'
              )}
            >
              Salveaza
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Document Signature Component (for invoices/contracts)
// ============================================================================

interface DocumentSignatureProps {
  signatory: string;
  position?: string;
  date?: string;
  signature?: SignatureData | null;
  signatureUrl?: string;
  onSign?: () => void;
  showSignButton?: boolean;
  className?: string;
}

export function DocumentSignature({
  signatory,
  position,
  date,
  signature,
  signatureUrl,
  onSign,
  showSignButton = true,
  className,
}: DocumentSignatureProps) {
  const hasSignature = signature || signatureUrl;

  return (
    <div className={cn('border border-input rounded-lg p-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium">{signatory}</div>
          {position && (
            <div className="text-sm text-muted-foreground">{position}</div>
          )}
        </div>

        {hasSignature ? (
          <div className="text-right">
            <SignatureDisplay
              data={signature}
              imageUrl={signatureUrl}
              width={150}
              height={60}
            />
            {date && (
              <div className="text-xs text-muted-foreground mt-1">
                Semnat la {date}
              </div>
            )}
          </div>
        ) : showSignButton && onSign ? (
          <button
            type="button"
            onClick={onSign}
            className="px-4 py-2 text-sm border border-dashed border-primary text-primary rounded-md hover:bg-primary/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Semneaza
            </span>
          </button>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            Nesemnat
          </div>
        )}
      </div>
    </div>
  );
}
