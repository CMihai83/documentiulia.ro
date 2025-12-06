import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

interface Company {
  id: string;
  name: string;
  fiscal_code: string;
}

interface OAuthStatus {
  connected: boolean;
  company_id?: string;
  connected_at?: string;
  expires_at?: string;
  last_sync?: string;
}

export const EFacturaSettings: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      checkOAuthStatus();
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

  const checkOAuthStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/efactura/oauth-status.php?company_id=${selectedCompanyId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setOAuthStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to check OAuth status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedCompanyId) {
      setError('Please select a company');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/efactura/oauth-authorize.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          company_id: selectedCompanyId,
          redirect_uri: `${window.location.origin}/efactura/oauth-callback`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate OAuth');
      }

      if (data.success && data.authorization_url) {
        // Redirect to ANAF OAuth page
        window.location.href = data.authorization_url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from ANAF e-Factura?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/efactura/oauth-disconnect.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ company_id: selectedCompanyId })
      });

      const data = await response.json();
      if (data.success) {
        setOAuthStatus({ connected: false });
      }
    } catch (err) {
      setError('Failed to disconnect');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">e-Factura ANAF Settings</h2>

        {/* Company Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Company
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select a company --</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} (CIF: {company.fiscal_code})
              </option>
            ))}
          </select>
        </div>

        {/* OAuth Status */}
        {selectedCompanyId && (
          <div className="mb-6">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Connection Status</h3>

              {isCheckingStatus ? (
                <div className="flex items-center gap-2 text-gray-600">
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
                  <span>Checking status...</span>
                </div>
              ) : oauthStatus?.connected ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="font-medium text-green-700">Connected to ANAF</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {oauthStatus.connected_at && (
                      <p>
                        Connected: {new Date(oauthStatus.connected_at).toLocaleString()}
                      </p>
                    )}
                    {oauthStatus.expires_at && (
                      <p>
                        Token expires:{' '}
                        {new Date(oauthStatus.expires_at).toLocaleString()}
                      </p>
                    )}
                    {oauthStatus.last_sync && (
                      <p>
                        Last sync: {new Date(oauthStatus.last_sync).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block w-3 h-3 bg-gray-400 rounded-full"></span>
                    <span className="font-medium text-gray-700">Not Connected</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect to ANAF to enable automatic e-Factura upload and download.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Connect Button */}
        {selectedCompanyId && !oauthStatus?.connected && (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className={`
              w-full px-6 py-3 rounded-md font-medium text-white
              ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }
            `}
          >
            {isLoading ? 'Connecting...' : 'Connect to ANAF e-Factura'}
          </button>
        )}

        {/* Information */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-semibold text-blue-900 mb-2">About ANAF e-Factura</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Automatic upload of invoices to ANAF SPV system</li>
            <li>• Download invoices received from suppliers</li>
            <li>• Real-time status synchronization</li>
            <li>• Compliant with RO_CIUS 1.0.1 standard</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EFacturaSettings;
