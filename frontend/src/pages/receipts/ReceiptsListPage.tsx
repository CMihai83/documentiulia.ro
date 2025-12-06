import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Receipt {
  id: string;
  filename: string;
  file_path: string;
  merchant_name?: string;
  receipt_date?: string;
  total_amount?: number;
  currency?: string;
  ocr_status: string;
  ocr_confidence?: number;
  expense_id?: string;
  created_at: string;
}

interface Stats {
  total_count: number;
  pending_count: number;
  completed_count: number;
  failed_count: number;
  total_amount: number;
  linked_count: number;
  unlinked_count: number;
}

const ReceiptsListPage: React.FC = () => {
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [merchantFilter, setMerchantFilter] = useState<string>('');
  const [linkedFilter, setLinkedFilter] = useState<string>('');

  // Pagination
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Preview modal
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const token = localStorage.getItem('auth_token');
  const companyId = localStorage.getItem('company_id');

  useEffect(() => {
    fetchReceipts();
  }, [statusFilter, dateFromFilter, dateToFilter, merchantFilter, linkedFilter, offset]);

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (dateFromFilter) params.append('date_from', dateFromFilter);
      if (dateToFilter) params.append('date_to', dateToFilter);
      if (merchantFilter) params.append('merchant', merchantFilter);
      if (linkedFilter) params.append('linked', linkedFilter);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(
        `https://documentiulia.ro/api/v1/receipts/list.php?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setReceipts(data.data);
        setStats(data.stats);
      } else {
        setError(data.message || 'Failed to load receipts');
      }
    } catch (err) {
      setError('Network error loading receipts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (receiptId: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      // API endpoint for delete (not created yet, would need to be added)
      const response = await fetch(
        `https://documentiulia.ro/api/v1/receipts/delete.php`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || '',
          },
          body: JSON.stringify({ receipt_id: receiptId }),
        }
      );

      if (response.ok) {
        fetchReceipts(); // Refresh list
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete receipt');
    }
  };

  const handleViewDetails = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowPreview(true);
  };

  const handleLinkToExpense = (receipt: Receipt) => {
    // Navigate to expense creation with pre-filled data
    navigate('/expenses/create', {
      state: {
        receipt_id: receipt.id,
        merchant: receipt.merchant_name,
        amount: receipt.total_amount,
        date: receipt.receipt_date,
        currency: receipt.currency,
      },
    });
  };

  const resetFilters = () => {
    setStatusFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setMerchantFilter('');
    setLinkedFilter('');
    setOffset(0);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status] || badges.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
            <p className="mt-2 text-gray-600">
              Manage and process your receipt uploads
            </p>
          </div>
          <button
            onClick={() => navigate('/receipts/upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Upload Receipt
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Total Receipts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_count}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed_count}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_count}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatAmount(stats.total_amount)}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant
              </label>
              <input
                type="text"
                placeholder="Search merchant..."
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Linked Status
              </label>
              <select
                value={linkedFilter}
                onChange={(e) => setLinkedFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All</option>
                <option value="true">Linked to Expense</option>
                <option value="false">Not Linked</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Receipts List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading receipts...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No receipts found</h3>
            <p className="mt-2 text-gray-600">
              Upload your first receipt to get started
            </p>
            <button
              onClick={() => navigate('/receipts/upload')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Receipt
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Merchant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Linked
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.receipt_date ? formatDate(receipt.receipt_date) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.merchant_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.total_amount
                        ? formatAmount(receipt.total_amount, receipt.currency)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(receipt.ocr_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.ocr_confidence ? `${Math.round(receipt.ocr_confidence)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {receipt.expense_id ? (
                        <span className="inline-flex px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          ✓ Linked
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          Not Linked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(receipt)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {!receipt.expense_id && receipt.ocr_status === 'completed' && (
                        <button
                          onClick={() => handleLinkToExpense(receipt)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Link
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(receipt.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing {offset + 1} to {Math.min(offset + limit, offset + receipts.length)} of {stats?.total_count || 0} receipts
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={receipts.length < limit}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Receipt Details</h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image */}
                  <div>
                    <img
                      src={`https://documentiulia.ro/${selectedReceipt.file_path}`}
                      alt="Receipt"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      {getStatusBadge(selectedReceipt.ocr_status)}
                    </div>

                    {selectedReceipt.ocr_confidence && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          OCR Confidence
                        </label>
                        <p className="text-gray-900">
                          {Math.round(selectedReceipt.ocr_confidence)}%
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Merchant Name
                      </label>
                      <p className="text-gray-900">
                        {selectedReceipt.merchant_name || 'Not detected'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Receipt Date
                      </label>
                      <p className="text-gray-900">
                        {selectedReceipt.receipt_date
                          ? formatDate(selectedReceipt.receipt_date)
                          : 'Not detected'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Amount
                      </label>
                      <p className="text-gray-900">
                        {selectedReceipt.total_amount
                          ? formatAmount(selectedReceipt.total_amount, selectedReceipt.currency)
                          : 'Not detected'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Linked to Expense
                      </label>
                      <p className="text-gray-900">
                        {selectedReceipt.expense_id ? 'Yes' : 'No'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Date
                      </label>
                      <p className="text-gray-900">
                        {formatDate(selectedReceipt.created_at)}
                      </p>
                    </div>

                    {!selectedReceipt.expense_id && selectedReceipt.ocr_status === 'completed' && (
                      <button
                        onClick={() => {
                          setShowPreview(false);
                          handleLinkToExpense(selectedReceipt);
                        }}
                        className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Create Expense from Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptsListPage;
