'use client';

import { useState } from 'react';
import { Copy, Check, Download, AlertCircle, RefreshCw } from 'lucide-react';

interface BackupCodesProps {
  codes?: string[];
  onRegenerate?: () => void;
}

export function BackupCodes({ codes: initialCodes, onRegenerate }: BackupCodesProps) {
  const [codes, setCodes] = useState<string[]>(initialCodes || []);
  const [copied, setCopied] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadCodes = () => {
    const content = `DocumentIulia.ro - MFA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${codes.join('\n')}\n\nKeep these codes in a secure location. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentiulia-mfa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!codes || codes.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No backup codes available. You'll receive backup codes when you enable MFA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              Important Security Information
            </p>
            <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Each backup code can only be used once</li>
              <li>• Store these codes in a secure location</li>
              <li>• Regenerating codes will invalidate all previous codes</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-2">
          {codes.map((code, index) => (
            <code
              key={index}
              className="px-3 py-2 bg-white dark:bg-gray-800 rounded text-sm font-mono text-gray-900 dark:text-white text-center border border-gray-200 dark:border-gray-600"
            >
              {code}
            </code>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copyToClipboard}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 font-medium"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
        <button
          onClick={downloadCodes}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        {onRegenerate && (
          <button
            onClick={() => setShowRegenerateModal(true)}
            className="px-4 py-2 border border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2 font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        )}
      </div>

      {showRegenerateModal && (
        <RegenerateModal
          onConfirm={async () => {
            await onRegenerate?.();
            setShowRegenerateModal(false);
          }}
          onCancel={() => setShowRegenerateModal(false)}
        />
      )}
    </div>
  );
}

interface RegenerateModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function RegenerateModal({ onConfirm, onCancel }: RegenerateModalProps) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/regenerate-backup-codes', {
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
        throw new Error(data.message || 'Failed to regenerate codes');
      }

      onConfirm();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Regenerate Backup Codes
        </h3>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 rounded-lg mb-4">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            This will invalidate all your existing backup codes and generate new ones.
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
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
