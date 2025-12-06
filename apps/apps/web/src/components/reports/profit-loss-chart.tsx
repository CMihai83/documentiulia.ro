"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
} from "lucide-react";

// Time periods
const TIME_PERIODS = [
  { value: "month", label: "Lunar" },
  { value: "quarter", label: "Trimestrial" },
  { value: "year", label: "Anual" },
  { value: "custom", label: "Personalizat" },
];

// Chart types
const CHART_TYPES = [
  { value: "bar", label: "Bare", icon: BarChart3 },
  { value: "line", label: "Linie", icon: LineChart },
  { value: "area", label: "Arie", icon: PieChart },
];

interface ProfitLossData {
  period: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  interestExpense: number;
  otherIncome: number;
  taxExpense: number;
  netIncome: number;
}

interface ProfitLossChartProps {
  data?: ProfitLossData[];
  currency?: string;
  showComparison?: boolean;
  comparisonData?: ProfitLossData[];
  onExport?: (format: "pdf" | "excel" | "csv") => void;
}

// Demo data for 12 months
const generateDemoData = (): ProfitLossData[] => {
  const months = [
    "Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
    "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return months.map((month, index) => {
    const baseRevenue = 80000 + Math.random() * 40000 + index * 2000;
    const costOfGoodsSold = baseRevenue * (0.35 + Math.random() * 0.1);
    const grossProfit = baseRevenue - costOfGoodsSold;
    const operatingExpenses = 15000 + Math.random() * 8000;
    const operatingIncome = grossProfit - operatingExpenses;
    const interestExpense = 1000 + Math.random() * 500;
    const otherIncome = Math.random() * 2000;
    const taxExpense = Math.max(0, (operatingIncome - interestExpense + otherIncome) * 0.16);
    const netIncome = operatingIncome - interestExpense + otherIncome - taxExpense;

    return {
      period: month,
      revenue: Math.round(baseRevenue),
      costOfGoodsSold: Math.round(costOfGoodsSold),
      grossProfit: Math.round(grossProfit),
      operatingExpenses: Math.round(operatingExpenses),
      operatingIncome: Math.round(operatingIncome),
      interestExpense: Math.round(interestExpense),
      otherIncome: Math.round(otherIncome),
      taxExpense: Math.round(taxExpense),
      netIncome: Math.round(netIncome),
    };
  });
};

function formatCurrency(amount: number, currency: string = "RON"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Simple SVG Bar Chart
function BarChartSVG({ data, maxValue, color }: { data: number[]; maxValue: number; color: string }) {
  const width = 100;
  const height = 60;
  const barWidth = (width - (data.length - 1) * 2) / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {data.map((value, index) => {
        const barHeight = (value / maxValue) * height;
        const x = index * (barWidth + 2);
        const y = height - barHeight;
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={color}
            rx={1}
            className="opacity-80 hover:opacity-100 transition-opacity"
          />
        );
      })}
    </svg>
  );
}

// Simple SVG Line Chart
function LineChartSVG({ data, maxValue, color }: { data: number[]; maxValue: number; color: string }) {
  const width = 100;
  const height = 60;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value / maxValue) * (height - padding * 2));
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polygon fill={color} fillOpacity="0.1" points={areaPoints} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - padding - ((value / maxValue) * (height - padding * 2));
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            className="opacity-0 hover:opacity-100 transition-opacity"
          />
        );
      })}
    </svg>
  );
}

