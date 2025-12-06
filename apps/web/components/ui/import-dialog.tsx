'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ImportFormat = 'csv' | 'excel' | 'json' | 'xml';
export type ImportStatus = 'idle' | 'uploading' | 'parsing' | 'validating' | 'importing' | 'complete' | 'error';

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  column?: string;
  message: string;
}

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, mappings: ImportMapping[]) => Promise<ImportResult>;
  title?: string;
  description?: string;
  acceptedFormats?: ImportFormat[];
  targetFields: ImportField[];
  maxFileSize?: number;
  className?: string;
}

// ============================================================================
// Format Configuration
// ============================================================================

const formatConfig: Record<ImportFormat, { label: string; accept: string; description: string }> = {
  csv: {
    label: 'CSV',
    accept: '.csv',
    description: 'Fișier text cu valori separate prin virgulă',
  },
  excel: {
    label: 'Excel',
    accept: '.xlsx,.xls',
    description: 'Microsoft Excel (.xlsx, .xls)',
  },
  json: {
    label: 'JSON',
    accept: '.json',
    description: 'Format JSON structurat',
  },
  xml: {
    label: 'XML',
    accept: '.xml',
    description: 'Format XML',
  },
};

// ============================================================================
// Import Dialog Component
// ============================================================================

export function ImportDialog({
  open,
  onOpenChange,
  onImport,
  title = 'Importă date',
  description = 'Încărcați un fișier pentru a importa date',
  acceptedFormats = ['csv', 'excel'],
  targetFields,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  className,
}: ImportDialogProps) {
  const [status, setStatus] = React.useState<ImportStatus>('idle');
  const [file, setFile] = React.useState<File | null>(null);
  const [previewColumns, setPreviewColumns] = React.useState<string[]>([]);
  const [previewData, setPreviewData] = React.useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = React.useState<ImportMapping[]>([]);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const acceptString = acceptedFormats
    .map((f) => formatConfig[f].accept)
    .join(',');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > maxFileSize) {
      setError(`Fișierul depășește limita de ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setStatus('parsing');

    // Simulate parsing to extract columns
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock preview data - in real implementation, parse the file
    const mockColumns = ['Nume', 'Email', 'Telefon', 'Adresă', 'Data'];
    const mockData = [
      { Nume: 'Ion Popescu', Email: 'ion@email.com', Telefon: '0722123456', Adresă: 'București', Data: '2024-01-15' },
      { Nume: 'Maria Ionescu', Email: 'maria@email.com', Telefon: '0733456789', Adresă: 'Cluj', Data: '2024-01-16' },
    ];

    setPreviewColumns(mockColumns);
    setPreviewData(mockData);

    // Auto-map columns with similar names
    const autoMappings: ImportMapping[] = [];
    targetFields.forEach((field) => {
      const match = mockColumns.find(
        (col) => col.toLowerCase().includes(field.key.toLowerCase()) ||
                 field.label.toLowerCase().includes(col.toLowerCase())
      );
      if (match) {
        autoMappings.push({ sourceColumn: match, targetField: field.key });
      }
    });
    setMappings(autoMappings);
    setStatus('idle');
  };

  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    setMappings((prev) => {
      const existing = prev.find((m) => m.targetField === targetField);
      if (existing) {
        return prev.map((m) =>
          m.targetField === targetField ? { ...m, sourceColumn } : m
        );
      }
      return [...prev, { targetField, sourceColumn }];
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setStatus('importing');
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const importResult = await onImport(file, mappings);
      clearInterval(progressInterval);
      setProgress(100);
      setResult(importResult);
      setStatus('complete');
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'A apărut o eroare la import');
      setStatus('error');
    }
  };

  const resetDialog = () => {
    setFile(null);
    setPreviewColumns([]);
    setPreviewData([]);
    setMappings([]);
    setResult(null);
    setError(null);
    setStatus('idle');
    setProgress(0);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

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
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-full max-w-2xl max-h-[90vh] bg-background rounded-lg shadow-xl overflow-hidden',
              className
            )}
          >
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {status === 'complete' && result ? (
                <ImportResultView result={result} onReset={resetDialog} />
              ) : (
                <>
                  {/* File Upload */}
                  {!file && (
                    <FileDropZone
                      onFileSelect={(f) => {
                        const event = { target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                        handleFileSelect(event);
                      }}
                      accept={acceptString}
                      maxFileSize={maxFileSize}
                      formats={acceptedFormats}
                    />
                  )}

                  {/* File Selected */}
                  {file && status !== 'importing' && (
                    <div className="space-y-6">
                      {/* File Info */}
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={resetDialog}
                          className="p-2 hover:bg-muted rounded-md transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Column Mapping */}
                      {previewColumns.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-3">Mapare coloane</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Asociați coloanele din fișier cu câmpurile din sistem
                          </p>
                          <div className="space-y-2">
                            {targetFields.map((field) => {
                              const currentMapping = mappings.find((m) => m.targetField === field.key);
                              return (
                                <div key={field.key} className="flex items-center gap-3">
                                  <div className="w-1/3">
                                    <span className="text-sm font-medium">
                                      {field.label}
                                      {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </span>
                                  </div>
                                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  <select
                                    value={currentMapping?.sourceColumn || ''}
                                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
                                  >
                                    <option value="">Nu mapa</option>
                                    {previewColumns.map((col) => (
                                      <option key={col} value={col}>{col}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Preview */}
                      {previewData.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-3">Previzualizare date</h3>
                          <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted">
                                  <tr>
                                    {previewColumns.map((col) => (
                                      <th key={col} className="px-4 py-2 text-left font-medium">
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {previewData.slice(0, 3).map((row, i) => (
                                    <tr key={i} className="border-t">
                                      {previewColumns.map((col) => (
                                        <td key={col} className="px-4 py-2">
                                          {row[col]}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {previewData.length > 3 && (
                              <div className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground text-center">
                                ... și încă {previewData.length - 3} rânduri
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Importing Progress */}
                  {status === 'importing' && (
                    <div className="py-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <h3 className="font-medium mb-2">Se importă datele...</h3>
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

                  {/* Error */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {status !== 'complete' && (
              <div className="p-6 border-t bg-muted/30 flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                >
                  Anulează
                </button>
                {file && status !== 'importing' && (
                  <button
                    onClick={handleImport}
                    disabled={mappings.filter((m) => {
                      const field = targetFields.find((f) => f.key === m.targetField);
                      return field?.required;
                    }).length < targetFields.filter((f) => f.required).length}
                    className={cn(
                      'px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md',
                      'hover:bg-primary/90 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    Importă date
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// File Drop Zone Component
// ============================================================================

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept: string;
  maxFileSize: number;
  formats: ImportFormat[];
}

function FileDropZone({ onFileSelect, accept, maxFileSize, formats }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        className="hidden"
      />

      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>

      <p className="font-medium mb-1">
        Trageți fișierul aici sau click pentru a selecta
      </p>
      <p className="text-sm text-muted-foreground">
        Formate acceptate: {formats.map((f) => formatConfig[f].label).join(', ')}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Dimensiune maximă: {Math.round(maxFileSize / 1024 / 1024)}MB
      </p>
    </div>
  );
}

// ============================================================================
// Import Result View Component
// ============================================================================

interface ImportResultViewProps {
  result: ImportResult;
  onReset: () => void;
}

function ImportResultView({ result, onReset }: ImportResultViewProps) {
  const hasErrors = result.errors.length > 0;

  return (
    <div className="py-4">
      {/* Success Icon */}
      <div className={cn(
        'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center',
        hasErrors ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30'
      )}>
        {hasErrors ? (
          <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <h3 className="text-lg font-semibold text-center mb-2">
        {hasErrors ? 'Import finalizat cu avertismente' : 'Import finalizat cu succes!'}
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 my-6">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-2xl font-bold text-primary">{result.imported}</p>
          <p className="text-sm text-muted-foreground">Importate</p>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
          <p className="text-sm text-muted-foreground">Sărite</p>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
          <p className="text-sm text-muted-foreground">Erori</p>
        </div>
      </div>

      {/* Errors List */}
      {result.errors.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted font-medium text-sm">
            Erori la import
          </div>
          <div className="max-h-40 overflow-y-auto">
            {result.errors.map((error, i) => (
              <div key={i} className="px-4 py-2 border-t text-sm flex items-start gap-2">
                <span className="text-muted-foreground">Rând {error.row}:</span>
                <span className="text-red-600 dark:text-red-400">{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
        >
          Importă alt fișier
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Contacts Import Dialog
// ============================================================================

export interface ContactsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, mappings: ImportMapping[]) => Promise<ImportResult>;
  className?: string;
}

const contactFields: ImportField[] = [
  { key: 'name', label: 'Nume', required: true },
  { key: 'email', label: 'Email', type: 'string' },
  { key: 'phone', label: 'Telefon', type: 'string' },
  { key: 'company', label: 'Companie', type: 'string' },
  { key: 'cui', label: 'CUI', type: 'string' },
  { key: 'address', label: 'Adresă', type: 'string' },
  { key: 'city', label: 'Oraș', type: 'string' },
  { key: 'county', label: 'Județ', type: 'string' },
];

export function ContactsImportDialog({
  open,
  onOpenChange,
  onImport,
  className,
}: ContactsImportDialogProps) {
  return (
    <ImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onImport={onImport}
      title="Importă contacte"
      description="Importați lista de contacte din fișier Excel sau CSV"
      targetFields={contactFields}
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Products Import Dialog
// ============================================================================

export interface ProductsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, mappings: ImportMapping[]) => Promise<ImportResult>;
  className?: string;
}

const productFields: ImportField[] = [
  { key: 'name', label: 'Denumire', required: true },
  { key: 'sku', label: 'Cod produs', type: 'string' },
  { key: 'price', label: 'Preț', required: true, type: 'number' },
  { key: 'unit', label: 'Unitate măsură', type: 'string' },
  { key: 'vat_rate', label: 'Cotă TVA (%)', type: 'number' },
  { key: 'category', label: 'Categorie', type: 'string' },
  { key: 'description', label: 'Descriere', type: 'string' },
  { key: 'stock', label: 'Stoc', type: 'number' },
];

export function ProductsImportDialog({
  open,
  onOpenChange,
  onImport,
  className,
}: ProductsImportDialogProps) {
  return (
    <ImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onImport={onImport}
      title="Importă produse"
      description="Importați catalogul de produse din fișier Excel sau CSV"
      targetFields={productFields}
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Bank Transactions Import Dialog
// ============================================================================

export interface BankTransactionsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, mappings: ImportMapping[]) => Promise<ImportResult>;
  className?: string;
}

const transactionFields: ImportField[] = [
  { key: 'date', label: 'Data', required: true, type: 'date' },
  { key: 'description', label: 'Descriere', required: true },
  { key: 'amount', label: 'Sumă', required: true, type: 'number' },
  { key: 'type', label: 'Tip (Încasare/Plată)', type: 'string' },
  { key: 'reference', label: 'Referință', type: 'string' },
  { key: 'partner', label: 'Partener', type: 'string' },
];

export function BankTransactionsImportDialog({
  open,
  onOpenChange,
  onImport,
  className,
}: BankTransactionsImportDialogProps) {
  return (
    <ImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onImport={onImport}
      title="Importă extrase bancare"
      description="Importați tranzacții din extrasul de cont"
      targetFields={transactionFields}
      acceptedFormats={['csv', 'excel']}
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type ImportField as ImportFieldConfig,
  type ImportMapping as ImportColumnMapping,
  type ImportResult as ImportOperationResult,
  type ImportError as ImportValidationError,
  type ContactsImportDialogProps as ContactsImportProps,
  type ProductsImportDialogProps as ProductsImportProps,
  type BankTransactionsImportDialogProps as BankTransactionsImportProps,
};
