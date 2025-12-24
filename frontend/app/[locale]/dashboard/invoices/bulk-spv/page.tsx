'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Send, FileText, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  partnerName: string;
  grossAmount: number;
  currency: string;
  spvSubmitted: boolean;
}

interface SubmissionResult {
  invoiceId: string;
  success: boolean;
  message?: string;
}

function BulkSpvContent() {
  const t = useTranslations('invoices');
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SubmissionResult[]>([]);
  const [completed, setCompleted] = useState(false);

  const ids = searchParams.get('ids')?.split(',') || [];
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  useEffect(() => {
    if (ids.length === 0) {
      router.push('/dashboard/invoices');
      return;
    }
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices?ids=${ids.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/bulk-submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceIds: ids }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || ids.map(id => ({ invoiceId: id, success: true })));
        setCompleted(true);
        toast.compliance('e-Factura SPV', `${data.successCount || ids.length} facturi au fost trimise catre ANAF SPV!`);
      } else {
        toast.error('Eroare SPV', 'Eroare la trimiterea facturilor catre SPV');
      }
    } catch (error) {
      console.error('SPV submit error:', error);
      toast.error('Eroare', 'Eroare la trimiterea facturilor');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const eligibleInvoices = invoices.filter(inv => !inv.spvSubmitted);
  const alreadySubmitted = invoices.filter(inv => inv.spvSubmitted);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        onClick={() => router.push('/dashboard/invoices')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Inapoi la facturi
      </button>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-full">
            <Send className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trimitere e-Factura SPV</h1>
            <p className="text-gray-600">
              {completed
                ? 'Rezultatele trimiterii catre ANAF SPV'
                : `Trimite ${eligibleInvoices.length} facturi catre ANAF SPV`
              }
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : completed ? (
          <div className="space-y-4">
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {results.map((result) => {
                const invoice = invoices.find(inv => inv.id === result.invoiceId);
                return (
                  <div key={result.invoiceId} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{invoice?.invoiceNumber || result.invoiceId}</p>
                        <p className="text-sm text-gray-500">{invoice?.partnerName}</p>
                      </div>
                    </div>
                    <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success ? 'Trimis' : result.message || 'Eroare'}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => router.push('/dashboard/invoices')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Inapoi la Facturi
            </button>
          </div>
        ) : (
          <>
            {alreadySubmitted.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Atentie:</strong> {alreadySubmitted.length} facturi sunt deja trimise catre SPV si vor fi ignorate.
                </p>
              </div>
            )}

            {eligibleInvoices.length > 0 ? (
              <div className="border rounded-lg divide-y mb-6 max-h-64 overflow-y-auto">
                {eligibleInvoices.map((invoice) => (
                  <div key={invoice.id} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-500">{invoice.partnerName}</p>
                      </div>
                    </div>
                    <p className="font-medium">{formatAmount(invoice.grossAmount, invoice.currency)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 mb-6">
                Nu exista facturi eligibile pentru trimitere SPV
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                Facturile vor fi trimise catre sistemul e-Factura ANAF SPV in format UBL 2.1 conform legislatiei in vigoare.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anuleaza
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || eligibleInvoices.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? 'Se trimite...' : 'Trimite la SPV'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BulkSpvPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <BulkSpvContent />
    </Suspense>
  );
}
