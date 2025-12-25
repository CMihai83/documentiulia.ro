'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Info, Eye, EyeOff } from 'lucide-react';
import { CashFlowDataPoint } from '@/lib/mockCashFlowData';

interface CashFlowForecastProps {
  data: CashFlowDataPoint[];
  historical: CashFlowDataPoint[];
  predictions: CashFlowDataPoint[];
}

type ScenarioType = 'realistic' | 'optimistic' | 'pessimistic';
type ChartView = 'combined' | 'inflow-outflow' | 'balance';

export function CashFlowForecast({ data, historical, predictions }: CashFlowForecastProps) {
  const [scenario, setScenario] = useState<ScenarioType>('realistic');
  const [chartView, setChartView] = useState<ChartView>('combined');
  const [showConfidence, setShowConfidence] = useState(true);

  // Calculate scenario adjustments
  const scenarioData = useMemo(() => {
    return data.map((point) => {
      if (!point.isPredicted) return point;

      let adjustmentFactor = 1;
      switch (scenario) {
        case 'optimistic':
          adjustmentFactor = 1.15; // 15% better
          break;
        case 'pessimistic':
          adjustmentFactor = 0.85; // 15% worse
          break;
        default:
          adjustmentFactor = 1;
      }

      return {
        ...point,
        inflow: Math.round(point.inflow * adjustmentFactor),
        outflow: Math.round(point.outflow / adjustmentFactor),
        balance: Math.round(point.balance * adjustmentFactor),
        confidenceLower: point.confidenceLower ? Math.round(point.confidenceLower * adjustmentFactor) : undefined,
        confidenceUpper: point.confidenceUpper ? Math.round(point.confidenceUpper * adjustmentFactor) : undefined,
      };
    });
  }, [data, scenario]);

  // Format currency for tooltips
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = payload[0].payload;
    const isPredicted = dataPoint.isPredicted;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {isPredicted && (
          <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Previziune AI
          </p>
        )}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
        {isPredicted && showConfidence && dataPoint.confidenceLower && dataPoint.confidenceUpper && (
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
            <p>Interval încredere:</p>
            <p className="flex justify-between">
              <span>Min:</span>
              <span>{formatCurrency(dataPoint.confidenceLower)}</span>
            </p>
            <p className="flex justify-between">
              <span>Max:</span>
              <span>{formatCurrency(dataPoint.confidenceUpper)}</span>
            </p>
          </div>
        )}
      </div>
    );
  };

  // Statistics
  const stats = useMemo(() => {
    const lastHistorical = historical[historical.length - 1];
    const lastPrediction = predictions[predictions.length - 1];
    const avgInflow = historical.reduce((sum, d) => sum + d.inflow, 0) / historical.length;
    const avgOutflow = historical.reduce((sum, d) => sum + d.outflow, 0) / historical.length;
    const projectedChange = lastPrediction.balance - lastHistorical.balance;
    const projectedChangePercent = (projectedChange / lastHistorical.balance) * 100;

    return {
      currentBalance: lastHistorical.balance,
      projectedBalance: lastPrediction.balance,
      projectedChange,
      projectedChangePercent,
      avgInflow,
      avgOutflow,
      avgNetCashFlow: avgInflow - avgOutflow,
    };
  }, [historical, predictions]);

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-700">Sold Curent</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">{formatCurrency(stats.currentBalance)}</div>
          <p className="text-xs text-blue-600 mt-1">Ultima lună istorică</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-700">Previziune 6 luni</span>
            {stats.projectedChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-purple-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-purple-600" />
            )}
          </div>
          <div className="text-2xl font-bold text-purple-900">{formatCurrency(stats.projectedBalance)}</div>
          <p className={`text-xs mt-1 ${stats.projectedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.projectedChange >= 0 ? '+' : ''}
            {formatCurrency(stats.projectedChange)} ({stats.projectedChangePercent.toFixed(1)}%)
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700">Încasări Medii</span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">{formatCurrency(stats.avgInflow)}</div>
          <p className="text-xs text-green-600 mt-1">pe lună (ultimele 12 luni)</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-orange-700">Cheltuieli Medii</span>
            <TrendingDown className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-900">{formatCurrency(stats.avgOutflow)}</div>
          <p className={`text-xs mt-1 ${stats.avgNetCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Net: {formatCurrency(stats.avgNetCashFlow)}/lună
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Scenario Toggle */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Scenariu de Previziune</label>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
              <button
                onClick={() => setScenario('optimistic')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  scenario === 'optimistic'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Optimist
              </button>
              <button
                onClick={() => setScenario('realistic')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  scenario === 'realistic'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Realist
              </button>
              <button
                onClick={() => setScenario('pessimistic')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  scenario === 'pessimistic'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pesimist
              </button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tip Grafic</label>
            <select
              value={chartView}
              onChange={(e) => setChartView(e.target.value as ChartView)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="combined">Combinat (Sold + Fluxuri)</option>
              <option value="balance">Doar Sold</option>
              <option value="inflow-outflow">Doar Încasări & Cheltuieli</option>
            </select>
          </div>

          {/* Confidence Interval Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfidence(!showConfidence)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                showConfidence
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              {showConfidence ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm font-medium">Interval încredere</span>
            </button>
          </div>
        </div>

        {/* Scenario Info */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            {scenario === 'optimistic' && (
              <>
                <span className="font-semibold text-green-600">Scenariu Optimist:</span> Presupune creștere de 15% a
                veniturilor și reducere de 15% a cheltuielilor față de previziunea realistă.
              </>
            )}
            {scenario === 'realistic' && (
              <>
                <span className="font-semibold text-blue-600">Scenariu Realist:</span> Bazat pe analiza trendurilor
                istorice și patternurilor sezoniere detectate de AI.
              </>
            )}
            {scenario === 'pessimistic' && (
              <>
                <span className="font-semibold text-orange-600">Scenariu Pesimist:</span> Presupune scădere de 15% a
                veniturilor și creștere de 15% a cheltuielilor pentru planificare conservatoare.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Previziune Cash Flow
          <span className="text-sm font-normal text-gray-500 ml-2">
            (12 luni istoric + 6 luni previziune)
          </span>
        </h3>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'balance' ? (
              <AreaChart data={scenarioData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine
                  x={historical[historical.length - 1].month}
                  stroke="#6b7280"
                  strokeDasharray="3 3"
                  label={{ value: 'Astăzi', position: 'top', fill: '#6b7280', fontSize: 12 }}
                />
                {showConfidence && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="confidenceUpper"
                      stroke="none"
                      fill="url(#colorConfidence)"
                      name="Interval încredere (max)"
                    />
                    <Area
                      type="monotone"
                      dataKey="confidenceLower"
                      stroke="none"
                      fill="url(#colorConfidence)"
                      name="Interval încredere (min)"
                    />
                  </>
                )}
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorBalance)"
                  name="Sold"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isPredicted) {
                      return <circle cx={cx} cy={cy} r={4} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />;
                    }
                    return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#fff" strokeWidth={2} />;
                  }}
                />
              </AreaChart>
            ) : chartView === 'inflow-outflow' ? (
              <BarChart data={scenarioData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine
                  x={historical[historical.length - 1].month}
                  stroke="#6b7280"
                  strokeDasharray="3 3"
                  label={{ value: 'Astăzi', position: 'top', fill: '#6b7280', fontSize: 12 }}
                />
                <Bar dataKey="inflow" fill="#10b981" name="Încasări" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" fill="#f59e0b" name="Cheltuieli" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={scenarioData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine
                  x={historical[historical.length - 1].month}
                  stroke="#6b7280"
                  strokeDasharray="3 3"
                  label={{ value: 'Astăzi', position: 'top', fill: '#6b7280', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="inflow"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Încasări"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="outflow"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Cheltuieli"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Sold"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isPredicted) {
                      return <circle cx={cx} cy={cy} r={5} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />;
                    }
                    return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" stroke="#fff" strokeWidth={2} />;
                  }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend Explanation */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
            <span>Date istorice</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-white"></div>
            <span>Previziuni AI</span>
          </div>
          {showConfidence && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 bg-purple-100 rounded"></div>
              <span>Interval de încredere (±15-90%)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
