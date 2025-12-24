'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Smartphone, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { MFASetup } from '@/components/auth/MFASetup';
import { BackupCodes } from '@/components/auth/BackupCodes';
import { useToast } from '@/components/ui/Toast';

interface MFAStatus {
  enabled: boolean;
  backupCodesRemaining?: number;
  enabledAt?: string;
}

interface Session {
  tokenId: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  useEffect(() => {
    fetchMfaStatus();
    fetchSessions();
  }, []);

  const fetchMfaStatus = async () => {
    try {
      const response = await fetch('/api/auth/mfa/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMfaStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleMfaSetupComplete = (codes: string[]) => {
    setBackupCodes(codes);
    setShowMfaSetup(false);
    setShowBackupCodes(true);
    fetchMfaStatus();
  };

  const handleRevokeSession = async (tokenId: string) => {
    // Navigate to session revoke confirmation page
    router.push(`/dashboard/settings/security/sessions/${tokenId}/revoke`);
  };

  const handleLogoutAllSessions = async () => {
    // Navigate to logout all sessions confirmation page
    router.push('/dashboard/settings/security/logout-all');
  };

  const handleChangePassword = () => {
    // Navigate to change password page with proper form
    router.push('/dashboard/settings/security/change-password');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account security and authentication methods
        </p>
      </div>

      {/* MFA Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Two-Factor Authentication (MFA)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          {mfaStatus?.enabled ? (
            <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
              <CheckCircle className="w-4 h-4" />
              Enabled
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-4 h-4" />
              Disabled
            </span>
          )}
        </div>

        {mfaStatus?.enabled ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    MFA is enabled
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Enabled on {new Date(mfaStatus.enabledAt!).toLocaleDateString()}
                  </p>
                  {mfaStatus.backupCodesRemaining !== undefined && (
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Backup codes remaining: {mfaStatus.backupCodesRemaining}
                      {mfaStatus.backupCodesRemaining <= 2 && (
                        <span className="text-orange-600 dark:text-orange-400 font-medium ml-2">
                          (Consider regenerating)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBackupCodes(!showBackupCodes)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
              >
                {showBackupCodes ? 'Hide' : 'Manage'} Backup Codes
              </button>
              <button
                onClick={() => setShowDisableModal(true)}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
              >
                Disable MFA
              </button>
            </div>

            {showBackupCodes && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <BackupCodes codes={backupCodes} onRegenerate={fetchMfaStatus} />
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Protect your account with an authenticator app. You'll need to enter a code from
              your phone in addition to your password when signing in.
            </p>
            <button
              onClick={() => setShowMfaSetup(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Enable MFA
            </button>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Sessions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage devices where you're currently logged in
              </p>
            </div>
          </div>
          {sessions.length > 1 && (
            <button
              onClick={handleLogoutAllSessions}
              className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
            >
              Logout All
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No active sessions</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.tokenId}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {session.userAgent || 'Unknown Device'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    IP: {session.ipAddress || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Created: {new Date(session.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeSession(session.tokenId)}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Password</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Change your account password
            </p>
          </div>
        </div>
        <button onClick={handleChangePassword} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
          Change Password
        </button>
      </div>

      {/* MFA Setup Modal */}
      {showMfaSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="relative">
            <button
              onClick={() => setShowMfaSetup(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              Close
            </button>
            <MFASetup
              onComplete={handleMfaSetupComplete}
              onCancel={() => setShowMfaSetup(false)}
            />
          </div>
        </div>
      )}

      {/* Disable MFA Modal */}
      {showDisableModal && (
        <DisableMfaModal
          onSuccess={() => {
            setShowDisableModal(false);
            fetchMfaStatus();
          }}
          onCancel={() => setShowDisableModal(false)}
        />
      )}
    </div>
  );
}

interface DisableMfaModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function DisableMfaModal({ onSuccess, onCancel }: DisableMfaModalProps) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          password,
          token: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to disable MFA');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Disable MFA</h3>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Disabling MFA will make your account less secure. You'll only need your password to
            sign in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Authentication Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center text-lg tracking-wider font-mono"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password || code.length !== 6}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Disabling...' : 'Disable MFA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
