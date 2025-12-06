import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const BankCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  useSearchParams();
  const { token, companyId } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Procesăm conexiunea dvs. bancară...');

  useEffect(() => {
    completeConnection();
  }, []);

  const completeConnection = async () => {
    try {
      // Get connection_id from session storage (saved during initiation)
      const connectionId = sessionStorage.getItem('pending_bank_connection_id');

      if (!connectionId) {
        setStatus('error');
        setMessage('ID conexiune lipsă. Vă rugăm încercați din nou.');
        return;
      }

      // Complete the connection
      const response = await fetch('https://documentiulia.ro/api/v1/bank/connection-complete.php', {
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
        setStatus('success');
        setMessage('Conexiune bancară stabilită cu succes!');

        // Clear session storage
        sessionStorage.removeItem('pending_bank_connection_id');

        // Redirect to connections page after 2 seconds
        setTimeout(() => {
          navigate('/bank/connections');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(`Eroare: ${data.message}`);
      }
    } catch (error) {
      console.error('Error completing connection:', error);
      setStatus('error');
      setMessage('Eroare la finalizarea conexiunii. Vă rugăm încercați din nou.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'processing' && (
              <>
                <svg
                  className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Procesare...</h3>
                <p className="text-sm text-gray-500">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Succes!</h3>
                <p className="text-sm text-gray-500">{message}</p>
                <p className="text-xs text-gray-400 mt-2">Veți fi redirecționat automat...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Eroare</h3>
                <p className="text-sm text-gray-500 mb-4">{message}</p>
                <button
                  onClick={() => navigate('/bank/connections')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Înapoi la conexiuni
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankCallbackPage;
