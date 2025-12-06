'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type PaperSize = 'A4' | 'A5' | 'Letter' | 'Legal';
export type PaperOrientation = 'portrait' | 'landscape';

export interface PrintSettings {
  paperSize: PaperSize;
  orientation: PaperOrientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  scale: number;
  includeBackground: boolean;
  includeHeaderFooter: boolean;
}

export interface PrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: React.ReactNode;
  title?: string;
  onPrint?: (settings: PrintSettings) => void;
  defaultSettings?: Partial<PrintSettings>;
  className?: string;
}

// ============================================================================
// Paper Size Configuration
// ============================================================================

const paperSizes: Record<PaperSize, { width: number; height: number; label: string }> = {
  A4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
  A5: { width: 148, height: 210, label: 'A5 (148 × 210 mm)' },
  Letter: { width: 216, height: 279, label: 'Letter (8.5 × 11 in)' },
  Legal: { width: 216, height: 356, label: 'Legal (8.5 × 14 in)' },
};

const defaultPrintSettings: PrintSettings = {
  paperSize: 'A4',
  orientation: 'portrait',
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  scale: 100,
  includeBackground: true,
  includeHeaderFooter: false,
};

// ============================================================================
// Print Preview Component
// ============================================================================

export function PrintPreview({
  open,
  onOpenChange,
  content,
  title = 'Previzualizare imprimare',
  onPrint,
  defaultSettings,
  className,
}: PrintPreviewProps) {
  const [settings, setSettings] = React.useState<PrintSettings>({
    ...defaultPrintSettings,
    ...defaultSettings,
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages] = React.useState(1);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (onPrint) {
      onPrint(settings);
    } else {
      window.print();
    }
  };

  const paperDimensions = React.useMemo(() => {
    const size = paperSizes[settings.paperSize];
    if (settings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    return { width: size.width, height: size.height };
  }, [settings.paperSize, settings.orientation]);

  // Calculate scaled preview dimensions (fit in viewport)
  const previewScale = 0.5;
  const previewWidth = paperDimensions.width * previewScale * (settings.scale / 100);
  const previewHeight = paperDimensions.height * previewScale * (settings.scale / 100);

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
              'fixed inset-4 z-50 bg-background rounded-lg shadow-xl overflow-hidden',
              'flex flex-col',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{title}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimă
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Settings Panel */}
              <div className="w-64 border-r p-4 overflow-y-auto">
                <div className="space-y-6">
                  {/* Paper Size */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Dimensiune hârtie</label>
                    <select
                      value={settings.paperSize}
                      onChange={(e) => setSettings((s) => ({ ...s, paperSize: e.target.value as PaperSize }))}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    >
                      {Object.entries(paperSizes).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Orientation */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Orientare</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSettings((s) => ({ ...s, orientation: 'portrait' }))}
                        className={cn(
                          'p-3 border rounded-md flex flex-col items-center gap-2 transition-colors',
                          settings.orientation === 'portrait' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                        )}
                      >
                        <div className="w-6 h-8 border-2 border-current rounded" />
                        <span className="text-xs">Portret</span>
                      </button>
                      <button
                        onClick={() => setSettings((s) => ({ ...s, orientation: 'landscape' }))}
                        className={cn(
                          'p-3 border rounded-md flex flex-col items-center gap-2 transition-colors',
                          settings.orientation === 'landscape' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                        )}
                      >
                        <div className="w-8 h-6 border-2 border-current rounded" />
                        <span className="text-xs">Peisaj</span>
                      </button>
                    </div>
                  </div>

                  {/* Scale */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Scală: {settings.scale}%</label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="10"
                      value={settings.scale}
                      onChange={(e) => setSettings((s) => ({ ...s, scale: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>50%</span>
                      <span>100%</span>
                      <span>150%</span>
                    </div>
                  </div>

                  {/* Margins */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Margini (mm)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Sus</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={settings.margins.top}
                          onChange={(e) => setSettings((s) => ({
                            ...s,
                            margins: { ...s.margins, top: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Jos</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={settings.margins.bottom}
                          onChange={(e) => setSettings((s) => ({
                            ...s,
                            margins: { ...s.margins, bottom: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Stânga</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={settings.margins.left}
                          onChange={(e) => setSettings((s) => ({
                            ...s,
                            margins: { ...s.margins, left: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Dreapta</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={settings.margins.right}
                          onChange={(e) => setSettings((s) => ({
                            ...s,
                            margins: { ...s.margins, right: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeBackground}
                        onChange={(e) => setSettings((s) => ({ ...s, includeBackground: e.target.checked }))}
                        className="w-4 h-4 rounded text-primary"
                      />
                      <span className="text-sm">Include fundal</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeHeaderFooter}
                        onChange={(e) => setSettings((s) => ({ ...s, includeHeaderFooter: e.target.checked }))}
                        className="w-4 h-4 rounded text-primary"
                      />
                      <span className="text-sm">Include antet/subsol</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview Area */}
              <div className="flex-1 bg-muted/50 p-8 overflow-auto flex items-start justify-center">
                <div
                  ref={contentRef}
                  className="bg-white shadow-lg"
                  style={{
                    width: `${previewWidth}mm`,
                    minHeight: `${previewHeight}mm`,
                    padding: `${settings.margins.top * previewScale}mm ${settings.margins.right * previewScale}mm ${settings.margins.bottom * previewScale}mm ${settings.margins.left * previewScale}mm`,
                    transform: `scale(${settings.scale / 100})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {content}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 hover:bg-muted rounded disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm">
                  Pagina {currentPage} din {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 hover:bg-muted rounded disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="text-sm text-muted-foreground">
                {paperSizes[settings.paperSize].label} • {settings.orientation === 'portrait' ? 'Portret' : 'Peisaj'}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Print Button Component
// ============================================================================

export interface PrintButtonProps {
  onPrint: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PrintButton({
  onPrint,
  disabled = false,
  variant = 'outline',
  size = 'md',
  className,
}: PrintButtonProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border hover:bg-muted',
    ghost: 'hover:bg-muted',
  };

  return (
    <button
      onClick={onPrint}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 rounded-md transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Imprimă
    </button>
  );
}

// ============================================================================
// Printable Area Component
// ============================================================================

export interface PrintableAreaProps {
  children: React.ReactNode;
  pageBreak?: boolean;
  className?: string;
}

export function PrintableArea({
  children,
  pageBreak = false,
  className,
}: PrintableAreaProps) {
  return (
    <div
      className={cn(
        'print:block',
        pageBreak && 'print:break-before-page',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Print Preview
// ============================================================================

export interface InvoicePrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    number: string;
    date: string;
    dueDate: string;
    client: {
      name: string;
      address: string;
      cui?: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate: number;
    }>;
    subtotal: number;
    vatAmount: number;
    total: number;
    currency: string;
  };
  companyInfo: {
    name: string;
    address: string;
    cui: string;
    regCom: string;
    iban: string;
    bank: string;
  };
  className?: string;
}

export function InvoicePrintPreview({
  open,
  onOpenChange,
  invoice,
  companyInfo,
  className,
}: InvoicePrintPreviewProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const content = (
    <div className="text-sm text-black font-sans" style={{ fontSize: '10pt' }}>
      {/* Header */}
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">FACTURĂ</h1>
          <p className="text-lg">Nr. {invoice.number}</p>
          <p>Data: {invoice.date}</p>
          <p>Scadență: {invoice.dueDate}</p>
        </div>
        <div className="text-right">
          <h2 className="font-bold">{companyInfo.name}</h2>
          <p>{companyInfo.address}</p>
          <p>CUI: {companyInfo.cui}</p>
          <p>Reg. Com.: {companyInfo.regCom}</p>
        </div>
      </div>

      {/* Client */}
      <div className="mb-8 p-4 bg-gray-50 rounded">
        <h3 className="font-bold mb-2">Client:</h3>
        <p className="font-semibold">{invoice.client.name}</p>
        <p>{invoice.client.address}</p>
        {invoice.client.cui && <p>CUI: {invoice.client.cui}</p>}
      </div>

      {/* Items */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-2">Descriere</th>
            <th className="text-right py-2 w-20">Cant.</th>
            <th className="text-right py-2 w-24">Preț unit.</th>
            <th className="text-right py-2 w-16">TVA</th>
            <th className="text-right py-2 w-24">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} className="border-b">
              <td className="py-2">{item.description}</td>
              <td className="text-right py-2">{item.quantity}</td>
              <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
              <td className="text-right py-2">{item.vatRate}%</td>
              <td className="text-right py-2">{formatCurrency(item.quantity * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-1">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal)} {invoice.currency}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>TVA:</span>
            <span>{formatCurrency(invoice.vatAmount)} {invoice.currency}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-black font-bold text-lg">
            <span>TOTAL:</span>
            <span>{formatCurrency(invoice.total)} {invoice.currency}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="p-4 bg-gray-50 rounded">
        <h3 className="font-bold mb-2">Informații plată:</h3>
        <p>IBAN: {companyInfo.iban}</p>
        <p>Banca: {companyInfo.bank}</p>
      </div>
    </div>
  );

  return (
    <PrintPreview
      open={open}
      onOpenChange={onOpenChange}
      content={content}
      title={`Previzualizare Factură ${invoice.number}`}
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type PrintSettings as PrintConfiguration,
  type PrintPreviewProps as PrintPreviewDialogProps,
  type PrintButtonProps as PrintActionButtonProps,
  type PrintableAreaProps as PrintableContentProps,
  type InvoicePrintPreviewProps as InvoicePrintProps,
  paperSizes,
  defaultPrintSettings,
};
