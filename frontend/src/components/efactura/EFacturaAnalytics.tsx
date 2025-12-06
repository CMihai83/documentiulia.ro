import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

interface Analytics {
  total_invoices_uploaded: number;
  total_accepted: number;
  total_rejected: number;
  total_pending: number;
  total_received: number;
  total_matched: number;
  success_rate: number;
  average_upload_time: number;
  last_upload: string | null;
  last_download: string | null;
}

interface Company {
  id: string;
  name: string;
}

export const EFacturaAnalytics: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadAnalytics();
    }
  }, [selectedCompanyId, period]);

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

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/efactura/analytics.php?company_id=${selectedCompanyId}&period=${period}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">e-Factura Analytics</h1>

        {/* Controls */}
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

          <div className="flex gap-2">
            {[7, 30, 90, 365].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  period === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Dashboard */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        ) : !analytics ? (
          <div className="text-center py-12 text-gray-500">
            {selectedCompanyId ? 'No data available' : 'Please select a company'}
          </div>
        ) : (
          <div>
            {/* Upload Statistics */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Upload Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {analytics.total_invoices_uploaded}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Uploaded</div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {analytics.total_accepted}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Accepted</div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">
                    {analytics.total_rejected}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Rejected</div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">
                    {analytics.total_pending}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Pending</div>
                </div>
              </div>
            </div>

            {/* Received Invoices */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Received Invoices</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">
                    {analytics.total_received}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Received</div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {analytics.total_matched}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Auto-Matched</div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">
                    {analytics.total_received - analytics.total_matched}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Needs Review</div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="text-2xl font-bold text-green-600">
                      {analytics.success_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${analytics.success_rate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Avg. Upload Time</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {analytics.average_upload_time.toFixed(1)}s
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Per invoice processing time
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {analytics.last_upload && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600">📤</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Last Upload</div>
                      <div className="text-sm text-gray-600">
                        {new Date(analytics.last_upload).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {analytics.last_download && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600">📥</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Last Download</div>
                      <div className="text-sm text-gray-600">
                        {new Date(analytics.last_download).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Period Info */}
            <div className="mt-6 text-center text-sm text-gray-500">
              Showing data for the last {period} days
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EFacturaAnalytics;
