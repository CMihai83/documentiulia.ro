'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Sliders, Save, Trash2, RefreshCw, TrendingUp, TrendingDown, Copy, Play } from 'lucide-react';
import { ScenarioVariable, CashFlowDataPoint } from '@/lib/mockCashFlowData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CashFlowScenarioBuilderProps {
  baseData: CashFlowDataPoint[];
  variables: ScenarioVariable[];
}

interface Scenario {
  id: string;
  name: string;
  variables: Record<string, number>;
  createdAt: Date;
}

export function CashFlowScenarioBuilder({ baseData, variables }: CashFlowScenarioBuilderProps) {
  const toast = useToast();
  const [scenarioVariables, setScenarioVariables] = useState<Record<string, number>>(
    variables.reduce((acc, v) => ({ ...acc, [v.id]: v.currentValue }), {})
  );
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  // Calculate scenario impact on data
  const scenarioData: CashFlowDataPoint[] = useMemo(() => {
    const predictedData = baseData.filter((d) => d.isPredicted);

    return predictedData.map((point, index): CashFlowDataPoint => {
      const monthsOut = index + 1;

      // Apply revenue growth
      const revenueGrowth = scenarioVariables['revenue-growth'] || 0;
      const cumulativeRevenueGrowth = Math.pow(1 + revenueGrowth / 100, monthsOut / 6);
      let inflow = point.inflow * cumulativeRevenueGrowth;

      // Apply new contract
      const newContract = scenarioVariables['new-contract'] || 0;
      inflow += newContract;

      // Apply expense increase
      const expenseIncrease = scenarioVariables['expense-increase'] || 0;
      const cumulativeExpenseIncrease = Math.pow(1 + expenseIncrease / 100, monthsOut / 6);
      let outflow = point.outflow * cumulativeExpenseIncrease;

      // Apply one-time expense (only in first month)
      const oneTimeExpense = scenarioVariables['one-time-expense'] || 0;
      if (index === 0) {
        outflow += oneTimeExpense;
      }

      // Apply payment delay (reduces inflow in early months)
      const paymentDelay = scenarioVariables['payment-delay'] || 30;
      const delayFactor = Math.max(0.5, 1 - (paymentDelay - 30) / 200); // 30 days is baseline
      inflow *= delayFactor;

      // Calculate balance
      const previousBalance: number = index === 0 ? baseData[baseData.length - 1].balance : (predictedData[index - 1].balance || baseData[baseData.length - 1].balance);
      const balance: number = previousBalance + inflow - outflow;

      return {
        ...point,
        inflow: Math.round(inflow),
        outflow: Math.round(outflow),
        balance: Math.round(balance),
      };
    });
  }, [baseData, scenarioVariables]);

  // Get all comparison data
  const comparisonData = useMemo(() => {
    if (!compareMode || selectedScenarios.length === 0) return [];

    const baseScenario = baseData.filter((d) => d.isPredicted);
    const scenarios = savedScenarios.filter((s) => selectedScenarios.includes(s.id));

    return baseScenario.map((point, index) => {
      const dataPoint: any = {
        month: point.month,
        base: point.balance,
      };

      scenarios.forEach((scenario) => {
        // Recalculate balance for this scenario
        const vars = scenario.variables;
        const monthsOut = index + 1;

        const revenueGrowth = Math.pow(1 + (vars['revenue-growth'] || 0) / 100, monthsOut / 6);
        let inflow = point.inflow * revenueGrowth + (vars['new-contract'] || 0);

        const expenseIncrease = Math.pow(1 + (vars['expense-increase'] || 0) / 100, monthsOut / 6);
        let outflow = point.outflow * expenseIncrease;
        if (index === 0) outflow += vars['one-time-expense'] || 0;

        const delayFactor = Math.max(0.5, 1 - ((vars['payment-delay'] || 30) - 30) / 200);
        inflow *= delayFactor;

        const previousBalance = index === 0 ? baseData[baseData.length - 1].balance : dataPoint.base;
        dataPoint[scenario.name] = Math.round(previousBalance + inflow - outflow);
      });

      return dataPoint;
    });
  }, [compareMode, selectedScenarios, savedScenarios, baseData]);

  const handleVariableChange = (id: string, value: number) => {
    setScenarioVariables((prev) => ({ ...prev, [id]: value }));
  };

  const resetVariables = () => {
    setScenarioVariables(variables.reduce((acc, v) => ({ ...acc, [v.id]: v.currentValue }), {}));
  };

  const saveScenario = () => {
    if (!scenarioName.trim()) {
      toast.error('Nume necesar', 'Introduceți un nume pentru scenariu');
      return;
    }

    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: scenarioName,
      variables: { ...scenarioVariables },
      createdAt: new Date(),
    };

    setSavedScenarios((prev) => [...prev, newScenario]);
    setScenarioName('');
    toast.success('Scenariu salvat', `Scenariul "${scenarioName}" a fost salvat.`);
  };

  const deleteScenario = (id: string) => {
    setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
    setSelectedScenarios((prev) => prev.filter((sid) => sid !== id));
  };

  const loadScenario = (scenario: Scenario) => {
    setScenarioVariables({ ...scenario.variables });
    setScenarioName(scenario.name);
  };

  const toggleScenarioComparison = (id: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate impact summary
  const impactSummary = useMemo(() => {
    const baseBalance = baseData[baseData.length - 1].balance;
    const scenarioBalance = scenarioData[scenarioData.length - 1]?.balance || baseBalance;
    const difference = scenarioBalance - baseBalance;
    const percentChange = (difference / baseBalance) * 100;

    return {
      baseBalance,
      scenarioBalance,
      difference,
      percentChange,
    };
  }, [baseData, scenarioData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Scenario Builder - What If?</h3>
        </div>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`px-4 py-2 rounded-lg border transition flex items-center gap-2 ${
            compareMode
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Copy className="w-4 h-4" />
          {compareMode ? 'Mod comparație activ' : 'Compară scenarii'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Variable Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Parametri Scenariu
            </h4>

            <div className="space-y-4">
              {variables.map((variable) => {
                const value = scenarioVariables[variable.id] || variable.currentValue;
                const isChanged = value !== variable.currentValue;

                return (
                  <div key={variable.id} className={`pb-4 border-b border-gray-100 last:border-0 ${isChanged ? 'bg-blue-50 -mx-4 px-4 py-3 rounded-lg' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">{variable.name}</label>
                      <span className={`text-sm font-bold ${isChanged ? 'text-blue-600' : 'text-gray-900'}`}>
                        {value} {variable.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={variable.min}
                      max={variable.max}
                      step={variable.unit === '%' ? 1 : 1000}
                      value={value}
                      onChange={(e) => handleVariableChange(variable.id, Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{variable.min}{variable.unit}</span>
                      <span>{variable.max}{variable.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={resetVariables}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Save Scenario */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Salvează Scenariu</h4>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Nume scenariu..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-2"
            />
            <button
              onClick={saveScenario}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvează
            </button>
          </div>

          {/* Saved Scenarios */}
          {savedScenarios.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Scenarii Salvate ({savedScenarios.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`p-3 rounded-lg border transition ${
                      selectedScenarios.includes(scenario.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900">{scenario.name}</span>
                      <div className="flex gap-1">
                        {compareMode && (
                          <button
                            onClick={() => toggleScenarioComparison(scenario.id)}
                            className={`p-1 rounded ${
                              selectedScenarios.includes(scenario.id)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            title="Compară"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => loadScenario(scenario)}
                          className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                          title="Încarcă"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteScenario(scenario.id)}
                          className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          title="Șterge"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(scenario.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Impact Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Impact Proiectat (6 luni)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Sold Bază</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(impactSummary.baseBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Sold Scenariu</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(impactSummary.scenarioBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Diferență</p>
                <div className="flex items-center gap-2">
                  {impactSummary.difference >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className={`text-2xl font-bold ${impactSummary.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {impactSummary.difference >= 0 ? '+' : ''}
                      {formatCurrency(impactSummary.difference)}
                    </p>
                    <p className={`text-sm ${impactSummary.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {impactSummary.percentChange >= 0 ? '+' : ''}
                      {impactSummary.percentChange.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="font-semibold text-gray-900 mb-4">
              {compareMode && selectedScenarios.length > 0 ? 'Comparație Scenarii' : 'Previziune Scenariu'}
            </h4>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={compareMode && selectedScenarios.length > 0 ? comparisonData : scenarioData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {compareMode && selectedScenarios.length > 0 ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="base"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        name="Bază"
                        strokeDasharray="5 5"
                        dot={{ r: 3 }}
                      />
                      {savedScenarios
                        .filter((s) => selectedScenarios.includes(s.id))
                        .map((scenario, index) => {
                          const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
                          return (
                            <Line
                              key={scenario.id}
                              type="monotone"
                              dataKey={scenario.name}
                              stroke={colors[index % colors.length]}
                              strokeWidth={2}
                              name={scenario.name}
                              dot={{ r: 4 }}
                            />
                          );
                        })}
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Sold Previzionat"
                      dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
