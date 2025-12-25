'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DataDeletionRequestProps {
  userId: string;
  userEmail: string;
  onSuccess?: () => void;
}

export function DataDeletionRequest({ userId, userEmail, onSuccess }: DataDeletionRequestProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const handleDeleteRequest = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for deletion');
      return;
    }

    if (confirmEmail !== userEmail) {
      setError('Email confirmation does not match');
      return;
    }

    if (!understood) {
      setError('Please confirm that you understand the consequences');
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
          type: 'DATA_DELETION',
          reason: reason.trim(),
          additionalDetails: 'User confirmed understanding of deletion consequences',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create deletion request');
      }

      setSuccess(true);
      setReason('');
      setConfirmEmail('');
      setShowConfirmation(false);
      setUnderstood(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-red-200 p-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Delete Your Account & Data</h3>
          <p className="text-sm text-gray-600 mt-1">
            Request permanent deletion of your account and all associated data (GDPR Article 17 - Right to Erasure)
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700">Deletion request submitted successfully</p>
            <p className="text-xs text-green-600 mt-1">
              Our team will review your request within 30 days as required by GDPR.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-2">Warning: This action cannot be undone!</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All your personal data will be permanently deleted</li>
              <li>All invoices, documents, and reports will be removed</li>
              <li>Your account will be closed and cannot be recovered</li>
              <li>Some data may be retained for legal compliance (tax records for 10 years per Romanian law)</li>
            </ul>
          </div>
        </div>
      </div>

      {!showConfirmation ? (
        <button
          onClick={() => setShowConfirmation(true)}
          className="w-full px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition"
        >
          I want to delete my account
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Deletion <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
              placeholder="Please tell us why you're leaving..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Your Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder={userEmail}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Type <span className="font-mono font-semibold">{userEmail}</span> to confirm
            </p>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="understand"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1"
              disabled={loading}
            />
            <label htmlFor="understand" className="text-sm text-gray-700">
              I understand that this action is permanent and my data cannot be recovered after deletion (except where legally required to be retained)
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirmation(false);
                setError(null);
              }}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteRequest}
              disabled={loading || !reason.trim() || confirmEmail !== userEmail || !understood}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete My Account
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
