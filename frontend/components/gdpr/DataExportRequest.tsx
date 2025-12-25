'use client';

import { useState } from 'react';
import { Download, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DataExportRequestProps {
  userId: string;
  onSuccess?: () => void;
}

export function DataExportRequest({ userId, onSuccess }: DataExportRequestProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const handleExportRequest = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for your data export request');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/gdpr/dsr-requests?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'DATA_EXPORT',
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create export request');
      }

      setSuccess(true);
      setReason('');
      onSuccess?.();

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/gdpr/export?userId=${userId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr-export-${userId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start gap-3 mb-4">
        <Download className="w-6 h-6 text-blue-600 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export Your Data</h3>
          <p className="text-sm text-gray-600 mt-1">
            Download a copy of all your personal data stored in our system (GDPR Article 20 - Right to Data Portability)
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700">Your data export request has been submitted successfully!</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Export <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Please briefly explain why you're requesting your data..."
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportRequest}
            disabled={loading || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Request Export
              </>
            )}
          </button>

          <button
            onClick={handleDirectExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Now
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Your data will be provided in JSON format and will include all personal information, transactions, documents, and activity history.
        </p>
      </div>
    </div>
  );
}
