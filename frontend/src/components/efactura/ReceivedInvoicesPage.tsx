import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

interface ReceivedInvoice {
  id: string;
  cif: string;
  seller_name: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  currency: string;
  download_id: string;
  xml_file_path: string;
  matched_purchase_order_id?: string;
  match_confidence?: number;
  auto_matched: boolean;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

export const ReceivedInvoicesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [invoices, setInvoices] = useState<ReceivedInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [days, setDays] = useState(60);
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadReceivedInvoices();
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/companies/list.php`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies || []);
        if (data.companies.length > 0) {
          setSelectedCompanyId(data.companies[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  const loadReceivedInvoices = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/efactura/received-invoices.php?company_id=${selectedCompanyId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadNew = async () => {
    if (!selectedCompanyId) return;

    setIsDownloading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/efactura/download-received.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          company_id: selectedCompanyId,
          days: days
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Downloaded ${data.downloaded || 0} new invoices`);
        loadReceivedInvoices();
      } else {
        alert(data.message || 'Download failed');
      }
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const getFilteredInvoices = () => {
    switch (filter) {
      case 'matched':
        return invoices.filter((inv) => inv.matched_purchase_order_id);
      case 'unmatched':
        return invoices.filter((inv) => !inv.matched_purchase_order_id);
      default:
        return invoices;
    }
  };

  const filteredInvoices = getFilteredInvoices();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Received Invoices (e-Factura)</h1>

        {/* Company Selection & Download */}
        <div className="mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">-- Select Company --</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 60)}
              min="1"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            onClick={handleDownloadNew}
            disabled={isDownloading || !selectedCompanyId}
            className={`
              px-6 py-2 rounded-md font-medium text-white
              ${
                isDownloading || !selectedCompanyId
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isDownloading ? 'Downloading...' : 'Download New'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`pb-2 px-1 font-medium ${
                filter === 'all'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All ({invoices.length})
            </button>
            <button
              onClick={() => setFilter('matched')}
              className={`pb-2 px-1 font-medium ${
                filter === 'matched'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Matched ({invoices.filter((inv) => inv.matched_purchase_order_id).length})
            </button>
            <button
              onClick={() => setFilter('unmatched')}
              className={`pb-2 px-1 font-medium ${
                filter === 'unmatched'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Unmatched ({invoices.filter((inv) => !inv.matched_purchase_order_id).length})
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {selectedCompanyId
              ? 'No invoices found. Click "Download New" to fetch from ANAF.'
              : 'Please select a company'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Match Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.seller_name}
                      </div>
                      <div className="text-xs text-gray-500">CIF: {invoice.cif}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {invoice.total_amount.toFixed(2)} {invoice.currency}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.matched_purchase_order_id ? (
                        <div>
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            {invoice.auto_matched ? '🤖 Auto' : '✓ Manual'}
                          </span>
                          {invoice.match_confidence !== undefined && (
                            <span className="ml-2 text-xs text-gray-600">
                              {invoice.match_confidence}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          Unmatched
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={`/invoices/received/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivedInvoicesPage;
