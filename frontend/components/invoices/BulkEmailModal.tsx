'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Send, Loader2, AlertCircle, CheckCircle, XCircle, Paperclip } from 'lucide-react';
import { api } from '@/lib/api';

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceIds: string[];
  onSuccess: () => void;
}

interface EligibilityResult {
  eligible: Array<{
    id: string;
    invoiceNumber: string;
    partnerEmail: string;
    partnerName: string;
  }>;
  ineligible: Array<{
    id: string;
    invoiceNumber: string;
    reason: string;
  }>;
}

interface BulkEmailResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<{
    invoiceId: string;
    invoiceNumber: string;
    recipientEmail: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
  }>;
}

export function BulkEmailModal({ isOpen, onClose, invoiceIds, onSuccess }: BulkEmailModalProps) {
  const [step, setStep] = useState<'check' | 'compose' | 'sending' | 'results'>('check');
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [results, setResults] = useState<BulkEmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Email form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeAttachment, setIncludeAttachment] = useState(true);
  const [ccEmails, setCcEmails] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');

  useEffect(() => {
    if (isOpen && invoiceIds.length > 0) {
      checkEligibility();
    }
  }, [isOpen, invoiceIds]);

  const checkEligibility = async () => {
    setLoading(true);
    setError(null);
    setStep('check');

    try {
      const response = await api.post<EligibilityResult>('/invoices/bulk-email/check', {
        invoiceIds,
      });

      if (response.data) {
        setEligibility(response.data);
        if (response.data.eligible.length > 0) {
          setStep('compose');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la verificarea facturilor');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (!eligibility || eligibility.eligible.length === 0) return;

    setLoading(true);
    setError(null);
    setStep('sending');

    try {
      const eligibleIds = eligibility.eligible.map(e => e.id);
      const ccArray = ccEmails.split(',').map(e => e.trim()).filter(e => e);

      const response = await api.post<BulkEmailResult>('/invoices/bulk-email', {
        invoiceIds: eligibleIds,
        subject: subject || undefined,
        message: message || undefined,
        includeAttachment,
        ccEmails: ccArray.length > 0 ? ccArray : undefined,
        replyToEmail: replyToEmail || undefined,
      });

      if (response.data) {
        setResults(response.data);
        setStep('results');
        if (response.data.sent > 0) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la trimiterea email-urilor');
      setStep('compose');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('check');
    setEligibility(null);
    setResults(null);
    setError(null);
    setSubject('');
    setMessage('');
    setIncludeAttachment(true);
    setCcEmails('');
    setReplyToEmail('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-white" />
            <h2 className="text-lg font-semibold text-white">
              Trimite Facturi prin Email
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step: Checking */}
          {step === 'check' && loading && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Se verifica facturile selectate...</p>
            </div>
          )}

          {/* Step: Compose */}
          {step === 'compose' && eligibility && (
            <div className="space-y-6">
              {/* Eligibility Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      {eligibility.eligible.length} facturi eligibile
                    </span>
                  </div>
                  <p className="text-sm text-green-600">
                    Vor primi email cu factura atasata
                  </p>
                </div>
                {eligibility.ineligible.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-800">
                        {eligibility.ineligible.length} facturi excluse
                      </span>
                    </div>
                    <p className="text-sm text-amber-600">
                      Partener fara email configurat
                    </p>
                  </div>
                )}
              </div>

              {/* Recipients List */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Destinatari:</h3>
                <div className="max-h-32 overflow-y-auto border rounded-lg divide-y">
                  {eligibility.eligible.map((item) => (
                    <div key={item.id} className="px-3 py-2 flex justify-between text-sm">
                      <span className="font-medium">{item.invoiceNumber}</span>
                      <span className="text-gray-600">
                        {item.partnerName} ({item.partnerEmail})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subiect (optional)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Factura #{numar} - DocumentIulia"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Lasati gol pentru subiect implicit
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mesaj personalizat (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Adaugati un mesaj personalizat care va aparea in email..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CC (optional)
                    </label>
                    <input
                      type="text"
                      value={ccEmails}
                      onChange={(e) => setCcEmails(e.target.value)}
                      placeholder="email1@ex.com, email2@ex.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reply-To (optional)
                    </label>
                    <input
                      type="email"
                      value={replyToEmail}
                      onChange={(e) => setReplyToEmail(e.target.value)}
                      placeholder="raspuns@companie.ro"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeAttachment"
                    checked={includeAttachment}
                    onChange={(e) => setIncludeAttachment(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="includeAttachment" className="flex items-center gap-2 text-sm text-gray-700">
                    <Paperclip className="h-4 w-4" />
                    Ataseaza PDF-ul facturii
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step: Sending */}
          {step === 'sending' && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Se trimit email-urile...</p>
              <p className="text-sm text-gray-500 mt-2">
                Aceasta poate dura cateva momente
              </p>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && results && (
            <div className="space-y-6">
              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-800">{results.sent}</p>
                  <p className="text-sm text-green-600">Trimise cu succes</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-800">{results.failed}</p>
                  <p className="text-sm text-red-600">Esuate</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{results.skipped}</p>
                  <p className="text-sm text-gray-600">Omise</p>
                </div>
              </div>

              {/* Detailed Results */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Detalii:</h3>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {results.results.map((result, index) => (
                    <div
                      key={index}
                      className={`px-3 py-2 flex items-center justify-between text-sm ${
                        result.status === 'sent'
                          ? 'bg-green-50'
                          : result.status === 'failed'
                          ? 'bg-red-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.status === 'sent' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : result.status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="font-medium">{result.invoiceNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600">{result.recipientEmail}</span>
                        {result.error && (
                          <p className="text-xs text-red-600">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {step === 'results' ? 'Inchide' : 'Anuleaza'}
          </button>
          {step === 'compose' && eligibility && eligibility.eligible.length > 0 && (
            <button
              onClick={handleSendEmails}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Trimite {eligibility.eligible.length} email-uri
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkEmailModal;
