'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, AlertTriangle, CheckCircle, Clock, FileText, Users,
  MapPin, Activity, TrendingUp, TrendingDown, RefreshCw, Plus,
  Eye, Edit, Calendar, Target, AlertCircle, Leaf, Zap, Droplet,
  Thermometer, ClipboardCheck, Award, BarChart3, PieChart,
  Search, Filter, Download, Send
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface HSESummary {
  totalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  openIncidents: number;
  overdueTasks: number;
  complianceScore: number;
  trainingsCompleted: number;
}

interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  riskLevel: 'EXTREME' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  location: string;
  category: string;
  lastReviewed: string;
  nextReview: string;
}

interface Incident {
  id: string;
  title: string;
  type: 'NEAR_MISS' | 'FIRST_AID' | 'LOST_TIME' | 'FATALITY' | 'ENVIRONMENTAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'CLOSED';
  reportedDate: string;
  location: string;
}

interface AuditItem {
  id: string;
  title: string;
  standard: 'ISO_45001' | 'ISO_14001';
  type: 'INTERNAL' | 'EXTERNAL' | 'SURVEILLANCE';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  scheduledDate: string;
  findings: number;
}

interface KPI {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  target?: number;
}

type TabType = 'dashboard' | 'risks' | 'incidents' | 'audits' | 'training' | 'compliance';

