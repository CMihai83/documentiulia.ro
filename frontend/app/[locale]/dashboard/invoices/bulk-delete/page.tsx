'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Trash2, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  partnerName: string;
  grossAmount: number;
  currency: string;
}

function BulkDeleteContent() {
  const t = useTranslations('invoices');
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/bulk/invoices/delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      if (response.ok) {
        toast.success('Facturi sterse', `${ids.length} facturi au fost sterse cu succes!`);
        router.push('/dashboard/invoices');
      } else {
        toast.error('Eroare', 'Eroare la stergerea facturilor');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Eroare', 'Eroare la stergerea facturilor');
    } finally {
      setDeleting(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Inapoi
      </button>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Confirmare Stergere</h1>
            <p className="text-gray-600">Esti sigur ca vrei sa stergi {ids.length} facturi?</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : invoices.length > 0 ? (
          <div className="border rounded-lg divide-y mb-6 max-h-64 overflow-y-auto">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{invoice.partnerName}</p>
                </div>
                <p className="font-medium">{formatAmount(invoice.grossAmount, invoice.currency)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 mb-6">
            {ids.length} facturi selectate pentru stergere
          </div>
        )}

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">
            <strong>Atentie:</strong> Aceasta actiune este ireversibila. Facturile sterse nu pot fi recuperate.
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
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleting ? 'Se sterge...' : 'Sterge Facturile'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BulkDeletePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <BulkDeleteContent />
    </Suspense>
  );
}
