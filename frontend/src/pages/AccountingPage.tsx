import React, { useState } from 'react';
import { Calculator, FileText, TrendingUp, BarChart3, Download, Calendar } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';

const AccountingPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reports = [
    {
      id: 'profit-loss',
      name: 'Profit & Loss',
      description: 'Raport de profit și pierdere - Venituri și cheltuieli',
      icon: TrendingUp,
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 'balance-sheet',
      name: 'Bilanț',
      description: 'Situația financiară - Active, Pasive, Capitaluri',
      icon: BarChart3,
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow',
      description: 'Flux de numerar - Intrări și ieșiri de bani',
      icon: TrendingUp,
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      id: 'trial-balance',
      name: 'Balanță de Verificare',
      description: 'Sold conturi și verificare echilibru contabil',
      icon: Calculator,
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      id: 'general-ledger',
      name: 'Registru General',
      description: 'Toate tranzacțiile contabile înregistrate',
      icon: FileText,
      color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'accounts-receivable',
      name: 'Conturi de Încasat',
      description: 'Facturi de încasat de la clienți',
      icon: FileText,
      color: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
      iconColor: 'text-pink-600',
    },
    {
      id: 'accounts-payable',
      name: 'Conturi de Plătit',
      description: 'Facturi de plătit către furnizori',
      icon: FileText,
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      id: 'tax-summary',
      name: 'Rezumat Taxe',
      description: 'TVA, impozite și contribuții',
      icon: Calculator,
      color: 'bg-red-50 border-red-200 hover:bg-red-100',
      iconColor: 'text-red-600',
    },
  ];

  const quickActions = [
    { name: 'Export în Excel', icon: Download, action: 'export-excel' },
    { name: 'Export în PDF', icon: Download, action: 'export-pdf' },
    { name: 'Programare Raport', icon: Calendar, action: 'schedule' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contabilitate</h1>
          <p className="text-gray-600 mt-1">Rapoarte și analize contabile complete</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Venituri Luna Curentă</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">0 RON</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cheltuieli Luna Curentă</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">0 RON</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-600 transform rotate-180" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit Net</p>
                <p className="text-2xl font-bold text-green-600 mt-1">0 RON</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Calculator className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sold Cash</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">0 RON</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rapoarte Disponibile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`
                    p-6 border-2 rounded-lg transition-all text-left
                    ${selectedReport === report.id ? 'ring-2 ring-primary-500' : ''}
                    ${report.color}
                  `}
                >
                  <Icon className={`w-8 h-8 ${report.iconColor} mb-3`} />
                  <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Report Actions */}
        {selectedReport && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {reports.find((r) => r.id === selectedReport)?.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {reports.find((r) => r.id === selectedReport)?.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Date Range Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Început
                </label>
                <input
                  type="date"
                  className="input w-full"
                  defaultValue={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Sfârșit
                </label>
                <input
                  type="date"
                  className="input w-full"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perioada Rapidă
                </label>
                <select className="input w-full">
                  <option>Luna Curentă</option>
                  <option>Trimestru Curent</option>
                  <option>An Curent</option>
                  <option>Luna Trecută</option>
                  <option>Anul Trecut</option>
                </select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 border-t border-gray-200 pt-6">
              <button className="btn-primary flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Generează Raport
              </button>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.action}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Icon className="w-5 h-5" />
                    {action.name}
                  </button>
                );
              })}
            </div>

            {/* Report Preview Placeholder */}
            <div className="mt-6 p-8 bg-gray-50 rounded-lg text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Apăsați "Generează Raport" pentru a vizualiza datele</p>
            </div>
          </div>
        )}

        {/* Information Card */}
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Informații Contabilitate</h3>
              <p className="text-sm text-gray-600 mb-3">
                Toate rapoartele sunt generate în timp real pe baza datelor din sistem.
                Puteți exporta rapoartele în format Excel sau PDF pentru arhivare sau partajare.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Rapoartele sunt conforme cu standardele IFRS</li>
                <li>• Date actualizate în timp real</li>
                <li>• Export disponibil în multiple formate</li>
                <li>• Posibilitate de programare rapoarte recurente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AccountingPage;
