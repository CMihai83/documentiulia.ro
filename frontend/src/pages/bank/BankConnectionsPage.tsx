import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface BankConnection {
  id: string;
  provider: string;
  institution_name: string;
  institution_logo_url: string | null;
  account_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  status: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  consent_expires_at: string | null;
  created_at: string;
}

interface Institution {
  id: string;
  name: string;
  bic: string;
  logo: string;
  countries: string[];
}

const BankConnectionsPage: React.FC = () => {
  const { token, companyId } = useAuth();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [provider, setProvider] = useState<string>('nordigen');
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch('https://documentiulia.ro/api/v1/bank/connections.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || '',
        },
      });

      const data = await response.json();
      if (data.success) {
        setConnections(data.data);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const response = await fetch(
        `https://documentiulia.ro/api/v1/bank/institutions.php?provider=${provider}&country=RO`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setInstitutions(data.data);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };

  const handleAddConnection = async () => {
    if (!selectedInstitution) {
      alert('Vă rugăm selectați o bancă');
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/bank/callback`;

      const response = await fetch('https://documentiulia.ro/api/v1/bank/connections.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || '',
        },
        body: JSON.stringify({
          provider,
          institution_id: selectedInstitution,
          redirect_url: redirectUrl,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Save connection ID to session storage for callback
        sessionStorage.setItem('pending_bank_connection_id', data.data.connection_id);

        // Redirect to bank authorization page
        window.location.href = data.data.auth_url;
      } else {
        alert('Eroare: ' + data.message);
      }
    } catch (error) {
      console.error('Error adding connection:', error);
      alert('Eroare la conectarea băncii');
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch('https://documentiulia.ro/api/v1/bank/connection-sync.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || '',
        },
        body: JSON.stringify({
          connection_id: connectionId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Sincronizare reușită: ${data.data.new} tranzacții noi`);
        fetchConnections();
      } else {
        alert('Eroare sincronizare: ' + data.message);
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Eroare la sincronizare');
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Sigur doriți să deconectați acest cont bancar?')) {
      return;
    }

    try {
      const response = await fetch('https://documentiulia.ro/api/v1/bank/connection-disconnect.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || '',
        },
        body: JSON.stringify({
          connection_id: connectionId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Cont deconectat cu succes');
        fetchConnections();
      } else {
        alert('Eroare: ' + data.message);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Eroare la deconectare');
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    fetchInstitutions();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activ' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'În așteptare' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', label: 'Expirat' },
      disconnected: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Deconectat' },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Niciodată';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Conturi bancare conectate</h1>
        <p className="mt-2 text-sm text-gray-600">
          Conectați-vă conturile bancare pentru sincronizare automată a tranzacțiilor
        </p>
      </div>

      {/* Add Connection Button */}
      <div className="mb-6">
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adaugă cont bancar
        </button>
      </div>

      {/* Connections List */}
      {connections.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Niciun cont conectat</h3>
          <p className="mt-1 text-sm text-gray-500">Începeți prin a conecta primul cont bancar.</p>
          <div className="mt-6">
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adaugă cont bancar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <div key={connection.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                {/* Institution Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {connection.institution_logo_url ? (
                      <img src={connection.institution_logo_url} alt={connection.institution_name} className="h-10 w-10 rounded-md mr-3" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center mr-3">
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{connection.institution_name}</h3>
                      <p className="text-xs text-gray-500">{connection.account_type}</p>
                    </div>
                  </div>
                  {getStatusBadge(connection.status)}
                </div>

                {/* Account Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cont:</span>
                    <span className="font-medium text-gray-900">****{connection.account_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monedă:</span>
                    <span className="font-medium text-gray-900">{connection.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ultima sincronizare:</span>
                    <span className="font-medium text-gray-900 text-xs">{formatDate(connection.last_sync_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSync(connection.id)}
                    disabled={syncing === connection.id || connection.status !== 'active'}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing === connection.id ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sincronizare...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sincronizează
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    className="inline-flex justify-center items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Adaugă cont bancar</h3>

                <div className="space-y-4">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Provider</label>
                    <select
                      value={provider}
                      onChange={(e) => {
                        setProvider(e.target.value);
                        fetchInstitutions();
                      }}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="nordigen">Nordigen (Gratuit)</option>
                      <option value="salt_edge">Salt Edge (Premium)</option>
                    </select>
                  </div>

                  {/* Institution Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bancă</label>
                    <select
                      value={selectedInstitution}
                      onChange={(e) => setSelectedInstitution(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">Selectați banca...</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddConnection}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Conectează
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankConnectionsPage;
