"use client";

import { useState, useMemo } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  DollarSign,
  Building2,
  Wallet,
  CreditCard,
  PiggyBank,
  CircleDollarSign,
} from "lucide-react";

interface CashFlowItem {
  id: string;
  name: string;
  amount: number;
  category: "operating" | "investing" | "financing";
  type: "inflow" | "outflow";
  icon?: React.ReactNode;
}

interface MonthlyCashFlow {
  month: string;
  operating: number;
  investing: number;
  financing: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
}

// Mock data for demonstration
const mockMonthlyData: MonthlyCashFlow[] = [
  { month: "Ian", operating: 45000, investing: -15000, financing: -5000, netCashFlow: 25000, openingBalance: 100000, closingBalance: 125000 },
  { month: "Feb", operating: 38000, investing: -8000, financing: -5000, netCashFlow: 25000, openingBalance: 125000, closingBalance: 150000 },
  { month: "Mar", operating: 52000, investing: -25000, financing: 10000, netCashFlow: 37000, openingBalance: 150000, closingBalance: 187000 },
  { month: "Apr", operating: 41000, investing: -12000, financing: -5000, netCashFlow: 24000, openingBalance: 187000, closingBalance: 211000 },
  { month: "Mai", operating: 55000, investing: -18000, financing: -10000, netCashFlow: 27000, openingBalance: 211000, closingBalance: 238000 },
  { month: "Iun", operating: 48000, investing: -22000, financing: 15000, netCashFlow: 41000, openingBalance: 238000, closingBalance: 279000 },
  { month: "Iul", operating: 35000, investing: -8000, financing: -5000, netCashFlow: 22000, openingBalance: 279000, closingBalance: 301000 },
  { month: "Aug", operating: 32000, investing: -5000, financing: -5000, netCashFlow: 22000, openingBalance: 301000, closingBalance: 323000 },
  { month: "Sep", operating: 58000, investing: -30000, financing: -8000, netCashFlow: 20000, openingBalance: 323000, closingBalance: 343000 },
  { month: "Oct", operating: 62000, investing: -15000, financing: -5000, netCashFlow: 42000, openingBalance: 343000, closingBalance: 385000 },
  { month: "Nov", operating: 54000, investing: -20000, financing: 20000, netCashFlow: 54000, openingBalance: 385000, closingBalance: 439000 },
  { month: "Dec", operating: 68000, investing: -25000, financing: -15000, netCashFlow: 28000, openingBalance: 439000, closingBalance: 467000 },
];

const mockCashFlowItems: CashFlowItem[] = [
  // Operating Activities
  { id: "op1", name: "Încasări de la clienți", amount: 580000, category: "operating", type: "inflow" },
  { id: "op2", name: "Plăți către furnizori", amount: -185000, category: "operating", type: "outflow" },
  { id: "op3", name: "Salarii și contribuții", amount: -210000, category: "operating", type: "outflow" },
  { id: "op4", name: "Impozite și taxe", amount: -65000, category: "operating", type: "outflow" },
  { id: "op5", name: "Dobânzi încasate", amount: 8000, category: "operating", type: "inflow" },
  { id: "op6", name: "Dobânzi plătite", amount: -18000, category: "operating", type: "outflow" },
  { id: "op7", name: "Alte încasări operaționale", amount: 22000, category: "operating", type: "inflow" },

  // Investing Activities
  { id: "inv1", name: "Achiziție echipamente", amount: -85000, category: "investing", type: "outflow" },
  { id: "inv2", name: "Vânzare active fixe", amount: 15000, category: "investing", type: "inflow" },
  { id: "inv3", name: "Investiții financiare", amount: -45000, category: "investing", type: "outflow" },
  { id: "inv4", name: "Dividende primite", amount: 12000, category: "investing", type: "inflow" },

  // Financing Activities
  { id: "fin1", name: "Împrumuturi primite", amount: 80000, category: "financing", type: "inflow" },
  { id: "fin2", name: "Rambursări împrumuturi", amount: -45000, category: "financing", type: "outflow" },
  { id: "fin3", name: "Dividende plătite", amount: -25000, category: "financing", type: "outflow" },
  { id: "fin4", name: "Majorare capital", amount: 50000, category: "financing", type: "inflow" },
];

interface CashFlowChartProps {
  monthlyData?: MonthlyCashFlow[];
  items?: CashFlowItem[];
  year?: number;
  className?: string;
}

