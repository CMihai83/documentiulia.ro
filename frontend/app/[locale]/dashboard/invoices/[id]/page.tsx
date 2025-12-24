'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Download,
  Send,
  Printer,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  Copy,
} from 'lucide-react';
import { downloadInvoicePdf, type InvoicePdfData } from '@/lib/pdf';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  type: 'ISSUED' | 'RECEIVED';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'SUBMITTED' | 'PAID' | 'CANCELLED';
  partnerName: string;
  partnerCui: string | null;
  partnerAddress: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  spvSubmitted: boolean;
  spvIndexId: string | null;
  notes: string | null;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export default function InvoiceDetailPage() {
  const t = useTranslations('invoices');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch invoice');

      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      setError('Eroare la încărcarea facturii');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!invoice) return;

    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate || undefined,
      type: invoice.type,
      status: invoice.status,
      partnerName: invoice.partnerName,
      partnerCui: invoice.partnerCui || undefined,
      netAmount: invoice.netAmount,
      vatRate: invoice.vatAmount > 0 ? Math.round((invoice.vatAmount / invoice.netAmount) * 100) : 19,
      vatAmount: invoice.vatAmount,
      grossAmount: invoice.grossAmount,
      currency: invoice.currency,
    };
    downloadInvoicePdf(pdfData);
  };

  const handleSubmitToSPV = async () => {
    if (!invoice) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/anaf/efactura/submit/${invoice.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.compliance('e-Factura SPV', 'Factura a fost trimisă către ANAF SPV!');
        fetchInvoice();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare SPV', errorData.message || 'Eroare la trimiterea către SPV');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Eroare la trimiterea facturii');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    // Navigate to delete confirmation page
    router.push(`/dashboard/invoices/${invoice.id}/delete`);
  };

  const handleDeleteConfirmed = async () => {
    if (!invoice) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices/${invoice.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Factură ștearsă', 'Factura a fost ștearsă cu succes.');
        router.push('/dashboard/invoices');
      } else {
        toast.error('Eroare', 'Eroare la ștergerea facturii');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Eroare la ștergerea facturii');
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!invoice) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices/${invoice.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const newInvoice = await response.json();
        toast.success('Factură duplicată', 'Factura a fost duplicată cu succes.');
        router.push(`/dashboard/invoices/${newInvoice.id}`);
      } else {
        toast.error('Eroare', 'Eroare la duplicarea facturii');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Eroare la duplicarea facturii');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const statusLabels: Record<string, string> = {
          PENDING: 'finalizată',
          APPROVED: 'aprobată',
          PAID: 'plătită',
        };
        toast.success('Status actualizat', `Factura a fost marcată ca ${statusLabels[newStatus] || newStatus}!`);
        fetchInvoice();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare', errorData.message || 'Eroare la actualizarea statusului');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Eroare la actualizarea facturii');
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    // Navigate to email send page with form
    router.push(`/dashboard/invoices/${invoice.id}/send-email`);
  };

  const handleSendEmailConfirmed = async (email: string) => {
    if (!invoice || !email) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices/bulk-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceIds: [invoice.id],
          includeAttachment: true,
          recipientOverride: email,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.sent > 0) {
          toast.success('Email trimis', 'Factura a fost trimisă pe email cu succes!');
        } else {
          toast.error('Eroare', 'Nu s-a putut trimite email-ul. Verificați adresa.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Eroare', errorData.message || 'Eroare la trimiterea email-ului');
      }
    } catch (err) {
      toast.error('Eroare conexiune', 'Eroare la trimiterea email-ului');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Platita' };
      case 'SUBMITTED':
        return { color: 'bg-blue-100 text-blue-800', icon: Send, label: 'Depusa SPV' };
      case 'APPROVED':
        return { color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle, label: 'Aprobata' };
      case 'PENDING':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'In asteptare' };
      case 'CANCELLED':
        return { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Anulata' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: FileText, label: 'Ciorna' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500">{error || 'Factura nu a fost gasita'}</p>
        <Link href="/dashboard/invoices" className="text-primary-600 hover:underline mt-4 inline-block">
          Inapoi la facturi
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Factura {invoice.invoiceNumber}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                invoice.type === 'ISSUED' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
              }`}>
                {invoice.type === 'ISSUED' ? 'Emisa' : 'Primita'}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${statusConfig.color}`}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
              {invoice.spvSubmitted && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700">
                  SPV: {invoice.spvIndexId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            className="p-2 border rounded-lg hover:bg-gray-50 transition"
            title="Duplica"
          >
            <Copy className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleDownloadPdf}
            className="p-2 border rounded-lg hover:bg-gray-50 transition"
            title="Descarca PDF"
          >
            <Download className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 border rounded-lg hover:bg-gray-50 transition"
            title="Printeaza"
          >
            <Printer className="w-5 h-5 text-gray-600" />
          </button>
          {invoice.status === 'DRAFT' && (
            <>
              <Link
                href={`/dashboard/invoices/${invoice.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                <Edit className="w-4 h-4" />
                Editeaza
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Sterge
              </button>
            </>
          )}
          {invoice.type === 'ISSUED' && !invoice.spvSubmitted && invoice.status !== 'DRAFT' && (
            <button
              onClick={handleSubmitToSPV}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Trimite la SPV
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Partner Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {invoice.type === 'ISSUED' ? 'Client' : 'Furnizor'}
            </h3>
            <div className="space-y-2">
              <p className="text-lg font-medium">{invoice.partnerName}</p>
              {invoice.partnerCui && (
                <p className="text-sm text-gray-500">CUI: {invoice.partnerCui}</p>
              )}
              {invoice.partnerAddress && (
                <p className="text-sm text-gray-500">{invoice.partnerAddress}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Produse / Servicii</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-500">Descriere</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500">Cant.</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500">Pret unitar</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500">TVA %</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3">{item.description}</td>
                        <td className="py-3 text-right">{item.quantity} {item.unit}</td>
                        <td className="py-3 text-right">{formatAmount(item.unitPrice, invoice.currency)}</td>
                        <td className="py-3 text-right">{item.vatRate}%</td>
                        <td className="py-3 text-right font-medium">{formatAmount(item.grossAmount, invoice.currency)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-500">
                        Fara articole
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Note</h3>
              <p className="text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Data facturii</p>
                <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
              </div>
              {invoice.dueDate && (
                <div>
                  <p className="text-sm text-gray-500">Data scadenta</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Creata</p>
                <p className="text-sm">{formatDate(invoice.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ultima modificare</p>
                <p className="text-sm">{formatDate(invoice.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Sume
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatAmount(invoice.netAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TVA</span>
                <span>{formatAmount(invoice.vatAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">{formatAmount(invoice.grossAmount, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-3">Actiuni rapide</h4>
            <div className="space-y-2">
              {invoice.status === 'DRAFT' && (
                <button
                  onClick={() => handleStatusChange('PENDING')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm transition-colors"
                >
                  Marcheaza ca finalizata
                </button>
              )}
              {invoice.status === 'PENDING' && (
                <button
                  onClick={() => handleStatusChange('APPROVED')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm transition-colors"
                >
                  Aproba factura
                </button>
              )}
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                <button
                  onClick={() => handleStatusChange('PAID')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm transition-colors"
                >
                  Marcheaza ca platita
                </button>
              )}
              <button
                onClick={handleSendEmail}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm transition-colors"
              >
                Trimite pe email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
