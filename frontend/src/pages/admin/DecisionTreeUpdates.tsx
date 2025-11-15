import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface UpdatePoint {
  id: number;
  tree_name: string;
  tree_key: string;
  data_point_name: string;
  current_value: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  update_category: string;
  next_verification_due: string;
  days_overdue?: number;
  last_verified: string | null;
  verification_url: string | null;
  auto_updateable: boolean;
}

interface UpdateStatistic {
  update_category: string;
  criticality: string;
  total_points: number;
  overdue_count: number;
  due_this_week: number;
}

interface Variable {
  id: number;
  variable_key: string;
  variable_name: string;
  current_value: string;
  value_type: string;
  unit: string | null;
  effective_from: string;
  last_verified: string | null;
}

export default function DecisionTreeUpdatesPage() {
  const [overduePoints, setOverduePoints] = useState<UpdatePoint[]>([]);
  const [dueThisWeek, setDueThisWeek] = useState<UpdatePoint[]>([]);
  const [statistics, setStatistics] = useState<UpdateStatistic[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overdue' | 'due' | 'variables' | 'stats'>('overdue');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overdueRes, dueWeekRes, statsRes, varsRes] = await Promise.all([
        fetch('/api/v1/admin/decision-tree-updates.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_overdue_points' })
        }),
        fetch('/api/v1/admin/decision-tree-updates.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_due_this_week' })
        }),
        fetch('/api/v1/admin/decision-tree-updates.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_statistics' })
        }),
        fetch('/api/v1/admin/decision-tree-updates.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_all_variables' })
        })
      ]);

      const overdueData = await overdueRes.json();
      const dueWeekData = await dueWeekRes.json();
      const statsData = await statsRes.json();
      const varsData = await varsRes.json();

      if (overdueData.success) setOverduePoints(overdueData.overdue_points || []);
      if (dueWeekData.success) setDueThisWeek(dueWeekData.due_points || []);
      if (statsData.success) setStatistics(statsData.statistics || []);
      if (varsData.success) setVariables(varsData.variables || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsVerified = async (pointId: number) => {
    try {
      const res = await fetch('/api/v1/admin/decision-tree-updates.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_verified', point_id: pointId })
      });

      const data = await res.json();
      if (data.success) {
        await fetchAllData(); // Refresh all data
        alert('✅ Marcat ca verificat! Data următoare de verificare a fost calculată automat.');
      }
    } catch (error) {
      console.error('Failed to mark as verified:', error);
      alert('❌ Eroare la marcarea ca verificat');
    }
  };

  const criticalCount = overduePoints.filter(p => p.criticality === 'critical').length;
  const highCount = overduePoints.filter(p => p.criticality === 'high').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Managementul Actualizărilor - Arbori de Decizie
        </h1>
        <p className="text-gray-600">
          Sistem automat de tracking și actualizare a conținutului legislativ
        </p>
      </div>

      {/* Critical Alert */}
      {criticalCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-red-900 text-lg">
                🚨 {criticalCount} Actualizări CRITICE Depășite
              </h2>
              <p className="text-red-700 mt-1">
                Aceste elemente au impact financiar/legal imediat. Vă rugăm verificați URGENT.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Critical Depășite"
          value={criticalCount}
          color="red"
          icon={<AlertCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="Prioritate Înaltă"
          value={highCount}
          color="orange"
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <MetricCard
          title="De Verificat Săptămâna Aceasta"
          value={dueThisWeek.length}
          color="yellow"
          icon={<Clock className="w-6 h-6" />}
        />
        <MetricCard
          title="Variabile Active"
          value={variables.length}
          color="green"
          icon={<CheckCircle className="w-6 h-6" />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <TabButton
            active={activeTab === 'overdue'}
            onClick={() => setActiveTab('overdue')}
            label="Depășite"
            count={overduePoints.length}
          />
          <TabButton
            active={activeTab === 'due'}
            onClick={() => setActiveTab('due')}
            label="De Verificat Curând"
            count={dueThisWeek.length}
          />
          <TabButton
            active={activeTab === 'variables'}
            onClick={() => setActiveTab('variables')}
            label="Variabile"
            count={variables.length}
          />
          <TabButton
            active={activeTab === 'stats'}
            onClick={() => setActiveTab('stats')}
            label="Statistici"
          />
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overdue' && (
        <UpdatePointsTable
          points={overduePoints}
          title="Verificări Depășite"
          onMarkVerified={markAsVerified}
          showOverdue={true}
        />
      )}

      {activeTab === 'due' && (
        <UpdatePointsTable
          points={dueThisWeek}
          title="De Verificat în Următoarele 7 Zile"
          onMarkVerified={markAsVerified}
          showOverdue={false}
        />
      )}

      {activeTab === 'variables' && (
        <VariablesTable variables={variables} />
      )}

      {activeTab === 'stats' && (
        <StatisticsView statistics={statistics} />
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, color, icon }: {
  title: string;
  value: number;
  color: 'red' | 'orange' | 'yellow' | 'green';
  icon: React.ReactNode;
}) {
  const colors = {
    red: 'bg-red-100 text-red-900 border-red-200',
    orange: 'bg-orange-100 text-orange-900 border-orange-200',
    yellow: 'bg-yellow-100 text-yellow-900 border-yellow-200',
    green: 'bg-green-100 text-green-900 border-green-200'
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-4xl font-bold">{value}</div>
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, label, count }: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-4 px-1 border-b-2 font-medium text-sm ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Update Points Table Component
function UpdatePointsTable({
  points,
  title,
  onMarkVerified,
  showOverdue
}: {
  points: UpdatePoint[];
  title: string;
  onMarkVerified: (id: number) => void;
  showOverdue: boolean;
}) {
  if (points.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          ✅ Toate la Zi!
        </h3>
        <p className="text-gray-600">
          {showOverdue
            ? 'Nu există verificări depășite.'
            : 'Nu există verificări programate pentru următoarele 7 zile.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioritate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arbore</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Punct de Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valoare Curentă</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {showOverdue ? 'Zile Depășite' : 'Scadență'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {points.map(point => (
              <tr key={point.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <CriticalityBadge level={point.criticality} />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{point.tree_name}</div>
                  <div className="text-xs text-gray-500">{point.update_category}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{point.data_point_name}</div>
                  {point.auto_updateable && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      Auto-Update
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{point.current_value}</code>
                </td>
                <td className="px-6 py-4">
                  {showOverdue ? (
                    <span className="text-red-600 font-bold">{point.days_overdue} zile</span>
                  ) : (
                    <span className="text-sm text-gray-900">{point.next_verification_due}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onMarkVerified(point.id)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    ✓ Marchează Verificat
                  </button>
                  {point.verification_url && (
                    <a
                      href={point.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline text-sm"
                    >
                      Sursă →
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Criticality Badge Component
function CriticalityBadge({ level }: { level: string }) {
  type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low';

  const badges: Record<CriticalityLevel, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const labels: Record<CriticalityLevel, string> = {
    critical: 'CRITIC',
    high: 'ÎNALT',
    medium: 'MEDIU',
    low: 'SCĂZUT'
  };

  const validLevel = (level as CriticalityLevel) in badges ? (level as CriticalityLevel) : 'low';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${badges[validLevel]}`}>
      {labels[validLevel]}
    </span>
  );
}

// Variables Table Component
function VariablesTable({ variables }: { variables: Variable[] }) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">Variabile Legislație ({variables.length})</h2>
        <p className="text-sm text-gray-600 mt-1">
          Valori dinamice folosite în arborii de decizie. Modificarea acestora actualizează automat toate răspunsurile legate.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cheie Variabilă</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nume</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valoare</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efectiv Din</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {variables.map(variable => (
              <tr key={variable.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <code className="text-sm bg-blue-50 text-blue-900 px-2 py-1 rounded">
                    {'{{'}{variable.variable_key}{'}}'}
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{variable.variable_name}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {variable.current_value} {variable.unit}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {variable.value_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{variable.effective_from}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Statistics View Component
function StatisticsView({ statistics }: { statistics: UpdateStatistic[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Statistici pe Categorie</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statistics.map((stat, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 capitalize">{stat.update_category}</h3>
                <CriticalityBadge level={stat.criticality} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Puncte:</span>
                  <span className="font-semibold">{stat.total_points}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Depășite:</span>
                  <span className={`font-semibold ${stat.overdue_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stat.overdue_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Săptămâna Aceasta:</span>
                  <span className="font-semibold">{stat.due_this_week}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
