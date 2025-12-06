import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing ANAF authorization...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || `OAuth failed: ${error}`);
      setTimeout(() => navigate('/settings/efactura'), 3000);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Invalid OAuth callback - missing code or state');
      setTimeout(() => navigate('/settings/efactura'), 3000);
      return;
    }

    // Process the OAuth callback
    processCallback(code, state);
  }, [searchParams, navigate]);

  const processCallback = async (code: string, state: string) => {
    try {
      // Call the backend to exchange code for tokens
      const response = await fetch(
        `/api/v1/efactura/oauth-callback.php?code=${code}&state=${state}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('Successfully connected to ANAF e-Factura!');
        setTimeout(() => navigate('/settings/efactura?oauth=success'), 2000);
      } else {
        throw new Error(data.message || 'Failed to complete OAuth');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to process OAuth callback');
      setTimeout(() => navigate('/settings/efactura?oauth=error'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {status === 'processing' && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Connecting to ANAF
                </h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Connection Successful!
                </h2>
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Redirecting to settings...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Connection Failed
                </h2>
                <p className="text-red-600">{message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Redirecting to settings...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
