import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Target,
  TrendingUp,
  Phone,
  Mail,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  MessageSquare,
  FileText,
  AlertCircle,
} from 'lucide-react';
import opportunityService, { type Opportunity, type OpportunityActivity } from '../../services/crm/opportunityService';

const OpportunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOpportunity(id);
    }
  }, [id]);

  const loadOpportunity = async (opportunityId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await opportunityService.getOpportunity(opportunityId);
      setOpportunity(data);
    } catch (err) {
      console.error('Failed to load opportunity:', err);
      setError('Nu s-a putut încărca oportunitatea. Vă rugăm încercați din nou.');
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-gray-100 text-gray-800',
      qualified: 'bg-blue-100 text-blue-800',
      proposal: 'bg-purple-100 text-purple-800',
      negotiation: 'bg-orange-100 text-orange-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      lead: 'Lead',
      qualified: 'Calificat',
      proposal: 'Ofertă',
      negotiation: 'Negociere',
      won: 'Câștigat',
      lost: 'Pierdut',
    };
    return labels[stage] || stage;
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      email: Mail,
      call: Phone,
      meeting: Calendar,
      note: MessageSquare,
      stage_change: Target,
      task: CheckCircle,
    };
    return icons[type] || FileText;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      email: 'bg-blue-100 text-blue-600',
      call: 'bg-green-100 text-green-600',
      meeting: 'bg-purple-100 text-purple-600',
      note: 'bg-gray-100 text-gray-600',
      stage_change: 'bg-orange-100 text-orange-600',
      task: 'bg-indigo-100 text-indigo-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Eroare</h3>
            <p className="text-sm text-red-700 mt-1">{error || 'Oportunitatea nu a fost găsită'}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigate('/crm/opportunities')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Înapoi la listă
              </button>
              {id && (
                <button
                  onClick={() => loadOpportunity(id)}
                  className="px-4 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-red-50 text-sm"
                >
                  Încearcă din nou
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/crm/opportunities"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi la oportunități
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                {opportunity.name}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(opportunity.stage)}`}>
                {getStageLabel(opportunity.stage)}
              </span>
            </div>
            {opportunity.description && (
              <p className="text-sm sm:text-base text-gray-600">{opportunity.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editează</span>
            </button>
            <button className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Șterge</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Details Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalii Cheie</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valoare</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(opportunity.amount, opportunity.currency)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Probabilitate</p>
                  <p className="text-lg font-bold text-gray-900">{opportunity.probability}%</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data închiderii estimate</p>
                  <p className="text-base font-medium text-gray-900">
                    {formatDate(opportunity.expected_close_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Creat la</p>
                  <p className="text-base font-medium text-gray-900">
                    {formatDate(opportunity.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cronologie Activități</h2>

            {opportunity.activities && opportunity.activities.length > 0 ? (
              <div className="space-y-4">
                {opportunity.activities.map((activity: OpportunityActivity, index: number) => {
                  const Icon = getActivityIcon(activity.activity_type);
                  const isLast = index === opportunity.activities!.length - 1;

                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {!isLast && <div className="w-0.5 h-full bg-gray-200 my-1"></div>}
                      </div>

                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-gray-900">{activity.subject || activity.activity_type}</p>
                          <span className="text-xs text-gray-500">{formatDateTime(activity.created_at)}</span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                        )}
                        {activity.user_name && (
                          <p className="text-xs text-gray-500">de {activity.user_name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nu există activități</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info Card */}
          {opportunity.contact_name && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-900">{opportunity.contact_name}</span>
                </div>
                {opportunity.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a href={`mailto:${opportunity.contact_email}`} className="text-sm text-blue-600 hover:underline">
                      {opportunity.contact_email}
                    </a>
                  </div>
                )}
                {opportunity.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a href={`tel:${opportunity.contact_phone}`} className="text-sm text-blue-600 hover:underline">
                      {opportunity.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assigned To Card */}
          {opportunity.assigned_to_name && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Asignat către</h2>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-900">{opportunity.assigned_to_name}</span>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informații Adiționale</h2>
            <div className="space-y-3 text-sm">
              {opportunity.source && (
                <div>
                  <span className="text-gray-600">Sursă:</span>
                  <span className="ml-2 text-gray-900 font-medium">{opportunity.source}</span>
                </div>
              )}
              {opportunity.campaign && (
                <div>
                  <span className="text-gray-600">Campanie:</span>
                  <span className="ml-2 text-gray-900 font-medium">{opportunity.campaign}</span>
                </div>
              )}
              {opportunity.stage === 'lost' && opportunity.loss_reason && (
                <div>
                  <span className="text-gray-600">Motiv pierdere:</span>
                  <span className="ml-2 text-gray-900 font-medium">{opportunity.loss_reason}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetailPage;
