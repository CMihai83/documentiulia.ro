'use client';

import { useTransition, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Download, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Bulk Actions Component - DocumentIulia.ro
 * Handles bulk operations on invoices with React 18 useTransition
 * for smooth UI updates during heavy operations
 */

interface BulkActionsProps {
  selectedIds: string[];
  onSelectionClear: () => void;
  onOperationComplete?: (result: BulkOperationResult) => void;
}

interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

type BulkOperation = 'delete' | 'export' | 'submit-efactura' | 'mark-paid' | 'send-reminder';

const OPERATION_LABELS: Record<BulkOperation, { ro: string; en: string }> = {
  'delete': { ro: 'Șterge selecția', en: 'Delete selected' },
  'export': { ro: 'Exportă selecția', en: 'Export selected' },
  'submit-efactura': { ro: 'Trimite la e-Factura', en: 'Submit to e-Factura' },
  'mark-paid': { ro: 'Marchează ca plătite', en: 'Mark as paid' },
  'send-reminder': { ro: 'Trimite reminder', en: 'Send reminder' },
};

const OPERATION_ICONS: Record<BulkOperation, React.ReactNode> = {
  'delete': <Trash2 className="w-4 h-4" />,
  'export': <Download className="w-4 h-4" />,
  'submit-efactura': <Send className="w-4 h-4" />,
  'mark-paid': <CheckCircle className="w-4 h-4" />,
  'send-reminder': <Send className="w-4 h-4" />,
};

export const BulkActions = memo(function BulkActions({
  selectedIds,
  onSelectionClear,
  onOperationComplete,
}: BulkActionsProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<BulkOperationResult | null>(null);
  const [activeOperation, setActiveOperation] = useState<BulkOperation | null>(null);

  const executeBulkOperation = useCallback(
    async (operation: BulkOperation) => {
      if (selectedIds.length === 0) return;

      setActiveOperation(operation);
      setResult(null);
      setProgress({ current: 0, total: selectedIds.length });

      startTransition(async () => {
        try {
          const response = await fetch(`/api/v1/invoices/bulk/${operation}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ids: selectedIds,
              options: {
                notifyOnComplete: true,
                createAuditLog: true,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`Operation failed: ${response.statusText}`);
          }

          // Handle streaming response for progress updates
          const reader = response.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            let processed = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(Boolean);

              for (const line of lines) {
                try {
                  const update = JSON.parse(line);
                  if (update.type === 'progress') {
                    processed = update.processed;
                    setProgress({ current: processed, total: selectedIds.length });
                  } else if (update.type === 'complete') {
                    const opResult: BulkOperationResult = {
                      success: update.failed === 0,
                      processed: update.processed,
                      failed: update.failed,
                      errors: update.errors || [],
                    };
                    setResult(opResult);
                    onOperationComplete?.(opResult);
                  }
                } catch {
                  // Skip non-JSON lines
                }
              }
            }
          } else {
            // Fallback for non-streaming response
            const data = await response.json();
            const opResult: BulkOperationResult = {
              success: data.success,
              processed: data.processed || selectedIds.length,
              failed: data.failed || 0,
              errors: data.errors || [],
            };
            setResult(opResult);
            onOperationComplete?.(opResult);
          }
        } catch (error) {
          const opResult: BulkOperationResult = {
            success: false,
            processed: 0,
            failed: selectedIds.length,
            errors: [(error as Error).message],
          };
          setResult(opResult);
          onOperationComplete?.(opResult);
        } finally {
          setActiveOperation(null);
          setProgress(null);
        }
      });
    },
    [selectedIds, token, onOperationComplete]
  );

  const handleDelete = useCallback(() => {
    const idsParam = selectedIds.join(',');
    router.push(`/dashboard/invoices/bulk-delete?ids=${idsParam}&count=${selectedIds.length}`);
  }, [selectedIds, router]);

  const handleDeleteConfirmed = useCallback(() => {
    executeBulkOperation('delete');
  }, [executeBulkOperation]);

  const handleExport = useCallback(() => {
    executeBulkOperation('export');
  }, [executeBulkOperation]);

  const handleSubmitEFactura = useCallback(() => {
    const idsParam = selectedIds.join(',');
    router.push(`/dashboard/invoices/bulk-efactura?ids=${idsParam}&count=${selectedIds.length}`);
  }, [selectedIds, router]);

  const handleSubmitEFacturaConfirmed = useCallback(() => {
    executeBulkOperation('submit-efactura');
  }, [executeBulkOperation]);

  const handleMarkPaid = useCallback(() => {
    executeBulkOperation('mark-paid');
  }, [executeBulkOperation]);

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50"
      role="toolbar"
      aria-label="Acțiuni în masă"
    >
      {/* Selection count */}
      <div className="flex items-center gap-4 mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedIds.length} {selectedIds.length === 1 ? 'factură selectată' : 'facturi selectate'}
        </span>
        <button
          onClick={onSelectionClear}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          aria-label="Deselectează toate"
        >
          Deselectează
        </button>
      </div>

      {/* Progress indicator */}
      {isPending && progress && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Procesare: {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Result message */}
      {result && (
        <div
          className={`mb-3 p-2 rounded-md text-sm ${
            result.success
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>
              {result.success
                ? `${result.processed} facturi procesate cu succes`
                : `${result.failed} facturi au eșuat`}
            </span>
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-1 ml-6 text-xs">
              {result.errors.slice(0, 3).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {result.errors.length > 3 && (
                <li>...și alte {result.errors.length - 3} erori</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleExport}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          aria-label={OPERATION_LABELS.export.ro}
        >
          {activeOperation === 'export' && isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            OPERATION_ICONS.export
          )}
          <span className="hidden sm:inline">Exportă</span>
        </button>

        <button
          onClick={handleSubmitEFactura}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          aria-label={OPERATION_LABELS['submit-efactura'].ro}
        >
          {activeOperation === 'submit-efactura' && isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            OPERATION_ICONS['submit-efactura']
          )}
          <span className="hidden sm:inline">e-Factura</span>
        </button>

        <button
          onClick={handleMarkPaid}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          aria-label={OPERATION_LABELS['mark-paid'].ro}
        >
          {activeOperation === 'mark-paid' && isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            OPERATION_ICONS['mark-paid']
          )}
          <span className="hidden sm:inline">Plătite</span>
        </button>

        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          aria-label={OPERATION_LABELS.delete.ro}
        >
          {activeOperation === 'delete' && isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            OPERATION_ICONS.delete
          )}
          <span className="hidden sm:inline">Șterge</span>
        </button>
      </div>
    </div>
  );
});

export default BulkActions;
