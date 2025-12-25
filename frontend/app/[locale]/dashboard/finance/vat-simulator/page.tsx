'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Loader2,
  Calendar,
  Building2,
  Lightbulb,
  ArrowRight,
  FileText,
} from 'lucide-react';

interface VatRates {
  current: { standard: number; reduced: number; special: number };
  new: { standard: number; reduced: number; special: number };
  effectiveDate: string;
}

interface IndustryPreset {
  id: string;
  name: string;
  description: string;
  revenueBreakdown: { standardRate: number; reducedRate: number; specialRate: number };
  expenseBreakdown: { standardRate: number; reducedRate: number; specialRate: number; exempt: number };
}

interface SimulationResult {
  currentRates: {
    vatCollected: number;
    vatDeductible: number;
    vatPayable: number;
    effectiveVatRate: number;
  };
  newRates: {
    vatCollected: number;
    vatDeductible: number;
    vatPayable: number;
    effectiveVatRate: number;
  };
  impact: {
    monthlyDifference: number;
    annualDifference: number;
    percentageIncrease: number;
    cashFlowImpact: string;
  };
  recommendations: string[];
  timeline: {
    daysUntilChange: number;
    effectiveDate: string;
    preparationDeadline: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function VatSimulatorPage() {
  const [loading, setLoading] = useState(false);
  const [vatRates, setVatRates] = useState<VatRates | null>(null);
  const [presets, setPresets] = useState<IndustryPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [useInvoiceData, setUseInvoiceData] = useState(false);
  const [invoiceMonths, setInvoiceMonths] = useState(6);

  // Form state
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(50000);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(30000);
  const [revenueBreakdown, setRevenueBreakdown] = useState({
    standardRate: 80,
    reducedRate: 15,
    specialRate: 5,
  });
  const [expenseBreakdown, setExpenseBreakdown] = useState({
    standardRate: 60,
    reducedRate: 20,
    specialRate: 5,
    exempt: 15,
  });
  const [isMicro, setIsMicro] = useState(false);

  const getToken = () => localStorage.getItem('auth_token');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [ratesRes, presetsRes] = await Promise.all([
        fetch(`${API_URL}/finance/vat-simulator/rates`),
        fetch(`${API_URL}/finance/vat-simulator/presets`),
      ]);

      if (ratesRes.ok) {
        setVatRates(await ratesRes.json());
      }
      if (presetsRes.ok) {
        setPresets(await presetsRes.json());
      }
    } catch (error) {
      console.error('Error fetching VAT data:', error);
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setRevenueBreakdown(preset.revenueBreakdown);
      setExpenseBreakdown(preset.expenseBreakdown);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      if (useInvoiceData) {
        const res = await fetch(
          `${API_URL}/finance/vat-simulator/simulate-from-invoices?months=${invoiceMonths}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.error) {
            alert(data.message);
          } else {
            setResult(data);
          }
        }
      } else {
        const res = await fetch(`${API_URL}/finance/vat-simulator/simulate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            monthlyRevenue,
            revenueBreakdown,
            monthlyExpenses,
            expenseBreakdown,
            isMicro,
          }),
        });
        if (res.ok) {
          setResult(await res.json());
        }
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const daysUntilChange = vatRates
    ? Math.ceil((new Date(vatRates.effectiveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-blue-600" />
            Simulator TVA - August 2025
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Simulați impactul modificărilor de TVA (Legea 141/2025) asupra afacerii dumneavoastră
          </p>
        </div>
        {vatRates && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-right">
            <div className="flex items-center gap-2 text-orange-700">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">{daysUntilChange} zile</span>
            </div>
            <p className="text-xs text-orange-600 mt-1">până la intrarea în vigoare</p>
          </div>
        )}
      </div>

      {/* VAT Rate Cards */}
      {vatRates && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Cotele actuale TVA</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Cota standard</span>
                <span className="text-2xl font-bold text-gray-900">{vatRates.current.standard}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Cota redusă</span>
                <span className="text-xl font-semibold text-gray-800">{vatRates.current.reduced}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Cota specială</span>
                <span className="text-xl font-semibold text-gray-800">{vatRates.current.special}%</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-5 border border-blue-200">
            <h3 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Noile cote TVA (din Aug 2025)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-blue-800">Cota standard</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-900">{vatRates.new.standard}%</span>
                  <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                    +{vatRates.new.standard - vatRates.current.standard}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-800">Cota redusă</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-blue-900">{vatRates.new.reduced}%</span>
                  <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                    +{vatRates.new.reduced - vatRates.current.reduced}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-800">Cota specială</span>
                <span className="text-xl font-semibold text-blue-900">{vatRates.new.special}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Data Source Toggle */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sursa datelor</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setUseInvoiceData(false)}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  !useInvoiceData
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Calculator className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="font-medium text-gray-900">Introducere manuală</p>
                <p className="text-xs text-gray-500 mt-1">Introduceți cifrele estimative</p>
              </button>
              <button
                onClick={() => setUseInvoiceData(true)}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  useInvoiceData
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="font-medium text-gray-900">Din facturi</p>
                <p className="text-xs text-gray-500 mt-1">Bazat pe facturile existente</p>
              </button>
            </div>
          </div>

          {!useInvoiceData ? (
            <>
              {/* Industry Presets */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-600" />
                  Preset industrie
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedPreset === preset.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-900 truncate">{preset.name}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Input */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Date financiare lunare</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Revenue Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venituri lunare (RON)
                    </label>
                    <input
                      type="number"
                      value={monthlyRevenue}
                      onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500">Distribuție pe cote TVA:</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Standard ({vatRates?.current.standard}%)</span>
                          <span>{revenueBreakdown.standardRate}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={revenueBreakdown.standardRate}
                          onChange={(e) =>
                            setRevenueBreakdown({ ...revenueBreakdown, standardRate: Number(e.target.value) })
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Redusă ({vatRates?.current.reduced}%)</span>
                          <span>{revenueBreakdown.reducedRate}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={revenueBreakdown.reducedRate}
                          onChange={(e) =>
                            setRevenueBreakdown({ ...revenueBreakdown, reducedRate: Number(e.target.value) })
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Specială ({vatRates?.current.special}%)</span>
                          <span>{revenueBreakdown.specialRate}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={revenueBreakdown.specialRate}
                          onChange={(e) =>
                            setRevenueBreakdown({ ...revenueBreakdown, specialRate: Number(e.target.value) })
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheltuieli lunare (RON)
                    </label>
                    <input
                      type="number"
                      value={monthlyExpenses}
                      onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500">Distribuție pe cote TVA:</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Standard</span>
                          <span>{expenseBreakdown.standardRate}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={expenseBreakdown.standardRate}
                          onChange={(e) =>
                            setExpenseBreakdown({ ...expenseBreakdown, standardRate: Number(e.target.value) })
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Redusă</span>
                          <span>{expenseBreakdown.reducedRate}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={expenseBreakdown.reducedRate}
                          onChange={(e) =>
                            setExpenseBreakdown({ ...expenseBreakdown, reducedRate: Number(e.target.value) })
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Fără TVA (salarii, etc.)</span>
                          <span>{expenseBreakdown.exempt}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={expenseBreakdown.exempt}
                          onChange={(e) =>
                            setExpenseBreakdown({ ...expenseBreakdown, exempt: Number(e.target.value) })
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Micro checkbox */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMicro}
                      onChange={(e) => setIsMicro(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Microîntreprindere</span>
                      <p className="text-xs text-gray-500">Fără drept de deducere TVA</p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Simulare bazată pe facturi existente
              </h3>
              <p className="text-gray-600 mb-4">
                Vom analiza facturile din ultimele luni pentru a calcula impactul real al modificărilor de TVA.
              </p>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Perioada de analiză:</label>
                <select
                  value={invoiceMonths}
                  onChange={(e) => setInvoiceMonths(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={3}>Ultimele 3 luni</option>
                  <option value={6}>Ultimele 6 luni</option>
                  <option value={12}>Ultimele 12 luni</option>
                </select>
              </div>
            </div>
          )}

          {/* Run Button */}
          <button
            onClick={runSimulation}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Se calculează...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                Rulează simularea
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Impact Summary */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Impactul modificărilor</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600">Creștere TVA de plată lunar</p>
                    <p className="text-2xl font-bold text-red-700">
                      +{formatCurrency(result.impact.monthlyDifference)}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-600">Impact anual estimat</p>
                    <p className="text-2xl font-bold text-orange-700">
                      +{formatCurrency(result.impact.annualDifference)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">
                      Creștere de <strong>{result.impact.percentageIncrease.toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparație detaliată</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2"></th>
                      <th className="text-right py-2 text-gray-500">Actual</th>
                      <th className="text-right py-2 text-blue-600">Aug 2025</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2 text-gray-600">TVA colectat</td>
                      <td className="text-right">{formatCurrency(result.currentRates.vatCollected)}</td>
                      <td className="text-right font-medium">{formatCurrency(result.newRates.vatCollected)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">TVA deductibil</td>
                      <td className="text-right">{formatCurrency(result.currentRates.vatDeductible)}</td>
                      <td className="text-right font-medium">{formatCurrency(result.newRates.vatDeductible)}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-2">TVA de plată</td>
                      <td className="text-right">{formatCurrency(result.currentRates.vatPayable)}</td>
                      <td className="text-right text-red-600">{formatCurrency(result.newRates.vatPayable)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Rată efectivă</td>
                      <td className="text-right">{result.currentRates.effectiveVatRate.toFixed(1)}%</td>
                      <td className="text-right font-medium">{result.newRates.effectiveVatRate.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Recommendations */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-5 border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Recomandări
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-green-800">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Termene importante
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Intrare în vigoare</span>
                    <span className="font-medium">{result.timeline.effectiveDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Zile rămase</span>
                    <span className="font-bold text-orange-600">{result.timeline.daysUntilChange} zile</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Deadline pregătire</span>
                    <span className="font-medium text-red-600">{result.timeline.preparationDeadline}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">
                Completați datele și rulați simularea pentru a vedea impactul modificărilor de TVA
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Despre Legea 141/2025</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Cota standard TVA crește de la 19% la 21%</li>
                <li>Cota redusă crește de la 9% la 11%</li>
                <li>Cota specială de 5% rămâne neschimbată</li>
                <li>Modificările intră în vigoare la 1 August 2025</li>
                <li>Afectează toate tranzacțiile impozabile din România</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
