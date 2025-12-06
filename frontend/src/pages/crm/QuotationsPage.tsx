import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Download,
  MoreVertical,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import quotationService, { type Quotation } from '../../services/crm/quotationService';

const QuotationsPage: React.FC = () => {
  const { } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
    sent: { label: 'Trimisă', color: 'bg-blue-100 text-blue-800', icon: Send },
    accepted: { label: 'Acceptată', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { label: 'Respinsă', color: 'bg-red-100 text-red-800', icon: XCircle },
    expired: { label: 'Expirată', color: 'bg-orange-100 text-orange-800', icon: Clock },
    converted: { label: 'Convertită', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await quotationService.listQuotations();
      setQuotations(data);
    } catch (err) {
      console.error('Failed to load quotations:', err);
      setError('Nu s-au putut încărca ofertele. Vă rugăm încercați din nou.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const filteredQuotations = quotations.filter((quotation) => {
    const matchesSearch =
      quotation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;

    const matchesStatus = filterStatus === 'all' || quotation.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Eroare la încărcarea datelor</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadQuotations}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Încearcă din nou
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Oferte de Preț
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestionează ofertele către clienți
            </p>
          </div>
          <button className="w-full sm:w-auto px-4 py-3 sm:py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Ofertă Nouă
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Caută oferte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toate Statusurile</option>
            <option value="draft">Draft</option>
            <option value="sent">Trimise</option>
            <option value="accepted">Acceptate</option>
            <option value="rejected">Respinse</option>
            <option value="expired">Expirate</option>
            <option value="converted">Convertite</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = quotations.filter((q) => q.status === status).length;
          const Icon = config.icon;

          return (
            <div
              key={status}
              className="bg-white rounded-lg shadow p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus(status)}
            >
              <div className={`${config.color} w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-xs sm:text-sm text-gray-600">{config.label}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Mobile View (Cards) */}
      <div className="block md:hidden">
        <div className="space-y-3">
          {filteredQuotations.map((quotation) => (
            <div
              key={quotation.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{quotation.quotation_number}</p>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">
                    {quotation.title}
                  </h3>
                  {getStatusBadge(quotation.status)}
                </div>
                <button className="ml-2 p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <span className="text-gray-500">Client:</span>
                  <p className="font-medium text-gray-900 truncate">{quotation.contact_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Valoare:</span>
                  <p className="font-bold text-green-600">
                    {formatCurrency(quotation.total_amount, quotation.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Data emiterii:</span>
                  <p className="font-medium text-gray-900">{formatDate(quotation.issue_date)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Expiră:</span>
                  <p className="font-medium text-gray-900">{formatDate(quotation.expiry_date)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 min-h-[44px]">
                  <Eye className="w-4 h-4 inline mr-1" />
                  Vezi
                </button>
                <button className="flex-1 px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 min-h-[44px]">
                  <Download className="w-4 h-4 inline mr-1" />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Număr Ofertă
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titlu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valoare
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Emiterii
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {quotation.quotation_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{quotation.title}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {quotation.contact_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatCurrency(quotation.total_amount, quotation.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(quotation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(quotation.issue_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotations.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nu există oferte de afișat</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationsPage;
