import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';

interface Invoice {
  id: string;
  number: string;
  customer_name: string;
  total_amount: number;
  efactura_status?: string;
}

interface BatchUploadResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    invoice_id: string;
    success: boolean;
    upload_index?: number;
    error?: string;
  }>;
}

interface EFacturaBatchUploadProps {
  companyId: string;
  invoices: Invoice[];
  onUploadComplete?: (result: BatchUploadResult) => void;
}

export const EFacturaBatchUpload: React.FC<EFacturaBatchUploadProps> = ({
  companyId,
  invoices,
  onUploadComplete
}) => {
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BatchUploadResult | null>(null);
  const [continueOnError, setContinueOnError] = useState(true);

  const toggleInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const selectAll = () => {
    setSelectedInvoices(new Set(invoices.map((inv) => inv.id)));
  };

  const deselectAll = () => {
    setSelectedInvoices(new Set());
  };

  const handleBatchUpload = async () => {
    if (selectedInvoices.size === 0) {
      alert('Please select at least one invoice');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/efactura/batch-upload.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          company_id: companyId,
          invoice_ids: Array.from(selectedInvoices),
          continue_on_error: continueOnError
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Batch upload failed');
      }

      if (data.success) {
        setUploadResult(data);
        onUploadComplete?.(data);
      } else {
        throw new Error(data.message || 'Batch upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'Batch upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const eligibleInvoices = invoices.filter(
    (inv) => !inv.efactura_status || inv.efactura_status === 'pending' || inv.efactura_status === 'error'
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">Batch Upload to ANAF</h3>

      {/* Selection Controls */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={selectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Select All ({eligibleInvoices.length})
          </button>
          <button
            onClick={deselectAll}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Deselect All
          </button>
          <span className="text-sm text-gray-600">
            {selectedInvoices.size} selected
          </span>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={continueOnError}
            onChange={(e) => setContinueOnError(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Continue on error</span>
        </label>
      </div>

      {/* Invoice List */}
      <div className="mb-6 max-h-96 overflow-y-auto">
        {eligibleInvoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No invoices available for upload
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Select
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eligibleInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.has(invoice.id)}
                      onChange={() => toggleInvoice(invoice.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {invoice.number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {invoice.customer_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {invoice.total_amount.toFixed(2)} RON
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        invoice.efactura_status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {invoice.efactura_status || 'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleBatchUpload}
        disabled={isUploading || selectedInvoices.size === 0}
        className={`
          w-full px-6 py-3 rounded-md font-medium text-white flex items-center justify-center gap-2
          ${
            isUploading || selectedInvoices.size === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }
        `}
      >
        {isUploading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Uploading...</span>
          </>
        ) : (
          <span>Upload {selectedInvoices.size} Invoice(s) to ANAF</span>
        )}
      </button>

      {/* Upload Results */}
      {uploadResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-3">Upload Results</h4>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {uploadResult.total}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {uploadResult.successful}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {uploadResult.failed}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {uploadResult.results.some((r) => !r.success) && (
            <div className="mt-4">
              <h5 className="font-medium text-sm mb-2">Failed Uploads:</h5>
              <div className="space-y-2">
                {uploadResult.results
                  .filter((r) => !r.success)
                  .map((result, idx) => (
                    <div key={idx} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                      Invoice {result.invoice_id}: {result.error}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EFacturaBatchUpload;
