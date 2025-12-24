'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Receipt,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  FileText,
  Loader2,
  MoreVertical,
  Download,
  Printer,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  Link as LinkIcon,
  Tag,
  User,
  Banknote,
} from 'lucide-react';

interface TransactionDetail {
  id: string;
  transactionNumber: string;
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  amountRON?: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled' | 'reconciled';
  paymentMethod: string;
  reference?: string;
  bankAccount?: {
    id: string;
    name: string;
    iban: string;
    bank: string;
  };
  partner?: {
    id: string;
    name: string;
    cui: string;
  };
  linkedDocuments: {
    type: 'invoice' | 'payment' | 'contract' | 'order';
    id: string;
    number: string;
  }[];
  attachments: {
    id: string;
    name: string;
    type: string;
    size: number;
  }[];
  notes?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reconciledAt?: string;
  reconciledBy?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Mock data for demo
const getMockTransaction = (id: string): TransactionDetail => ({
  id,
  transactionNumber: 'TRX-2025-0456',
  type: 'income',
  category: 'Venituri din vânzări',
  subcategory: 'Servicii IT',
  description: 'Încasare factură servicii consultanță IT - proiect ERP',
  amount: 11900.00,
  currency: 'RON',
  date: '2025-12-15',
  status: 'reconciled',
  paymentMethod: 'Transfer bancar',
  reference: 'OP-2025-78456',
  bankAccount: {
    id: 'acc-001',
    name: 'Cont Principal RON',
    iban: 'RO49BTRLRONCRT0123456789',
    bank: 'Banca Transilvania',
  },
  partner: {
    id: 'partner-001',
    name: 'Tech Solutions SRL',
    cui: 'RO12345678',
  },
  linkedDocuments: [
    { type: 'invoice', id: 'inv-001', number: 'FV-2025-0156' },
    { type: 'payment', id: 'pay-001', number: 'PL-2025-0089' },
  ],
  attachments: [
    { id: 'att-001', name: 'extras_cont_dec2025.pdf', type: 'application/pdf', size: 125000 },
  ],
  notes: 'Plată conform contract servicii nr. 45/2025',
  tags: ['client-premium', 'proiect-erp', 'recurent'],
  createdBy: 'Maria Ionescu',
  createdAt: '2025-12-15T10:30:00Z',
  updatedAt: '2025-12-15T14:20:00Z',
  reconciledAt: '2025-12-15T14:20:00Z',
  reconciledBy: 'Sistem Automat',
});

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const transactionId = params.id as string;

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTransaction = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/finance/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTransaction(data);
      } else {
        setTransaction(getMockTransaction(transactionId));
      }
    } catch (err) {
      console.error('Error fetching transaction:', err);
      setTransaction(getMockTransaction(transactionId));
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/finance/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Tranzacție ștearsă', 'Tranzacția a fost ștearsă cu succes.');
        router.push('/dashboard/finance');
      } else {
        toast.error('Eroare', 'Nu s-a putut șterge tranzacția.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut șterge tranzacția.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReconcile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/finance/transactions/${transactionId}/reconcile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Reconciliere', 'Tranzacția a fost reconciliată.');
        fetchTransaction();
      } else {
        toast.error('Eroare', 'Nu s-a putut reconcilia tranzacția.');
      }
    } catch (err) {
      toast.error('Eroare', 'Nu s-a putut reconcilia tranzacția.');
    }
  };

  const handleCopyReference = () => {
    if (transaction?.reference) {
      navigator.clipboard.writeText(transaction.reference);
      toast.success('Copiat', 'Referința a fost copiată.');
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'income':
        return { label: 'Încasare', color: 'bg-green-100 text-green-800', icon: <ArrowDownRight className="h-5 w-5 text-green-600" /> };
      case 'expense':
        return { label: 'Plată', color: 'bg-red-100 text-red-800', icon: <ArrowUpRight className="h-5 w-5 text-red-600" /> };
      case 'transfer':
        return { label: 'Transfer', color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="h-5 w-5 text-blue-600" /> };
      case 'adjustment':
        return { label: 'Ajustare', color: 'bg-purple-100 text-purple-800', icon: <RefreshCw className="h-5 w-5 text-purple-600" /> };
      default:
        return { label: type, color: 'bg-gray-100 text-gray-800', icon: <Receipt className="h-5 w-5 text-gray-600" /> };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Finalizată', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-5 w-5" /> };
      case 'pending':
        return { label: 'În așteptare', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-5 w-5" /> };
      case 'reconciled':
        return { label: 'Reconciliată', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-5 w-5" /> };
      case 'cancelled':
        return { label: 'Anulată', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-5 w-5" /> };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-5 w-5" /> };
    }
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      invoice: 'Factură',
      payment: 'Plată',
      contract: 'Contract',
      order: 'Comandă',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error || 'Tranzacția nu a fost găsită.'}</p>
        <button
          onClick={() => router.push('/dashboard/finance')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Înapoi la finanțe
        </button>
      </div>
    );
  }

  const typeConfig = getTypeConfig(transaction.type);
  const statusConfig = getStatusConfig(transaction.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/finance')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{transaction.transactionNumber}</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>

          {transaction.status !== 'reconciled' && (
            <button
              onClick={handleReconcile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Reconciliază
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>

            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => router.push(`/dashboard/finance/transactions/${transactionId}/edit`)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editează
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Printează
                  </button>
                  <button
                    onClick={() => toast.success('Export', 'Se exportă...')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>
                  <hr className="my-1" />
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Card */}
          <div className={`rounded-xl p-6 text-white ${transaction.type === 'income' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-rose-600'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">{typeConfig.label}</p>
                <p className="text-4xl font-bold mt-1">
                  {transaction.type === 'expense' ? '-' : '+'}{formatAmount(transaction.amount, transaction.currency)}
                </p>
                {transaction.amountRON && transaction.currency !== 'RON' && (
                  <p className="text-white/70 text-sm mt-2">
                    ≈ {formatAmount(transaction.amountRON, 'RON')} (curs: {transaction.exchangeRate})
                  </p>
                )}
              </div>
              <div className="bg-white/20 p-4 rounded-full">
                {typeConfig.icon}
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalii tranzacție</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Categorie</p>
                <p className="font-medium text-gray-900">{transaction.category}</p>
                {transaction.subcategory && (
                  <p className="text-sm text-gray-500">{transaction.subcategory}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">Data</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(transaction.date)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Metodă plată</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  {transaction.paymentMethod}
                </p>
              </div>

              {transaction.reference && (
                <div>
                  <p className="text-sm text-gray-500">Referință</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{transaction.reference}</p>
                    <button onClick={handleCopyReference} className="p-1 hover:bg-gray-100 rounded">
                      <Copy className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Descriere</p>
              <p className="text-gray-900 mt-1">{transaction.description}</p>
            </div>

            {transaction.notes && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">{transaction.notes}</p>
              </div>
            )}

            {/* Tags */}
            {transaction.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Etichete</p>
                <div className="flex flex-wrap gap-2">
                  {transaction.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bank Account */}
          {transaction.bankAccount && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cont bancar</h2>
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Banknote className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.bankAccount.name}</p>
                  <p className="text-sm text-gray-600">{transaction.bankAccount.bank}</p>
                  <p className="font-mono text-sm text-gray-500 mt-1">{transaction.bankAccount.iban}</p>
                </div>
              </div>
            </div>
          )}

          {/* Linked Documents */}
          {transaction.linkedDocuments.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documente asociate</h2>
              <div className="space-y-3">
                {transaction.linkedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">{getDocTypeLabel(doc.type)}</p>
                        <p className="font-medium text-gray-900">{doc.number}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/${doc.type === 'invoice' ? 'invoices' : doc.type === 'payment' ? 'payments' : doc.type + 's'}/${doc.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Vezi
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {transaction.attachments.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Atașamente</h2>
              <div className="space-y-2">
                {transaction.attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      Descarcă
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Partner Info */}
          {transaction.partner && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Partener</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.partner.name}</p>
                  <p className="text-sm text-gray-500">CUI: {transaction.partner.cui}</p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/dashboard/partners/${transaction.partner?.id}`)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Profil partener
              </button>
            </div>
          )}

          {/* Audit Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Istoric</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Creat</p>
                  <p className="text-sm text-gray-600">{transaction.createdBy}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(transaction.createdAt)}</p>
                </div>
              </div>
              {transaction.updatedAt !== transaction.createdAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 bg-gray-300 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Ultima actualizare</p>
                    <p className="text-xs text-gray-400">{formatDateTime(transaction.updatedAt)}</p>
                  </div>
                </div>
              )}
              {transaction.reconciledAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Reconciliat</p>
                    <p className="text-sm text-gray-600">{transaction.reconciledBy}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(transaction.reconciledAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acțiuni rapide</h3>
            <div className="space-y-2">
              <button
                onClick={() => toast.success('Duplicare', 'Se creează o copie...')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Duplică tranzacția
              </button>
              <button
                onClick={() => router.push('/dashboard/finance/transactions/new')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Receipt className="h-4 w-4" />
                Tranzacție nouă
              </button>
              <button
                onClick={() => router.push('/dashboard/finance')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reconciliere
              </button>
            </div>
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
              Sigur dorești să ștergi tranzacția <strong>{transaction.transactionNumber}</strong>? Această acțiune nu poate fi anulată.
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
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
