'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

type StatementType = 'balance-sheet' | 'profit-loss' | 'cash-flow';

interface FinancialStatement {
  type: string;
  period: { startDate: string; endDate: string };
  generatedAt: string;
  data: any;
}

export default function FinancialStatementsPage() {
  const t = useTranslations('accounting');

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<StatementType>('profit-loss');
  const [statement, setStatement] = useState<FinancialStatement | null>(null);

  const now = new Date();
  const [period, setPeriod] = useState({
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchStatement();
  }, [activeTab, period]);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      let url = `/api/v1/accounting/statements/${activeTab}`;
      const params = new URLSearchParams();

      if (activeTab === 'balance-sheet') {
        params.append('asOfDate', period.endDate);
      } else {
        params.append('startDate', period.startDate);
        params.append('endDate', period.endDate);
      }

      const response = await fetch(`${url}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStatement(data);
      }
    } catch (err) {
      console.error('Error fetching statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderBalanceSheet = () => {
    if (!statement?.data) return null;
    const { assets, liabilities, equity, balanced } = statement.data;

    return (
      <div className="space-y-6">
        {/* Balance Check */}
        <div className={`p-4 rounded-lg ${balanced ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`font-medium ${balanced ? 'text-green-800' : 'text-red-800'}`}>
            {balanced ? 'Bilantul este echilibrat (Active = Pasive + Capital)' : 'Bilantul nu este echilibrat!'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              ACTIVE
            </h3>
            <div className="space-y-2">
              {assets.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 border-b">
                  <span className="text-sm">{item.code} - {item.name}</span>
                  <span className="font-medium">{item.value.toLocaleString('ro-RO')} RON</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-bold text-blue-600">
                <span>TOTAL ACTIVE</span>
                <span>{assets.total.toLocaleString('ro-RO')} RON</span>
              </div>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div className="space-y-6">
            {/* Liabilities */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                DATORII
              </h3>
              <div className="space-y-2">
                {liabilities.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2 border-b">
                    <span className="text-sm">{item.code} - {item.name}</span>
                    <span className="font-medium">{item.value.toLocaleString('ro-RO')} RON</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold text-red-600">
                  <span>TOTAL DATORII</span>
                  <span>{liabilities.total.toLocaleString('ro-RO')} RON</span>
                </div>
              </div>
            </div>

            {/* Equity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                CAPITALURI PROPRII
              </h3>
              <div className="space-y-2">
                {equity.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2 border-b">
                    <span className="text-sm">{item.code} - {item.name}</span>
                    <span className="font-medium">{item.value.toLocaleString('ro-RO')} RON</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold text-purple-600">
                  <span>TOTAL CAPITALURI</span>
                  <span>{equity.total.toLocaleString('ro-RO')} RON</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfitLoss = () => {
    if (!statement?.data) return null;
    const { revenues, expenses, netIncome, grossProfit, operatingProfit, profitMargin } = statement.data;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Venituri Totale</p>
            <p className="text-2xl font-bold text-green-600">{revenues.total.toLocaleString('ro-RO')} RON</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Cheltuieli Totale</p>
            <p className="text-2xl font-bold text-red-600">{expenses.total.toLocaleString('ro-RO')} RON</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Profit Net</p>
            <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netIncome.toLocaleString('ro-RO')} RON
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Marja Profit</p>
            <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Revenues */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              VENITURI
            </h3>
            <div className="space-y-2">
              {revenues.items.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nu exista venituri inregistrate</p>
              ) : (
                revenues.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2 border-b">
                    <span className="text-sm">{item.code} - {item.name}</span>
                    <span className="font-medium text-green-600">{item.value.toLocaleString('ro-RO')} RON</span>
                  </div>
                ))
              )}
              <div className="flex justify-between pt-2 font-bold">
                <span>TOTAL VENITURI</span>
                <span className="text-green-600">{revenues.total.toLocaleString('ro-RO')} RON</span>
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              CHELTUIELI
            </h3>
            <div className="space-y-2">
              {expenses.items.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nu exista cheltuieli inregistrate</p>
              ) : (
                expenses.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2 border-b">
                    <span className="text-sm">{item.code} - {item.name}</span>
                    <span className="font-medium text-red-600">{item.value.toLocaleString('ro-RO')} RON</span>
                  </div>
                ))
              )}
              <div className="flex justify-between pt-2 font-bold">
                <span>TOTAL CHELTUIELI</span>
                <span className="text-red-600">{expenses.total.toLocaleString('ro-RO')} RON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Summary */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-sm p-6 text-white">
          <h3 className="font-semibold mb-4">Rezultat Financiar</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-primary-200">Profit Brut:</span>
              <span className="font-bold">{grossProfit.toLocaleString('ro-RO')} RON</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="w-4 h-4" />
              <span className="text-primary-200">Profit Operational:</span>
              <span className="font-bold">{operatingProfit.toLocaleString('ro-RO')} RON</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="w-4 h-4" />
              <span className="text-primary-200">Profit Net:</span>
              <span className="text-xl font-bold">{netIncome.toLocaleString('ro-RO')} RON</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    if (!statement?.data) return null;
    const { operatingActivities, investingActivities, financingActivities, netCashChange } = statement.data;

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className={`p-6 rounded-xl ${netCashChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Variatie Neta Numerar</p>
              <p className={`text-3xl font-bold ${netCashChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netCashChange >= 0 ? '+' : ''}{netCashChange.toLocaleString('ro-RO')} RON
              </p>
            </div>
            <DollarSign className={`w-12 h-12 ${netCashChange >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Operating */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Activitati Operationale
            </h3>
            <div className={`text-2xl font-bold ${operatingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {operatingActivities.total >= 0 ? '+' : ''}{operatingActivities.total.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Flux de numerar din activitati curente
            </p>
          </div>

          {/* Investing */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Activitati de Investitii
            </h3>
            <div className={`text-2xl font-bold ${investingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {investingActivities.total >= 0 ? '+' : ''}{investingActivities.total.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Flux de numerar din investitii
            </p>
          </div>

          {/* Financing */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              Activitati de Finantare
            </h3>
            <div className={`text-2xl font-bold ${financingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {financingActivities.total >= 0 ? '+' : ''}{financingActivities.total.toLocaleString('ro-RO')} RON
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Flux de numerar din finantare
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Situatii Financiare</h1>
          <p className="text-gray-600">Bilant, Cont de Profit si Pierdere, Flux de Numerar</p>
        </div>
        <button
          onClick={fetchStatement}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizeaza
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('profit-loss')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
            activeTab === 'profit-loss' ? 'bg-primary-600 text-white' : 'hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          Cont Profit si Pierdere
        </button>
        <button
          onClick={() => setActiveTab('balance-sheet')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
            activeTab === 'balance-sheet' ? 'bg-primary-600 text-white' : 'hover:bg-gray-100'
          }`}
        >
          <PieChart className="w-5 h-5" />
          Bilant
        </button>
        <button
          onClick={() => setActiveTab('cash-flow')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
            activeTab === 'cash-flow' ? 'bg-primary-600 text-white' : 'hover:bg-gray-100'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          Flux de Numerar
        </button>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex gap-4">
            <div>
              <label className="text-sm text-gray-500">De la</label>
              <input
                type="date"
                value={period.startDate}
                onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                className="ml-2 px-3 py-1 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Pana la</label>
              <input
                type="date"
                value={period.endDate}
                onChange={(e) => setPeriod({ ...period, endDate: e.target.value })}
                className="ml-2 px-3 py-1 border rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statement Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {activeTab === 'balance-sheet' && renderBalanceSheet()}
          {activeTab === 'profit-loss' && renderProfitLoss()}
          {activeTab === 'cash-flow' && renderCashFlow()}
        </>
      )}
    </div>
  );
}
