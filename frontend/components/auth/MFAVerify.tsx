'use client';

import { useState } from 'react';
import { Shield, AlertCircle, Key } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface MFAVerifyProps {
  onSuccess: () => void;
  onUseBackupCode: () => void;
  userId: string;
}

export function MFAVerify({ onSuccess, onUseBackupCode, userId }: MFAVerifyProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid code');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Enter your verification code</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Authentication Code
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              maxLength={6}
              autoFocus
              required
            />
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onUseBackupCode}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Use a backup code instead
          </button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Having trouble? Contact support for assistance.
        </p>
      </div>
    </div>
  );
}

interface MFABackupCodeVerifyProps {
  onSuccess: () => void;
  onBack: () => void;
  userId: string;
}

export function MFABackupCodeVerify({ onSuccess, onBack, userId }: MFABackupCodeVerifyProps) {
  const toast = useToast();
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          backupCode: backupCode.replace(/-/g, ''),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid backup code');
      }

      if (data.backupCodesRemaining !== undefined && data.backupCodesRemaining <= 2) {
        toast.warning('Backup Codes Warning', `You have ${data.backupCodesRemaining} backup codes remaining. Please regenerate new codes soon.`);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setBackupCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <Key className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Use Backup Code</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Enter one of your backup codes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Backup Code
          </label>
          <input
            type="text"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white text-center text-lg tracking-wider font-mono"
            placeholder="XXXX-XXXX"
            required
          />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Each backup code can only be used once
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !backupCode}
            className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    </div>
  );
}
