'use client';

import { useState } from 'react';
import { X, FileText, Download, Send, Edit, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { downloadInvoicePdf, type InvoicePdfData } from '@/lib/pdf';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  type: 'ISSUED' | 'RECEIVED';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'SUBMITTED' | 'PAID' | 'CANCELLED';
  partnerName: string;
  partnerCui: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  spvSubmitted: boolean;
}

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function InvoiceDetailModal({ invoice, isOpen, onClose, onUpdate }: InvoiceDetailModalProps) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState<Partial<Invoice>>({});

  if (!isOpen || !invoice) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-indigo-100 text-indigo-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadPdf = () => {
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
    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/anaf/efactura/submit/${invoice.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Trimis SPV', 'Factura a fost trimisă către SPV!');
        onUpdate?.();
        onClose();
      } else {
        toast.error('Eroare', 'Eroare la trimiterea facturii către SPV');
      }
    } catch (error) {
      console.error('SPV submission error:', error);
      toast.error('Eroare', 'Eroare la trimiterea facturii');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedInvoice),
      });

      if (response.ok) {
        setIsEditing(false);
        toast.success('Salvat', 'Modificările au fost salvate cu succes.');
        onUpdate?.();
      } else {
        toast.error('Eroare', 'Eroare la salvarea modificărilor');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Eroare', 'Eroare la salvare');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">{invoice.invoiceNumber}</h2>
              <p className="text-sm text-gray-500">
                {invoice.type === 'ISSUED' ? 'Factura Emisa' : 'Factura Primita'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-between items-center">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
            {invoice.spvSubmitted && (
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                Trimis SPV
              </span>
            )}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">Data Emiterii</label>
              <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">Data Scadenta</label>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          {/* Partner Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {invoice.type === 'ISSUED' ? 'Client' : 'Furnizor'}
            </h3>
            <p className="font-medium">{invoice.partnerName}</p>
            {invoice.partnerCui && (
              <p className="text-sm text-gray-600">CUI: {invoice.partnerCui}</p>
            )}
          </div>

          {/* Amounts */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Valoare Neta</span>
              <span className="font-medium">{formatAmount(invoice.netAmount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">TVA</span>
              <span className="font-medium">{formatAmount(invoice.vatAmount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-2 text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-blue-600">{formatAmount(invoice.grossAmount, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            {invoice.status === 'DRAFT' && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Edit className="w-4 h-4" />
                Editeaza
              </button>
            )}
          </div>

          {invoice.type === 'ISSUED' && !invoice.spvSubmitted && invoice.status !== 'DRAFT' && (
            <button
              onClick={handleSubmitToSPV}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Trimite la SPV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
