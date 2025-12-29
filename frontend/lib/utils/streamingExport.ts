'use client';

/**
 * Streaming Export Utilities - DocumentIulia.ro
 * Handles large data exports (CSV, Excel) with progress tracking
 */

export interface ExportProgress {
  status: 'preparing' | 'exporting' | 'complete' | 'error';
  current: number;
  total: number;
  percentage: number;
  message: string;
  messageRo: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  filename?: string;
  columns?: string[];
  filters?: Record<string, any>;
  onProgress?: (progress: ExportProgress) => void;
  onComplete?: (url: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Stream large CSV export with progress tracking
 */
export async function streamExport(
  endpoint: string,
  token: string,
  options: ExportOptions
): Promise<void> {
  const {
    format = 'csv',
    filename = `export-${Date.now()}`,
    columns,
    filters,
    onProgress,
    onComplete,
    onError,
  } = options;

  try {
    // Notify start
    onProgress?.({
      status: 'preparing',
      current: 0,
      total: 0,
      percentage: 0,
      message: 'Preparing export...',
      messageRo: 'Se pregătește exportul...',
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: format === 'csv' ? 'text/csv' : 'application/octet-stream',
      },
      body: JSON.stringify({
        format,
        columns,
        filters,
        streaming: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    // Get total count from header if available
    const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Streaming not supported');
    }

    const chunks: Uint8Array[] = [];
    const decoder = new TextDecoder();
    let processedRows = 0;
    let receivedLength = 0;

    // Read stream
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      // Parse progress from streamed data (look for progress markers)
      const text = decoder.decode(value, { stream: true });
      const progressMatch = text.match(/<!--PROGRESS:(\d+)\/(\d+)-->/);

      if (progressMatch) {
        processedRows = parseInt(progressMatch[1], 10);
        const total = parseInt(progressMatch[2], 10);

        onProgress?.({
          status: 'exporting',
          current: processedRows,
          total: total || totalCount,
          percentage: total ? Math.round((processedRows / total) * 100) : 0,
          message: `Exporting ${processedRows} of ${total || '?'} records...`,
          messageRo: `Se exportă ${processedRows} din ${total || '?'} înregistrări...`,
        });
      }
    }

    // Concatenate chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    // Remove progress markers from final content
    let content = decoder.decode(result);
    content = content.replace(/<!--PROGRESS:\d+\/\d+-->/g, '');

    // Create blob and download
    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/octet-stream',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    onProgress?.({
      status: 'complete',
      current: processedRows || totalCount,
      total: processedRows || totalCount,
      percentage: 100,
      message: 'Export complete!',
      messageRo: 'Export finalizat!',
    });

    onComplete?.(url);
  } catch (error) {
    onProgress?.({
      status: 'error',
      current: 0,
      total: 0,
      percentage: 0,
      message: `Export failed: ${(error as Error).message}`,
      messageRo: `Export eșuat: ${(error as Error).message}`,
    });

    onError?.(error as Error);
  }
}

/**
 * Hook for managing export state
 */
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useStreamingExport() {
  const { token } = useAuth();
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useCallback(
    async (endpoint: string, options: Omit<ExportOptions, 'onProgress' | 'onComplete' | 'onError'>) => {
      if (!token) {
        console.error('No auth token available');
        return;
      }

      setIsExporting(true);

      await streamExport(endpoint, token, {
        ...options,
        onProgress: setProgress,
        onComplete: () => {
          setIsExporting(false);
        },
        onError: (error) => {
          setIsExporting(false);
          console.error('Export error:', error);
        },
      });
    },
    [token]
  );

  const cancelExport = useCallback(() => {
    setIsExporting(false);
    setProgress(null);
  }, []);

  return {
    exportData,
    cancelExport,
    progress,
    isExporting,
  };
}

/**
 * Generate CSV content from data array
 */
export function generateCSV(
  data: Record<string, any>[],
  columns?: { key: string; header: string }[]
): string {
  if (data.length === 0) return '';

  const cols = columns || Object.keys(data[0]).map((key) => ({ key, header: key }));

  // Header row
  const header = cols.map((c) => escapeCSVField(c.header)).join(',');

  // Data rows
  const rows = data.map((row) =>
    cols.map((c) => escapeCSVField(String(row[c.key] ?? ''))).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Escape a CSV field value
 */
function escapeCSVField(value: string): string {
  // If the value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Romanian invoice export columns
 */
export const INVOICE_EXPORT_COLUMNS = [
  { key: 'invoiceNumber', header: 'Număr Factură' },
  { key: 'invoiceDate', header: 'Data Facturării' },
  { key: 'dueDate', header: 'Data Scadenței' },
  { key: 'partnerName', header: 'Client/Furnizor' },
  { key: 'partnerCui', header: 'CUI' },
  { key: 'netAmount', header: 'Valoare Netă (RON)' },
  { key: 'vatAmount', header: 'TVA (RON)' },
  { key: 'grossAmount', header: 'Valoare Brută (RON)' },
  { key: 'vatRate', header: 'Cotă TVA (%)' },
  { key: 'status', header: 'Status' },
  { key: 'type', header: 'Tip' },
  { key: 'efacturaStatus', header: 'Status e-Factura' },
];
