'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Plus,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Eye,
  Edit,
  MoreVertical,
  Loader2,
  Target,
  Layers,
} from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  type: 'operating' | 'capital' | 'project' | 'departmental';
  fiscalYear: string;
  totalAmount: number;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'closed';
  departmentName?: string;
  utilizationRate: number;
}

interface BudgetCategory {
  name: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

export default function BudgetManagementPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'analytics' | 'scenarios'>('overview');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);

  const [stats, setStats] = useState({
    totalBudget: 0,
    allocated: 0,
    spent: 0,
    remaining: 0,
    utilizationRate: 0,
    activeBudgets: 0,
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setStats({
      totalBudget: 2500000,
      allocated: 2150000,
      spent: 1450000,
      remaining: 700000,
      utilizationRate: 67.4,
      activeBudgets: 5,
    });

    setBudgets([
      { id: '1', name: 'Buget Operațional 2025', type: 'operating', fiscalYear: '2025', totalAmount: 1500000, allocatedAmount: 1350000, spentAmount: 950000, remainingAmount: 400000, status: 'active', utilizationRate: 70.4 },
      { id: '2', name: 'Buget Capital 2025', type: 'capital', fiscalYear: '2025', totalAmount: 500000, allocatedAmount: 400000, spentAmount: 250000, remainingAmount: 150000, status: 'active', utilizationRate: 62.5 },
      { id: '3', name: 'Buget Marketing', type: 'departmental', fiscalYear: '2025', totalAmount: 200000, allocatedAmount: 180000, spentAmount: 120000, remainingAmount: 60000, status: 'active', departmentName: 'Marketing', utilizationRate: 66.7 },
      { id: '4', name: 'Proiect ERP', type: 'project', fiscalYear: '2025', totalAmount: 300000, allocatedAmount: 220000, spentAmount: 130000, remainingAmount: 90000, status: 'approved', utilizationRate: 59.1 },
      { id: '5', name: 'Buget 2026 (Draft)', type: 'operating', fiscalYear: '2026', totalAmount: 1800000, allocatedAmount: 0, spentAmount: 0, remainingAmount: 1800000, status: 'draft', utilizationRate: 0 },
    ]);

    setCategories([
      { name: 'Salarii și beneficii', planned: 800000, actual: 780000, variance: 20000, variancePercent: 2.5 },
      { name: 'Utilități', planned: 120000, actual: 135000, variance: -15000, variancePercent: -12.5 },
      { name: 'Marketing', planned: 200000, actual: 185000, variance: 15000, variancePercent: 7.5 },
      { name: 'IT & Software', planned: 150000, actual: 142000, variance: 8000, variancePercent: 5.3 },
      { name: 'Chirii', planned: 180000, actual: 180000, variance: 0, variancePercent: 0 },
      { name: 'Consultanță', planned: 100000, actual: 28000, variance: 72000, variancePercent: 72 },
    ]);

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<string, string> = {
      draft: 'Draft', pending_approval: 'În aprobare', approved: 'Aprobat', active: 'Activ', closed: 'Închis',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      operating: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      capital: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      project: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      departmental: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    };
    const labels: Record<string, string> = { operating: 'Operațional', capital: 'Capital', project: 'Proiect', departmental: 'Departament' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>{labels[type]}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestiune Bugete</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Planificare și monitorizare bugete</p>
        </div>
        <div className="flex gap-2">
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2026">2026</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Buget Nou
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Buget Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats.totalBudget)}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{stats.activeBudgets} bugete active</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cheltuit</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(stats.spent)}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" /></div>
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${stats.utilizationRate}%` }}></div>
          </div>
          <p className="text-sm text-gray-500 mt-1">{stats.utilizationRate}% utilizare</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Disponibil</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(stats.remaining)}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"><Target className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Din {formatCurrency(stats.allocated)} alocat</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Prognoză Sfârșit An</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">98.2%</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div>
          </div>
          <p className="text-sm text-green-600 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> În limitele bugetului</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {[{ key: 'overview', label: 'Prezentare' }, { key: 'budgets', label: 'Bugete' }, { key: 'analytics', label: 'Analiză' }, { key: 'scenarios', label: 'Scenarii' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="font-semibold text-gray-900 dark:text-white">Bugete Active</h3></div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {budgets.filter(b => b.status === 'active').map(budget => (
                <div key={budget.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{budget.name}</p>
                      <p className="text-xs text-gray-500">{budget.departmentName || budget.type}</p>
                    </div>
                    {getTypeBadge(budget.type)}
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Cheltuit: {formatCurrency(budget.spentAmount)}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{budget.utilizationRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${budget.utilizationRate > 90 ? 'bg-red-500' : budget.utilizationRate > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${budget.utilizationRate}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="font-semibold text-gray-900 dark:text-white">Varianță pe Categorii</h3></div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((cat, i) => (
                <div key={i} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{cat.name}</p>
                    <p className="text-xs text-gray-500">Plan: {formatCurrency(cat.planned)} | Real: {formatCurrency(cat.actual)}</p>
                  </div>
                  <div className={`text-right ${cat.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <p className="font-semibold">{cat.variance >= 0 ? '+' : ''}{formatCurrency(cat.variance)}</p>
                    <p className="text-xs">{cat.variancePercent >= 0 ? '+' : ''}{cat.variancePercent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buget</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cheltuit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disponibil</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilizare</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {budgets.map(budget => (
                  <tr key={budget.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{budget.name}</p>
                      <p className="text-xs text-gray-500">{budget.fiscalYear}</p>
                    </td>
                    <td className="px-4 py-4">{getTypeBadge(budget.type)}</td>
                    <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(budget.totalAmount)}</td>
                    <td className="px-4 py-4 text-right text-orange-600">{formatCurrency(budget.spentAmount)}</td>
                    <td className="px-4 py-4 text-right text-green-600">{formatCurrency(budget.remainingAmount)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${budget.utilizationRate > 90 ? 'bg-red-500' : budget.utilizationRate > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${budget.utilizationRate}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{budget.utilizationRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(budget.status)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Eye className="w-4 h-4 text-gray-500" /></button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit className="w-4 h-4 text-gray-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analiză Bugete</h3>
          <p className="text-gray-500 dark:text-gray-400">Grafice și rapoarte detaliate pentru analiza bugetelor</p>
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scenarii Bugetare</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Creați scenarii best-case, worst-case și most-likely</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Creează Scenariu</button>
        </div>
      )}
    </div>
  );
}