// SVG Waterfall Chart Component
function WaterfallChart({ data }: { data: MonthlyCashFlow[] }) {
  const width = 100;
  const height = 60;
  const maxValue = Math.max(...data.map(d => Math.max(d.closingBalance, d.openingBalance)));
  const minValue = Math.min(...data.map(d => Math.min(0, d.netCashFlow)));
  const range = maxValue - minValue;

  const barWidth = (width - (data.length - 1) * 1) / data.length;

  const getY = (value: number) => ((maxValue - value) / range) * height;
  const getHeight = (value: number) => Math.abs(value / range) * height;

  return (
    <svg width="100%" height={height + 20} viewBox={`0 0 ${width} ${height + 20}`} preserveAspectRatio="xMidYMid meet">
      {/* Bars */}
      {data.map((d, i) => {
        const x = i * (barWidth + 1);
        const isPositive = d.netCashFlow >= 0;
        const barHeight = getHeight(d.netCashFlow);
        const y = isPositive ? getY(d.netCashFlow) : getY(0);

        return (
          <g key={d.month}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              fill={isPositive ? "#10b981" : "#ef4444"}
              rx={1}
            />
            {/* Connector line */}
            {i > 0 && (
              <line
                x1={x - 1}
                y1={getY(data[i - 1].closingBalance)}
                x2={x}
                y2={getY(d.openingBalance)}
                stroke="#94a3b8"
                strokeWidth={0.5}
                strokeDasharray="1,1"
              />
            )}
          </g>
        );
      })}

      {/* Month labels */}
      {data.map((d, i) => (
        <text
          key={d.month}
          x={i * (barWidth + 1) + barWidth / 2}
          y={height + 12}
          textAnchor="middle"
          fontSize={4}
          fill="#64748b"
        >
          {d.month}
        </text>
      ))}

      {/* Cumulative line */}
      <polyline
        points={data.map((d, i) => `${i * (barWidth + 1) + barWidth / 2},${getY(d.closingBalance)}`).join(" ")}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.5}
      />

      {/* Points on line */}
      {data.map((d, i) => (
        <circle
          key={`point-${d.month}`}
          cx={i * (barWidth + 1) + barWidth / 2}
          cy={getY(d.closingBalance)}
          r={1.5}
          fill="#3b82f6"
        />
      ))}
    </svg>
  );
}

