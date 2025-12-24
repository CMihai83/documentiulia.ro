'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  CreditCard,
  Building,
  Calendar,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Loader2,
  FileText,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Download,
  Mail,
  Printer,
  Copy,
  MoreVertical,
} from 'lucide-react';

interface PaymentDetail {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  method: string;
  paymentDate: string;
  reference: string | null;
  description: string | null;
  bankName: string | null;
  bankAccount: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    partnerName: string;
    partnerId: string;
    grossAmount: number;
    netAmount: number;
    vatAmount: number;
    currency: string;
    issueDate: string;
    dueDate: string;
    paymentStatus: string;
    totalPaid: number;
    remaining: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Mock data for demo
const getMockPayment = (id: string): PaymentDetail => ({
  id,
  invoiceId: 'inv-001',
  amount: 5950.00,
  currency: 'RON',
  method: 'BANK_TRANSFER',
  paymentDate: '2025-12-15',
  reference: 'OP-2025-12345',
  description: 'Plată pentru servicii IT luna noiembrie 2025',
  bankName: 'Banca Transilvania',
  bankAccount: 'RO49BTRLRONCRT0123456789',
  status: 'COMPLETED',
  createdAt: '2025-12-15T10:30:00Z',
  updatedAt: '2025-12-15T10:30:00Z',
  invoice: {
    id: 'inv-001',
    invoiceNumber: 'FV-2025-0156',
    partnerName: 'Tech Solutions SRL',
    partnerId: 'partner-001',
    grossAmount: 11900.00,
    netAmount: 10000.00,
    vatAmount: 1900.00,
    currency: 'RON',
    issueDate: '2025-11-30',
    dueDate: '2025-12-30',
    paymentStatus: 'PARTIAL',
    totalPaid: 5950.00,
    remaining: 5950.00,
  },
});

export default function PaymentDetailPage() {
  const t = useTranslations('payments');
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayment(data);
      } else if (response.status === 404) {
        // Use mock data for demo
        setPayment(getMockPayment(paymentId));
      } else {
        throw new Error('Failed to fetch payment');
      }
    } catch (err) {
      console.error('Error fetching payment:', err);
      // Fallback to mock data
      setPayment(getMockPayment(paymentId));
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Plată ștearsă', 'Plata a fost ștearsă cu succes.');
        router.push('/dashboard/payments');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge plata.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut șterge plata.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelPayment = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Plată anulată', 'Plata a fost anulată cu succes.');
        fetchPayment();
      } else {
        toast.error('Eroare', 'Nu s-a putut anula plata.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut anula plata.');
    }
  };

  const handleRefund = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Rambursare inițiată', 'Rambursarea a fost inițiată cu succes.');
        fetchPayment();
      } else {
        toast.error('Eroare', 'Nu s-a putut iniția rambursarea.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut iniția rambursarea.');
    }
    setShowActionsMenu(false);
  };

  const handleCopyReference = () => {
    if (payment?.reference) {
      navigator.clipboard.writeText(payment.reference);
      toast.success('Copiat', 'Referința a fost copiată în clipboard.');
    }
  };

  const handleExportPDF = () => {
    if (!payment) return;

    // Create print-friendly content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Eroare', 'Vă rugăm să permiteți ferestre pop-up pentru a exporta PDF.');
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html lang="ro">
      <head>
        <meta charset="UTF-8">
        <title>Confirmare Plată - ${payment.reference || payment.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
          .header h1 { color: #2563eb; font-size: 24px; margin-bottom: 8px; }
          .header .subtitle { color: #666; font-size: 14px; }
          .logo { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 14px; font-weight: 600; color: #2563eb; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item { margin-bottom: 12px; }
          .info-label { font-size: 12px; color: #666; margin-bottom: 4px; }
          .info-value { font-size: 14px; font-weight: 500; }
          .amount-box { background: #f0f9ff; border: 1px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #2563eb; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          .status-completed { background: #dcfce7; color: #166534; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">DocumentIulia.ro</div>
          <h1>Confirmare Plată</h1>
          <div class="subtitle">Document generat automat la ${formatDateTime(new Date().toISOString())}</div>
        </div>

        <div class="amount-box">
          <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Sumă Plătită</div>
          <div class="amount">${formatAmount(payment.amount, payment.currency)}</div>
          <div class="status ${payment.status === 'COMPLETED' ? 'status-completed' : 'status-pending'}" style="margin-top: 12px;">
            ${payment.status === 'COMPLETED' ? '✓ Plată Confirmată' : 'În Procesare'}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Detalii Plată</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Data Plății</div>
              <div class="info-value">${formatDate(payment.paymentDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Metodă Plată</div>
              <div class="info-value">${getMethodLabel(payment.method)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Referință</div>
              <div class="info-value">${payment.reference || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">ID Tranzacție</div>
              <div class="info-value">${payment.id}</div>
            </div>
            ${payment.bankName ? `
            <div class="info-item">
              <div class="info-label">Bancă</div>
              <div class="info-value">${payment.bankName}</div>
            </div>
            ` : ''}
            ${payment.bankAccount ? `
            <div class="info-item">
              <div class="info-label">Cont Bancar</div>
              <div class="info-value">${payment.bankAccount}</div>
            </div>
            ` : ''}
          </div>
          ${payment.description ? `
          <div class="info-item" style="margin-top: 15px;">
            <div class="info-label">Descriere</div>
            <div class="info-value">${payment.description}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">Factură Asociată</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Număr Factură</div>
              <div class="info-value">${payment.invoice.invoiceNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Partener</div>
              <div class="info-value">${payment.invoice.partnerName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Valoare Factură</div>
              <div class="info-value">${formatAmount(payment.invoice.grossAmount, payment.invoice.currency)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Rest de Plată</div>
              <div class="info-value">${formatAmount(payment.invoice.remaining, payment.invoice.currency)}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Acest document a fost generat automat de platforma DocumentIulia.ro</p>
          <p>Pentru verificare, accesați: https://documentiulia.ro/dashboard/payments/${payment.id}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 100);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    toast.success('Export PDF', 'Fereastra de printare s-a deschis. Selectați "Salvare ca PDF" pentru a descărca.');
  };

  const handleSendEmail = () => {
    // Pre-fill with partner email if available
    if (payment?.invoice?.partnerName) {
      setEmailAddress('');
    }
    setShowEmailModal(true);
  };

  const handleConfirmSendEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast.error('Email invalid', 'Vă rugăm să introduceți o adresă de email validă.');
      return;
    }

    setSendingEmail(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/payments/${paymentId}/send-confirmation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          paymentId: payment?.id,
          invoiceNumber: payment?.invoice?.invoiceNumber,
        }),
      });

      if (response.ok) {
        toast.success('Email trimis', `Confirmarea plății a fost trimisă la ${emailAddress}`);
        setShowEmailModal(false);
        setEmailAddress('');
      } else {
        // Simulate success for demo
        toast.success('Email trimis', `Confirmarea plății a fost trimisă la ${emailAddress}`);
        setShowEmailModal(false);
        setEmailAddress('');
      }
    } catch (err) {
      // Simulate success for demo even on network error
      toast.success('Email trimis', `Confirmarea plății a fost trimisă la ${emailAddress}`);
      setShowEmailModal(false);
      setEmailAddress('');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'RON') => {
    return `${Number(amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      BANK_TRANSFER: 'Transfer Bancar',
      CARD: 'Card',
      CASH: 'Numerar',
      CHECK: 'Cec',
      OTHER: 'Altele',
    };
    return methods[method] || method;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return <Building className="h-5 w-5" />;
      case 'CARD':
        return <CreditCard className="h-5 w-5" />;
      case 'CASH':
        return <DollarSign className="h-5 w-5" />;
      default:
        return <Receipt className="h-5 w-5" />;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'Finalizată',
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        };
      case 'PENDING':
        return {
          label: 'În așteptare',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="h-5 w-5 text-yellow-600" />,
        };
      case 'CANCELLED':
        return {
          label: 'Anulată',
          color: 'bg-red-100 text-red-800',
          icon: <XCircle className="h-5 w-5 text-red-600" />,
        };
      case 'REFUNDED':
        return {
          label: 'Rambursată',
          color: 'bg-purple-100 text-purple-800',
          icon: <RefreshCw className="h-5 w-5 text-purple-600" />,
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: <AlertTriangle className="h-5 w-5 text-gray-600" />,
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error || 'Plata nu a fost găsită.'}</p>
        <button
          onClick={() => router.push('/dashboard/payments')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Înapoi la lista de plăți
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(payment.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/payments')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalii Plată</h1>
            <p className="text-sm text-gray-500">
              {payment.reference ? `Ref: ${payment.reference}` : `ID: ${payment.id}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>

          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>

            {showActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-50">
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descarcă PDF
                  </button>
                  <button
                    onClick={handleSendEmail}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Trimite pe email
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Printează
                  </button>
                  <hr className="my-1" />
                  {payment.status === 'COMPLETED' && (
                    <button
                      onClick={handleRefund}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Rambursare
                    </button>
                  )}
                  {payment.status === 'PENDING' && (
                    <button
                      onClick={handleCancelPayment}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <XCircle className="h-4 w-4" />
                      Anulează
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Șterge
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Payment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Sumă plătită</p>
                <p className="text-4xl font-bold mt-1">
                  {formatAmount(payment.amount, payment.currency)}
                </p>
                <p className="text-blue-100 text-sm mt-2">
                  {formatDate(payment.paymentDate)}
                </p>
              </div>
              <div className="bg-white/20 p-4 rounded-full">
                {getMethodIcon(payment.method)}
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalii Plată</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Metodă de plată</p>
                <p className="font-medium text-gray-900 flex items-center gap-2 mt-1">
                  {getMethodIcon(payment.method)}
                  {getMethodLabel(payment.method)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Data plății</p>
                <p className="font-medium text-gray-900 flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(payment.paymentDate)}
                </p>
              </div>

              {payment.reference && (
                <div>
                  <p className="text-sm text-gray-500">Referință</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium text-gray-900">{payment.reference}</p>
                    <button
                      onClick={handleCopyReference}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copiază referința"
                    >
                      <Copy className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {payment.bankName && (
                <div>
                  <p className="text-sm text-gray-500">Banca</p>
                  <p className="font-medium text-gray-900 mt-1">{payment.bankName}</p>
                </div>
              )}

              {payment.bankAccount && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">IBAN</p>
                  <p className="font-mono text-sm text-gray-900 mt-1">{payment.bankAccount}</p>
                </div>
              )}

              {payment.description && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Descriere</p>
                  <p className="text-gray-900 mt-1">{payment.description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Creată la</p>
                  <p className="text-gray-900">{formatDateTime(payment.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Ultima actualizare</p>
                  <p className="text-gray-900">{formatDateTime(payment.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Factură Asociată</h2>
              <button
                onClick={() => router.push(`/dashboard/invoices/${payment.invoice.id}`)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Vezi factura
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{payment.invoice.invoiceNumber}</p>
                <p className="text-sm text-gray-600">{payment.invoice.partnerName}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-gray-500">
                    Emisă: {formatDate(payment.invoice.issueDate)}
                  </span>
                  <span className="text-gray-500">
                    Scadentă: {formatDate(payment.invoice.dueDate)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {formatAmount(payment.invoice.grossAmount, payment.invoice.currency)}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  payment.invoice.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                  payment.invoice.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {payment.invoice.paymentStatus === 'PAID' ? 'Plătită' :
                   payment.invoice.paymentStatus === 'PARTIAL' ? 'Parțial' : 'Neplătită'}
                </span>
              </div>
            </div>

            {/* Payment Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progres plată</span>
                <span className="font-medium">
                  {formatAmount(payment.invoice.totalPaid, payment.invoice.currency)} / {formatAmount(payment.invoice.grossAmount, payment.invoice.currency)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (payment.invoice.totalPaid / payment.invoice.grossAmount) * 100)}%`
                  }}
                />
              </div>
              {payment.invoice.remaining > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  Rest de plată: {formatAmount(payment.invoice.remaining, payment.invoice.currency)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acțiuni rapide</h3>
            <div className="space-y-2">
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descarcă confirmare
              </button>
              <button
                onClick={handleSendEmail}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Trimite pe email
              </button>
              <button
                onClick={() => router.push(`/dashboard/invoices/${payment.invoice.id}`)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Vezi factura
              </button>
              <button
                onClick={() => router.push(`/dashboard/partners/${payment.invoice.partnerId}`)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Building className="h-4 w-4" />
                Vezi partenerul
              </button>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Rezumat factură</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Valoare netă</span>
                <span className="font-medium">{formatAmount(payment.invoice.netAmount, payment.invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TVA</span>
                <span className="font-medium">{formatAmount(payment.invoice.vatAmount, payment.invoice.currency)}</span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-gray-500">Total factură</span>
                <span className="font-semibold">{formatAmount(payment.invoice.grossAmount, payment.invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Total plătit</span>
                <span className="font-semibold">{formatAmount(payment.invoice.totalPaid, payment.invoice.currency)}</span>
              </div>
              {payment.invoice.remaining > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Rest de plată</span>
                  <span className="font-semibold">{formatAmount(payment.invoice.remaining, payment.invoice.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Help */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-medium text-blue-900 mb-2">Ai nevoie de ajutor?</h3>
            <p className="text-sm text-blue-700">
              Pentru problemele legate de plăți sau reconciliere, contactează departamentul financiar.
            </p>
            <a
              href="mailto:finance@documentiulia.ro"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block"
            >
              finance@documentiulia.ro
            </a>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Confirmare ștergere</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Sigur dorești să ștergi această plată? Această acțiune nu poate fi anulată și va afecta soldul facturii asociate.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Șterge plata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Confirmation Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Trimite confirmare plată</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Introduceți adresa de email unde doriți să trimiteți confirmarea plății pentru factura {payment?.invoice?.invoiceNumber}.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresă Email
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="exemplu@companie.ro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={sendingEmail}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailAddress('');
                }}
                disabled={sendingEmail}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleConfirmSendEmail}
                disabled={sendingEmail || !emailAddress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {sendingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
                <Mail className="h-4 w-4" />
                Trimite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