export default function HSEPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<HSESummary | null>(null);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [safetyKPIs, setSafetyKPIs] = useState<KPI[]>([]);
  const [envKPIs, setEnvKPIs] = useState<KPI[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch summary
      const summaryRes = await fetch(`${API_URL}/hse/summary`, { headers });
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      // Fetch tab-specific data
      if (activeTab === 'risks' || activeTab === 'dashboard') {
        const risksRes = await fetch(`${API_URL}/hse/risk-assessments`, { headers });
        if (risksRes.ok) {
          setRisks(await risksRes.json());
        }
      }

      if (activeTab === 'incidents' || activeTab === 'dashboard') {
        // Mock incident data since we need to check if endpoint exists
        setIncidents([
          {
            id: 'inc-001',
            title: 'Alunecare pe suprafață umedă',
            type: 'NEAR_MISS',
            severity: 'LOW',
            status: 'CLOSED',
            reportedDate: '2025-12-10',
            location: 'Depozit A',
          },
          {
            id: 'inc-002',
            title: 'Contact cu echipament fierbinte',
            type: 'FIRST_AID',
            severity: 'MEDIUM',
            status: 'INVESTIGATING',
            reportedDate: '2025-12-08',
            location: 'Producție',
          },
        ]);
      }

      if (activeTab === 'audits' || activeTab === 'dashboard') {
        const auditsRes = await fetch(`${API_URL}/hse/dashboard/audits`, { headers });
        if (auditsRes.ok) {
          setAudits(await auditsRes.json());
        }
      }

      // Mock KPIs
      setSafetyKPIs([
        { name: 'TRIR', value: 1.2, unit: '', trend: 'down', target: 1.5 },
        { name: 'LTIR', value: 0.5, unit: '', trend: 'down', target: 0.8 },
        { name: 'Zile fără incidente', value: 45, unit: 'zile', trend: 'up' },
        { name: 'Near Misses raportate', value: 23, unit: '', trend: 'up', target: 20 },
      ]);

      setEnvKPIs([
        { name: 'Deșeuri reciclate', value: 78, unit: '%', trend: 'up', target: 75 },
        { name: 'Energie regenerabilă', value: 42, unit: '%', trend: 'up', target: 50 },
        { name: 'Emisii CO2', value: 125, unit: 't', trend: 'down', target: 150 },
        { name: 'Consum apă', value: 850, unit: 'm³', trend: 'down', target: 1000 },
      ]);

    } catch (err) {
      console.error('Failed to fetch HSE data:', err);
      setError('Eroare la încărcarea datelor HSE');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'EXTREME': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-400 text-yellow-900';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CLOSED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'UNDER_REVIEW':
      case 'INVESTIGATING':
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
      case 'SCHEDULED':
        return 'bg-gray-100 text-gray-800';
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO');
  };

  // Action Handlers
  const handleReportIncident = () => {
    router.push('/dashboard/hse/incidents/new');
  };

  const handleNewRiskAssessment = () => {
    router.push('/dashboard/hse/risks/new');
  };

  const handleViewRisk = (risk: RiskAssessment) => {
    router.push(`/dashboard/hse/risks/${risk.id}`);
  };

  const handleEditRisk = (risk: RiskAssessment) => {
    router.push(`/dashboard/hse/risks/${risk.id}/edit`);
  };

  const handleViewIncident = (incident: Incident) => {
    router.push(`/dashboard/hse/incidents/${incident.id}`);
  };

  const handleInvestigateIncident = (incident: Incident) => {
    router.push(`/dashboard/hse/incidents/${incident.id}/investigate`);
  };

  const handleScheduleAudit = () => {
    router.push('/dashboard/hse/audits/new');
  };

  const handleViewAudit = (audit: AuditItem) => {
    router.push(`/dashboard/hse/audits/${audit.id}`);
  };

  const handleDownloadAuditReport = async (audit: AuditItem) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/hse/audits/${audit.id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raport_audit_${audit.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Raport descărcat: ${audit.title}`);
      } else {
        toast.error('Raportul nu este disponibil momentan');
      }
    } catch (err) {
      console.error('Failed to download audit report:', err);
      toast.error('Eroare la descărcarea raportului');
    }
  };

  const handleViewISO45001Details = () => {
    router.push('/dashboard/hse/compliance/iso45001');
  };

  const handleViewISO14001Details = () => {
    router.push('/dashboard/hse/compliance/iso14001');
  };

  const handleQuickAction = (action: string) => {
    const actions: Record<string, string> = {
      'incident': '/dashboard/hse/incidents/new',
      'risk': '/dashboard/hse/risks/new',
      'checklist': '/dashboard/hse/checklists/pssr',
      'export': '/dashboard/hse/reports/export',
    };
    if (actions[action]) {
      router.push(actions[action]);
    }
  };

  const getIncidentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'NEAR_MISS': 'Aproape de incident',
      'FIRST_AID': 'Prim ajutor',
      'LOST_TIME': 'Zile pierdute',
      'FATALITY': 'Fatal',
      'ENVIRONMENTAL': 'Mediu',
    };
    return labels[type] || type;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Eroare</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sănătate, Securitate și Mediu</h1>
          <p className="text-gray-500 mt-1">
            Management HSE conform ISO 45001:2018 și ISO 14001:2015
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button onClick={handleReportIncident} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Raportare Incident
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-white rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Riscuri Totale</p>
                <p className="text-xl font-bold text-gray-900">{summary.totalRisks}</p>
              </div>
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600">Risc Ridicat</p>
                <p className="text-xl font-bold text-red-900">{summary.highRisks}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600">Risc Mediu</p>
                <p className="text-xl font-bold text-yellow-900">{summary.mediumRisks}</p>
              </div>
              <Activity className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600">Risc Scăzut</p>
                <p className="text-xl font-bold text-green-900">{summary.lowRisks}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600">Incidente</p>
                <p className="text-xl font-bold text-orange-900">{summary.openIncidents}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-orange-400" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600">Restante</p>
                <p className="text-xl font-bold text-purple-900">{summary.overdueTasks}</p>
              </div>
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="bg-indigo-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-600">Conformitate</p>
                <p className="text-xl font-bold text-indigo-900">{summary.complianceScore}%</p>
              </div>
              <Award className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
          <div className="bg-teal-50 rounded-lg shadow p-4 col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-600">Instruiri</p>
                <p className="text-xl font-bold text-teal-900">{summary.trainingsCompleted}</p>
              </div>
              <Users className="h-6 w-6 text-teal-400" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { key: 'risks', label: 'Riscuri', icon: Shield },
            { key: 'incidents', label: 'Incidente', icon: AlertTriangle },
            { key: 'audits', label: 'Audituri', icon: ClipboardCheck },
            { key: 'training', label: 'Instruiri', icon: Users },
            { key: 'compliance', label: 'Conformitate', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-gray-500">Se încarcă...</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        /* Dashboard View */
        <div className="space-y-6">
          {/* KPIs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Safety KPIs */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Indicatori Siguranță</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {safetyKPIs.map((kpi, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">{kpi.name}</span>
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : kpi.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : null}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
                      <span className="text-sm text-gray-500">{kpi.unit}</span>
                    </div>
                    {kpi.target && (
                      <div className="mt-1 text-xs text-gray-400">
                        Țintă: {kpi.target} {kpi.unit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Environmental KPIs */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Indicatori Mediu</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {envKPIs.map((kpi, idx) => {
                  const icons = [Leaf, Zap, Thermometer, Droplet];
                  const Icon = icons[idx % icons.length];
                  return (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <Icon className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-500">{kpi.name}</span>
                        </div>
                        {kpi.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : kpi.trend === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
                        <span className="text-sm text-gray-500">{kpi.unit}</span>
                      </div>
                      {kpi.target && (
                        <div className="mt-1">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Țintă: {kpi.target} {kpi.unit}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Risks */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Riscuri Recente</h3>
                <button
                  onClick={() => setActiveTab('risks')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Vezi toate →
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {risks.slice(0, 5).map((risk) => (
                  <div key={risk.id} className="px-6 py-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{risk.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{risk.location}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getRiskLevelColor(risk.riskLevel)}`}>
                        {risk.riskLevel}
                      </span>
                    </div>
                  </div>
                ))}
                {risks.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    Nu există riscuri înregistrate
                  </div>
                )}
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Incidente Recente</h3>
                <button
                  onClick={() => setActiveTab('incidents')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Vezi toate →
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {incidents.slice(0, 5).map((incident) => (
                  <div key={incident.id} className="px-6 py-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{incident.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatDate(incident.reportedDate)}
                          </span>
                          <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusColor(incident.status)}`}>
                            {incident.status}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                  </div>
                ))}
                {incidents.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    Nu există incidente înregistrate
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'risks' ? (
        /* Risks Tab */
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută riscuri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">Toate nivelurile</option>
                <option value="EXTREME">Extrem</option>
                <option value="HIGH">Ridicat</option>
                <option value="MEDIUM">Mediu</option>
                <option value="LOW">Scăzut</option>
              </select>
            </div>
            <button onClick={handleNewRiskAssessment} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Evaluare Nouă
            </button>
          </div>
          {risks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nu există evaluări de risc</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titlu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locație</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel Risc</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revizuire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {risks
                    .filter(r => riskFilter === 'all' || r.riskLevel === riskFilter)
                    .filter(r => searchQuery === '' || r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((risk) => (
                      <tr key={risk.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{risk.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{risk.description}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{risk.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {risk.location}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskLevelColor(risk.riskLevel)}`}>
                            {risk.riskLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(risk.status)}`}>
                            {risk.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(risk.nextReview)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex space-x-2">
                            <button onClick={() => handleViewRisk(risk)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                              <Eye className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleEditRisk(risk)} className="text-green-600 hover:text-green-900" title="Editare">
                              <Edit className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'incidents' ? (
        /* Incidents Tab */
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Registru Incidente</h3>
            <button onClick={handleReportIncident} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Raportare Incident
            </button>
          </div>
          {incidents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nu există incidente înregistrate</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incident</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locație</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severitate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{incident.title}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {getIncidentTypeLabel(incident.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {incident.location}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(incident.reportedDate)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <button onClick={() => handleViewIncident(incident)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                            <Eye className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleInvestigateIncident(incident)} className="text-green-600 hover:text-green-900" title="Investigare">
                            <ClipboardCheck className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'audits' ? (
        /* Audits Tab */
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Audituri ISO</h3>
            <button onClick={handleScheduleAudit} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Programare Audit
            </button>
          </div>
          {audits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nu există audituri programate</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Audit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Standard</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Constatări</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {audits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{audit.title}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${
                          audit.standard === 'ISO_45001' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {audit.standard.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{audit.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(audit.scheduledDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(audit.status)}`}>
                          {audit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{audit.findings}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <button onClick={() => handleViewAudit(audit)} className="text-blue-600 hover:text-blue-900" title="Vizualizare">
                            <Eye className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleDownloadAuditReport(audit)} className="text-gray-600 hover:text-gray-900" title="Raport">
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'compliance' ? (
        /* Compliance Tab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ISO 45001 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ISO 45001:2018</h3>
                  <p className="text-sm text-gray-500">Sisteme de management al SSM</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Scor conformitate</span>
                <span className="text-2xl font-bold text-blue-600">87%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '87%' }} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Clauze conforme</span>
                  <span className="font-medium text-green-600">24/28</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Parțial conforme</span>
                  <span className="font-medium text-yellow-600">3/28</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Neconforme</span>
                  <span className="font-medium text-red-600">1/28</span>
                </div>
              </div>
              <button onClick={handleViewISO45001Details} className="mt-4 w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100">
                Vezi detalii clauze
              </button>
            </div>
          </div>

          {/* ISO 14001 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Leaf className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ISO 14001:2015</h3>
                  <p className="text-sm text-gray-500">Sisteme de management de mediu</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Scor conformitate</span>
                <span className="text-2xl font-bold text-green-600">92%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-green-600 rounded-full" style={{ width: '92%' }} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Clauze conforme</span>
                  <span className="font-medium text-green-600">22/24</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Parțial conforme</span>
                  <span className="font-medium text-yellow-600">2/24</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Neconforme</span>
                  <span className="font-medium text-red-600">0/24</span>
                </div>
              </div>
              <button onClick={handleViewISO14001Details} className="mt-4 w-full bg-green-50 text-green-600 px-4 py-2 rounded-md hover:bg-green-100">
                Vezi detalii clauze
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Training Tab */
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Modulul de instruiri este în dezvoltare</p>
            <p className="text-sm mt-2">Veți putea gestiona instruiri SSM și de mediu</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Acțiuni Rapide HSE</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => handleQuickAction('incident')} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm">Raportare Incident</span>
          </button>
          <button onClick={() => handleQuickAction('risk')} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-sm">Evaluare Risc</span>
          </button>
          <button onClick={() => handleQuickAction('checklist')} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <ClipboardCheck className="h-5 w-5 text-purple-600" />
            <span className="text-sm">Checklist PSSR</span>
          </button>
          <button onClick={() => handleQuickAction('export')} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Download className="h-5 w-5 text-green-600" />
            <span className="text-sm">Export Raport</span>
          </button>
        </div>
      </div>
    </div>
  );
}