// Stacked Bar Chart for Categories
function StackedBarChart({ data }: { data: MonthlyCashFlow[] }) {
  const width = 100;
  const height = 60;
  const maxTotal = Math.max(...data.map(d => Math.abs(d.operating) + Math.abs(d.investing) + Math.abs(d.financing)));

  const barWidth = (width - (data.length - 1) * 1) / data.length;

  return (
    <svg width="100%" height={height + 20} viewBox={`0 0 ${width} ${height + 20}`} preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const x = i * (barWidth + 1);

        // Calculate heights
        const opHeight = (Math.abs(d.operating) / maxTotal) * height;
        const invHeight = (Math.abs(d.investing) / maxTotal) * height;
        const finHeight = (Math.abs(d.financing) / maxTotal) * height;

        let currentY = height;

        return (
          <g key={d.month}>
            {/* Operating */}
            <rect
              x={x}
              y={currentY - opHeight}
              width={barWidth}
              height={opHeight}
              fill={d.operating >= 0 ? "#10b981" : "#fecaca"}
              rx={1}
            />
            {/* Investing */}
            <rect
              x={x}
              y={currentY - opHeight - invHeight}
              width={barWidth}
              height={invHeight}
              fill={d.investing >= 0 ? "#3b82f6" : "#bfdbfe"}
              rx={1}
            />
            {/* Financing */}
            <rect
              x={x}
              y={currentY - opHeight - invHeight - finHeight}
              width={barWidth}
              height={finHeight}
              fill={d.financing >= 0 ? "#8b5cf6" : "#ddd6fe"}
              rx={1}
            />
            {/* Month label */}
            <text
              x={x + barWidth / 2}
              y={height + 12}
              textAnchor="middle"
              fontSize={4}
              fill="#64748b"
            >
              {d.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CashFlowChart({
  monthlyData = mockMonthlyData,
  items = mockCashFlowItems,
  year = 2024,
  className = "",
}: CashFlowChartProps) {
  const [viewMode, setViewMode] = useState<"waterfall" | "stacked" | "table">("waterfall");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "operating" | "investing" | "financing">("all");

  // Calculate totals
  const totals = useMemo(() => {
    const operating = items.filter(i => i.category === "operating").reduce((sum, i) => sum + i.amount, 0);
    const investing = items.filter(i => i.category === "investing").reduce((sum, i) => sum + i.amount, 0);
    const financing = items.filter(i => i.category === "financing").reduce((sum, i) => sum + i.amount, 0);
    const netCashFlow = operating + investing + financing;

    const openingBalance = monthlyData[0]?.openingBalance || 0;
    const closingBalance = monthlyData[monthlyData.length - 1]?.closingBalance || 0;

    return { operating, investing, financing, netCashFlow, openingBalance, closingBalance };
  }, [items, monthlyData]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return items;
    return items.filter(i => i.category === selectedCategory);
  }, [items, selectedCategory]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "operating": return <Building2 className="w-5 h-5" />;
      case "investing": return <PiggyBank className="w-5 h-5" />;
      case "financing": return <CreditCard className="w-5 h-5" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "operating": return "text-emerald-600 bg-emerald-50";
      case "investing": return "text-blue-600 bg-blue-50";
      case "financing": return "text-purple-600 bg-purple-50";
      default: return "text-slate-600 bg-slate-50";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Situația Fluxurilor de Numerar</h2>
          <p className="text-slate-500">Anul fiscal {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Sold Inițial</span>
            <Wallet className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {totals.openingBalance.toLocaleString("ro-RO")} <span className="text-base font-normal">lei</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">1 Ianuarie {year}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Flux Net de Numerar</span>
            {totals.netCashFlow >= 0 ? (
              <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <p className={`text-2xl font-bold ${totals.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {totals.netCashFlow >= 0 ? "+" : ""}{totals.netCashFlow.toLocaleString("ro-RO")} <span className="text-base font-normal">lei</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">Total anual</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Sold Final</span>
            <CircleDollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {totals.closingBalance.toLocaleString("ro-RO")} <span className="text-base font-normal">lei</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">31 Decembrie {year}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Variație</span>
            {totals.closingBalance > totals.openingBalance ? (
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
          </div>
          <p className={`text-2xl font-bold ${totals.closingBalance > totals.openingBalance ? "text-emerald-600" : "text-red-600"}`}>
            {totals.openingBalance > 0 ? (((totals.closingBalance - totals.openingBalance) / totals.openingBalance) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-sm text-slate-500 mt-1">Față de sold inițial</p>
        </div>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-xl border-2 cursor-pointer transition ${
            selectedCategory === "operating" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"
          }`}
          onClick={() => setSelectedCategory(selectedCategory === "operating" ? "all" : "operating")}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="font-medium text-slate-900">Activități Operaționale</span>
          </div>
          <p className={`text-2xl font-bold ${totals.operating >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {totals.operating >= 0 ? "+" : ""}{totals.operating.toLocaleString("ro-RO")} lei
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {items.filter(i => i.category === "operating").length} tranzacții
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border-2 cursor-pointer transition ${
            selectedCategory === "investing" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
          }`}
          onClick={() => setSelectedCategory(selectedCategory === "investing" ? "all" : "investing")}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PiggyBank className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium text-slate-900">Activități de Investiții</span>
          </div>
          <p className={`text-2xl font-bold ${totals.investing >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {totals.investing >= 0 ? "+" : ""}{totals.investing.toLocaleString("ro-RO")} lei
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {items.filter(i => i.category === "investing").length} tranzacții
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border-2 cursor-pointer transition ${
            selectedCategory === "financing" ? "border-purple-500 bg-purple-50" : "border-slate-200 bg-white hover:border-purple-300"
          }`}
          onClick={() => setSelectedCategory(selectedCategory === "financing" ? "all" : "financing")}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-medium text-slate-900">Activități de Finanțare</span>
          </div>
          <p className={`text-2xl font-bold ${totals.financing >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {totals.financing >= 0 ? "+" : ""}{totals.financing.toLocaleString("ro-RO")} lei
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {items.filter(i => i.category === "financing").length} tranzacții
          </p>
        </div>
      </div>

      {/* Chart View */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Evoluție Flux de Numerar</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("waterfall")}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                viewMode === "waterfall" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Cascadă
            </button>
            <button
              onClick={() => setViewMode("stacked")}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                viewMode === "stacked" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Stivuit
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Tabel
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          {viewMode === "waterfall" ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600">Flux pozitiv</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-slate-600">Flux negativ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-slate-600">Sold cumulat</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600">Operațional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-slate-600">Investiții</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span className="text-slate-600">Finanțare</span>
              </div>
            </>
          )}
        </div>

        {/* Chart/Table */}
        {viewMode === "waterfall" && (
          <div className="h-48">
            <WaterfallChart data={monthlyData} />
          </div>
        )}

        {viewMode === "stacked" && (
          <div className="h-48">
            <StackedBarChart data={monthlyData} />
          </div>
        )}

        {viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-slate-700">Luna</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-700">Sold Inițial</th>
                  <th className="text-right py-2 px-3 font-medium text-emerald-700">Operațional</th>
                  <th className="text-right py-2 px-3 font-medium text-blue-700">Investiții</th>
                  <th className="text-right py-2 px-3 font-medium text-purple-700">Finanțare</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-700">Flux Net</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-700">Sold Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">{row.month}</td>
                    <td className="py-2 px-3 text-right font-mono">{row.openingBalance.toLocaleString("ro-RO")}</td>
                    <td className={`py-2 px-3 text-right font-mono ${row.operating >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {row.operating >= 0 ? "+" : ""}{row.operating.toLocaleString("ro-RO")}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${row.investing >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      {row.investing >= 0 ? "+" : ""}{row.investing.toLocaleString("ro-RO")}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${row.financing >= 0 ? "text-purple-600" : "text-red-600"}`}>
                      {row.financing >= 0 ? "+" : ""}{row.financing.toLocaleString("ro-RO")}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-medium ${row.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {row.netCashFlow >= 0 ? "+" : ""}{row.netCashFlow.toLocaleString("ro-RO")}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium">{row.closingBalance.toLocaleString("ro-RO")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-semibold">
                <tr>
                  <td className="py-2 px-3">Total</td>
                  <td className="py-2 px-3 text-right font-mono">{totals.openingBalance.toLocaleString("ro-RO")}</td>
                  <td className={`py-2 px-3 text-right font-mono ${totals.operating >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {totals.operating >= 0 ? "+" : ""}{totals.operating.toLocaleString("ro-RO")}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono ${totals.investing >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {totals.investing >= 0 ? "+" : ""}{totals.investing.toLocaleString("ro-RO")}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono ${totals.financing >= 0 ? "text-purple-600" : "text-red-600"}`}>
                    {totals.financing >= 0 ? "+" : ""}{totals.financing.toLocaleString("ro-RO")}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono ${totals.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {totals.netCashFlow >= 0 ? "+" : ""}{totals.netCashFlow.toLocaleString("ro-RO")}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{totals.closingBalance.toLocaleString("ro-RO")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Detalii Tranzacții
            {selectedCategory !== "all" && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({selectedCategory === "operating" ? "Operaționale" : selectedCategory === "investing" ? "Investiții" : "Finanțare"})
              </span>
            )}
          </h3>
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition ${
              selectedCategory !== "all" ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "text-slate-400 cursor-default"
            }`}
            disabled={selectedCategory === "all"}
          >
            <Filter className="w-4 h-4" />
            Resetează filtru
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${getCategoryColor(item.category)}`}>
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    {item.category === "operating" ? "Operațional" : item.category === "investing" ? "Investiții" : "Finanțare"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-semibold ${item.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {item.amount >= 0 ? "+" : ""}{item.amount.toLocaleString("ro-RO")} lei
                </p>
                <p className="text-sm text-slate-500">
                  {item.type === "inflow" ? "Încasare" : "Plată"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Totals */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">
              Total {selectedCategory === "all" ? "general" : selectedCategory === "operating" ? "operațional" : selectedCategory === "investing" ? "investiții" : "finanțare"}
            </span>
            <span className={`text-xl font-bold ${
              filteredItems.reduce((sum, i) => sum + i.amount, 0) >= 0 ? "text-emerald-600" : "text-red-600"
            }`}>
              {filteredItems.reduce((sum, i) => sum + i.amount, 0) >= 0 ? "+" : ""}
              {filteredItems.reduce((sum, i) => sum + i.amount, 0).toLocaleString("ro-RO")} lei
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