export function ProfitLossChart({
  data = generateDemoData(),
  currency = "RON",
  showComparison = true,
  comparisonData,
  onExport,
}: ProfitLossChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("year");
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar");
  const [selectedMetric, setSelectedMetric] = useState<"revenue" | "netIncome" | "grossProfit">("netIncome");

  // Calculate totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, item) => ({
        revenue: acc.revenue + item.revenue,
        costOfGoodsSold: acc.costOfGoodsSold + item.costOfGoodsSold,
        grossProfit: acc.grossProfit + item.grossProfit,
        operatingExpenses: acc.operatingExpenses + item.operatingExpenses,
        operatingIncome: acc.operatingIncome + item.operatingIncome,
        netIncome: acc.netIncome + item.netIncome,
        taxExpense: acc.taxExpense + item.taxExpense,
      }),
      {
        revenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        operatingIncome: 0,
        netIncome: 0,
        taxExpense: 0,
      }
    );
  }, [data]);

  // Previous period totals for comparison
  const previousTotals = useMemo(() => {
    if (!comparisonData) {
      // Generate mock previous year data (10% less)
      return {
        revenue: totals.revenue * 0.9,
        grossProfit: totals.grossProfit * 0.88,
        netIncome: totals.netIncome * 0.85,
      };
    }
    return comparisonData.reduce(
      (acc, item) => ({
        revenue: acc.revenue + item.revenue,
        grossProfit: acc.grossProfit + item.grossProfit,
        netIncome: acc.netIncome + item.netIncome,
      }),
      { revenue: 0, grossProfit: 0, netIncome: 0 }
    );
  }, [comparisonData, totals]);

  // Chart data based on selected metric
  const chartData = useMemo(() => {
    return data.map((item) => item[selectedMetric]);
  }, [data, selectedMetric]);

  const maxChartValue = Math.max(...chartData) * 1.1;

  // Profit margin
  const profitMargin = totals.revenue > 0 ? (totals.netIncome / totals.revenue) * 100 : 0;
  const grossMargin = totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Profit și Pierdere</h2>
              <p className="text-sm text-slate-500">Anul 2025</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {TIME_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>

            {/* Export Button */}
            <button
              onClick={() => onExport?.("pdf")}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Venituri Totale</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(totals.revenue, currency)}
            </p>
            {showComparison && (
              <div className="flex items-center gap-1 mt-1">
                {calculateChange(totals.revenue, previousTotals.revenue) >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span
                  className={`text-sm font-medium ${
                    calculateChange(totals.revenue, previousTotals.revenue) >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {calculateChange(totals.revenue, previousTotals.revenue).toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">vs. an anterior</span>
              </div>
            )}
          </div>

          {/* Gross Profit */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Profit Brut</span>
              <span className="text-xs text-slate-400">{grossMargin.toFixed(1)}% marjă</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(totals.grossProfit, currency)}
            </p>
            {showComparison && (
              <div className="flex items-center gap-1 mt-1">
                {calculateChange(totals.grossProfit, previousTotals.grossProfit) >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span
                  className={`text-sm font-medium ${
                    calculateChange(totals.grossProfit, previousTotals.grossProfit) >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {calculateChange(totals.grossProfit, previousTotals.grossProfit).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Operating Expenses */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Cheltuieli Operaționale</span>
              <TrendingDown className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.operatingExpenses, currency)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {((totals.operatingExpenses / totals.revenue) * 100).toFixed(1)}% din venituri
            </p>
          </div>

          {/* Net Income */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-emerald-700">Profit Net</span>
              <span className="text-xs text-emerald-600">{profitMargin.toFixed(1)}% marjă</span>
            </div>
            <p className={`text-2xl font-bold ${totals.netIncome >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatCurrency(totals.netIncome, currency)}
            </p>
            {showComparison && (
              <div className="flex items-center gap-1 mt-1">
                {calculateChange(totals.netIncome, previousTotals.netIncome) >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span
                  className={`text-sm font-medium ${
                    calculateChange(totals.netIncome, previousTotals.netIncome) >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {calculateChange(totals.netIncome, previousTotals.netIncome).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-6">
        {/* Chart Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMetric("revenue")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                selectedMetric === "revenue"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Venituri
            </button>
            <button
              onClick={() => setSelectedMetric("grossProfit")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                selectedMetric === "grossProfit"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Profit Brut
            </button>
            <button
              onClick={() => setSelectedMetric("netIncome")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                selectedMetric === "netIncome"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Profit Net
            </button>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {CHART_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setChartType(type.value as "bar" | "line" | "area")}
                  className={`p-2 rounded-md transition ${
                    chartType === type.value
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  title={type.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <div className="h-48 mb-4">
          {chartType === "bar" ? (
            <BarChartSVG
              data={chartData}
              maxValue={maxChartValue}
              color={selectedMetric === "netIncome" ? "#10B981" : "#3B82F6"}
            />
          ) : (
            <LineChartSVG
              data={chartData}
              maxValue={maxChartValue}
              color={selectedMetric === "netIncome" ? "#10B981" : "#3B82F6"}
            />
          )}
        </div>

        {/* X-axis Labels */}
        <div className="flex justify-between text-xs text-slate-400 px-1">
          {data.map((item) => (
            <span key={item.period}>{item.period}</span>
          ))}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="p-6 border-t bg-slate-50 rounded-b-xl">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Detaliere</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-600">Venituri din vânzări</span>
            <span className="text-sm font-medium text-slate-900">
              {formatCurrency(totals.revenue, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-slate-200">
            <span className="text-sm text-slate-500">(-) Cost bunuri vândute</span>
            <span className="text-sm text-red-600">
              {formatCurrency(totals.costOfGoodsSold, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 bg-slate-100 px-3 rounded">
            <span className="text-sm font-medium text-slate-700">= Profit Brut</span>
            <span className="text-sm font-medium text-slate-900">
              {formatCurrency(totals.grossProfit, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-slate-200">
            <span className="text-sm text-slate-500">(-) Cheltuieli operaționale</span>
            <span className="text-sm text-red-600">
              {formatCurrency(totals.operatingExpenses, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 bg-slate-100 px-3 rounded">
            <span className="text-sm font-medium text-slate-700">= Profit Operațional</span>
            <span className="text-sm font-medium text-slate-900">
              {formatCurrency(totals.operatingIncome, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-slate-200">
            <span className="text-sm text-slate-500">(-) Impozit pe profit (16%)</span>
            <span className="text-sm text-red-600">
              {formatCurrency(totals.taxExpense, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 bg-emerald-100 px-3 rounded-lg mt-2">
            <span className="text-sm font-bold text-emerald-800">= Profit Net</span>
            <span className="text-lg font-bold text-emerald-700">
              {formatCurrency(totals.netIncome, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
