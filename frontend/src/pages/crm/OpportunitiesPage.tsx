import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import opportunityService, { type Pipeline, type Opportunity } from '../../services/crm/opportunityService';

const OpportunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<Pipeline>({
    lead: [],
    qualified: [],
    proposal: [],
    negotiation: [],
    won: [],
    lost: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_id: '',
    amount: '',
    currency: 'RON',
    probability: '50',
    expected_close_date: '',
    stage: 'lead',
    description: '',
    source: '',
    campaign: '',
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const stages = [
    { key: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800', icon: Target },
    { key: 'qualified', label: 'Calificat', color: 'bg-blue-100 text-blue-800', icon: Filter },
    { key: 'proposal', label: 'Ofertă', color: 'bg-purple-100 text-purple-800', icon: TrendingUp },
    { key: 'negotiation', label: 'Negociere', color: 'bg-orange-100 text-orange-800', icon: DollarSign },
    { key: 'won', label: 'Câștigat', color: 'bg-green-100 text-green-800', icon: TrendingUp },
    { key: 'lost', label: 'Pierdut', color: 'bg-red-100 text-red-800', icon: Trash2 },
  ];

  useEffect(() => {
    loadPipeline();
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await fetch('/api/v1/contacts/list.php', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Company-ID': localStorage.getItem('companyId') || '',
        },
      });
      const result = await response.json();
      if (result.success) {
        setContacts(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  const loadPipeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await opportunityService.getPipeline();
      setPipeline(data);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
      setError('Nu s-au putut încărca oportunitățile. Vă rugăm încercați din nou.');
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
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  const handleSaveOpportunity = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/v1/crm/opportunities.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Company-ID': localStorage.getItem('companyId') || '',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount) || 0,
          probability: parseInt(formData.probability) || 50,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowAddModal(false);
        setFormData({
          name: '',
          contact_id: '',
          amount: '',
          currency: 'RON',
          probability: '50',
          expected_close_date: '',
          stage: 'lead',
          description: '',
          source: '',
          campaign: '',
        });
        loadPipeline(); // Reload the pipeline
      } else {
        alert('Eroare la salvarea oportunității: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to save opportunity:', err);
      alert('Eroare la salvarea oportunității. Vă rugăm încercați din nou.');
    } finally {
      setSaving(false);
    }
  };

  const OpportunityCard: React.FC<{ opportunity: Opportunity }> = ({ opportunity }) => {
    return (
      <div
        onClick={() => navigate(`/crm/opportunities/${opportunity.id}`)}
        className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-3 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
            {opportunity.name}
          </h4>
          <button
            onClick={(e) => e.stopPropagation()}
            className="ml-2 p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-lg font-bold text-green-600">
              {formatCurrency(opportunity.amount, opportunity.currency)}
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {opportunity.probability}% probabilitate
            </span>
          </div>

          {opportunity.contact_name && (
            <div className="flex items-center text-xs text-gray-600">
              <User className="w-3 h-3 mr-1" />
              {opportunity.contact_name}
            </div>
          )}

          {opportunity.expected_close_date && (
            <div className="flex items-center text-xs text-gray-600">
              <Calendar className="w-3 h-3 mr-1" />
              Închidere: {formatDate(opportunity.expected_close_date)}
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/crm/opportunities/${opportunity.id}`);
            }}
            className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
          >
            <Eye className="w-3 h-3 inline mr-1" />
            Vezi
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
          >
            <Edit className="w-3 h-3 inline mr-1" />
            Editează
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
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
              onClick={loadPipeline}
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
              Oportunități
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestionează pipeline-ul de vânzări
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adaugă Oportunitate
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Caută oportunități..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                viewMode === 'pipeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <Target className="w-5 h-5" />
              <span className="hidden sm:inline">Pipeline</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Listă</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline View (Kanban) */}
      {viewMode === 'pipeline' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max lg:min-w-0 lg:grid lg:grid-cols-6">
            {stages.map((stage) => {
              const stageOpportunities = pipeline[stage.key as keyof Pipeline] || [];
              const totalValue = stageOpportunities.reduce((sum, opp) => sum + opp.amount, 0);

              return (
                <div key={stage.key} className="flex-shrink-0 w-72 lg:w-auto">
                  <div className={`${stage.color} rounded-lg p-3 mb-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{stage.label}</h3>
                      <span className="text-xs font-medium bg-white/50 px-2 py-1 rounded">
                        {stageOpportunities.length}
                      </span>
                    </div>
                    <div className="text-xs font-medium">
                      {formatCurrency(totalValue, 'RON')}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {stageOpportunities.map((opportunity) => (
                      <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                    ))}

                    {stageOpportunities.length === 0 && (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400">Nu există oportunități</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View (Mobile-friendly table) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <p className="p-8 text-center text-gray-500">
            Vizualizarea listă va fi implementată în curând
          </p>
        </div>
      )}

      {/* Add Opportunity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Adaugă Oportunitate Nouă</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nume Oportunitate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ex: Enterprise Software License - 100 Utilizatori"
                  />
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <select
                    value={formData.contact_id}
                    onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selectează client...</option>
                    {contacts.filter(c => c.contact_type === 'customer').map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount and Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valoare <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="125000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monedă
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="RON">RON</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                {/* Probability and Stage */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Probabilitate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stadiu
                    </label>
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="lead">Lead</option>
                      <option value="qualification">Calificat</option>
                      <option value="proposal">Ofertă</option>
                      <option value="negotiation">Negociere</option>
                    </select>
                  </div>
                </div>

                {/* Expected Close Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Estimată Închidere
                  </label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descriere
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Detalii despre oportunitate..."
                  />
                </div>

                {/* Source and Campaign */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sursă
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selectează...</option>
                      <option value="website">Website</option>
                      <option value="referral">Recomandare</option>
                      <option value="direct">Direct</option>
                      <option value="partner">Partner</option>
                      <option value="marketing">Marketing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Campanie
                    </label>
                    <input
                      type="text"
                      value={formData.campaign}
                      onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ex: Q4 2025 Campaign"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Anulează
                </button>
                <button
                  onClick={handleSaveOpportunity}
                  disabled={saving || !formData.name || !formData.amount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvare...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Salvează Oportunitatea
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesPage;
