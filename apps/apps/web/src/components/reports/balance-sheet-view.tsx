"use client";

import { useState } from "react";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface BalanceSheetItem {
  id: string;
  name: string;
  code?: string;
  currentValue: number;
  previousValue: number;
  children?: BalanceSheetItem[];
}

interface BalanceSheetData {
  date: string;
  previousDate: string;
  assets: {
    fixed: BalanceSheetItem[];
    current: BalanceSheetItem[];
    totalFixed: number;
    totalCurrent: number;
    total: number;
    previousTotal: number;
  };
  liabilities: {
    equity: BalanceSheetItem[];
    longTerm: BalanceSheetItem[];
    shortTerm: BalanceSheetItem[];
    totalEquity: number;
    totalLongTerm: number;
    totalShortTerm: number;
    total: number;
    previousTotal: number;
  };
}

// Mock data for demonstration
const mockBalanceSheet: BalanceSheetData = {
  date: "31.12.2024",
  previousDate: "31.12.2023",
  assets: {
    fixed: [
      {
        id: "imob",
        name: "Imobilizări necorporale",
        code: "I",
        currentValue: 45000,
        previousValue: 38000,
        children: [
          { id: "software", name: "Licențe software", currentValue: 25000, previousValue: 20000 },
          { id: "brevete", name: "Brevete și mărci", currentValue: 15000, previousValue: 15000 },
          { id: "fond-com", name: "Fond comercial", currentValue: 5000, previousValue: 3000 },
        ],
      },
      {
        id: "imob-corp",
        name: "Imobilizări corporale",
        code: "II",
        currentValue: 320000,
        previousValue: 285000,
        children: [
          { id: "terenuri", name: "Terenuri", currentValue: 120000, previousValue: 120000 },
          { id: "cladiri", name: "Clădiri", currentValue: 150000, previousValue: 130000 },
          { id: "echipamente", name: "Echipamente tehnologice", currentValue: 35000, previousValue: 25000 },
          { id: "mobilier", name: "Mobilier și birotică", currentValue: 15000, previousValue: 10000 },
        ],
      },
      {
        id: "imob-fin",
        name: "Imobilizări financiare",
        code: "III",
        currentValue: 75000,
        previousValue: 60000,
        children: [
          { id: "participatii", name: "Titluri de participare", currentValue: 50000, previousValue: 40000 },
          { id: "creante-imob", name: "Creanțe imobilizate", currentValue: 25000, previousValue: 20000 },
        ],
      },
    ],
    current: [
      {
        id: "stocuri",
        name: "Stocuri",
        code: "I",
        currentValue: 85000,
        previousValue: 72000,
        children: [
          { id: "materii", name: "Materii prime", currentValue: 30000, previousValue: 25000 },
          { id: "produse", name: "Produse finite", currentValue: 40000, previousValue: 35000 },
          { id: "marfuri", name: "Mărfuri", currentValue: 15000, previousValue: 12000 },
        ],
      },
      {
        id: "creante",
        name: "Creanțe",
        code: "II",
        currentValue: 156000,
        previousValue: 134000,
        children: [
          { id: "clienti", name: "Clienți", currentValue: 120000, previousValue: 100000 },
          { id: "debitori", name: "Debitori diverși", currentValue: 20000, previousValue: 18000 },
          { id: "tva-rec", name: "TVA de recuperat", currentValue: 16000, previousValue: 16000 },
        ],
      },
      {
        id: "investitii",
        name: "Investiții pe termen scurt",
        code: "III",
        currentValue: 50000,
        previousValue: 35000,
      },
      {
        id: "disponibil",
        name: "Casa și conturi la bănci",
        code: "IV",
        currentValue: 189000,
        previousValue: 156000,
        children: [
          { id: "casa", name: "Casa în lei", currentValue: 5000, previousValue: 4000 },
          { id: "banci-lei", name: "Conturi curente în lei", currentValue: 150000, previousValue: 130000 },
          { id: "banci-valuta", name: "Conturi în valută", currentValue: 34000, previousValue: 22000 },
        ],
      },
    ],
    totalFixed: 440000,
    totalCurrent: 480000,
    total: 920000,
    previousTotal: 800000,
  },
  liabilities: {
    equity: [
      {
        id: "capital",
        name: "Capital social",
        code: "I",
        currentValue: 200000,
        previousValue: 200000,
      },
      {
        id: "prime",
        name: "Prime de capital",
        code: "II",
        currentValue: 50000,
        previousValue: 50000,
      },
      {
        id: "rezerve",
        name: "Rezerve",
        code: "III",
        currentValue: 180000,
        previousValue: 150000,
        children: [
          { id: "rez-legale", name: "Rezerve legale", currentValue: 40000, previousValue: 35000 },
          { id: "rez-statut", name: "Rezerve statutare", currentValue: 60000, previousValue: 55000 },
          { id: "alte-rez", name: "Alte rezerve", currentValue: 80000, previousValue: 60000 },
        ],
      },
      {
        id: "rezultat",
        name: "Rezultatul exercițiului",
        code: "IV",
        currentValue: 120000,
        previousValue: 95000,
      },
      {
        id: "rezultat-rep",
        name: "Rezultatul reportat",
        code: "V",
        currentValue: 85000,
        previousValue: 70000,
      },
    ],
    longTerm: [
      {
        id: "credite-lt",
        name: "Credite bancare pe termen lung",
        code: "I",
        currentValue: 150000,
        previousValue: 120000,
      },
      {
        id: "leasing",
        name: "Datorii leasing financiar",
        code: "II",
        currentValue: 35000,
        previousValue: 25000,
      },
    ],
    shortTerm: [
      {
        id: "furnizori",
        name: "Furnizori",
        code: "I",
        currentValue: 45000,
        previousValue: 40000,
      },
      {
        id: "credite-st",
        name: "Credite bancare pe termen scurt",
        code: "II",
        currentValue: 20000,
        previousValue: 25000,
      },
      {
        id: "salarii",
        name: "Datorii salariale",
        code: "III",
        currentValue: 18000,
        previousValue: 15000,
      },
      {
        id: "taxe",
        name: "Datorii fiscale",
        code: "IV",
        currentValue: 17000,
        previousValue: 10000,
      },
    ],
    totalEquity: 635000,
    totalLongTerm: 185000,
    totalShortTerm: 100000,
    total: 920000,
    previousTotal: 800000,
  },
};

interface BalanceSheetViewProps {
  data?: BalanceSheetData;
  companyName?: string;
  cui?: string;
  className?: string;
}

// Expandable row component
function BalanceSheetRow({
  item,
  level = 0,
  expandedItems,
  toggleExpand,
}: {
  item: BalanceSheetItem;
  level?: number;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);
  const change = item.currentValue - item.previousValue;
  const changePercent = item.previousValue > 0 ? (change / item.previousValue) * 100 : 0;

  return (
    <>
      <tr
        className={`
          ${level === 0 ? "bg-slate-50 font-medium" : ""}
          ${level === 1 ? "bg-white" : ""}
          hover:bg-blue-50 transition-colors cursor-pointer
        `}
        onClick={() => hasChildren && toggleExpand(item.id)}
      >
        <td className="py-2 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )
            ) : (
              <span className="w-4" />
            )}
            {item.code && (
              <span className="text-xs text-slate-500 font-mono">{item.code}.</span>
            )}
            <span className={level === 0 ? "text-slate-900" : "text-slate-700"}>
              {item.name}
            </span>
          </div>
        </td>
        <td className="py-2 px-4 text-right font-mono">
          {item.currentValue.toLocaleString("ro-RO")} lei
        </td>
        <td className="py-2 px-4 text-right font-mono text-slate-500">
          {item.previousValue.toLocaleString("ro-RO")} lei
        </td>
        <td className="py-2 px-4 text-right">
          <div className="flex items-center justify-end gap-1">
            {change > 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : change < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : null}
            <span
              className={`font-mono text-sm ${
                change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "text-slate-500"
              }`}
            >
              {change > 0 ? "+" : ""}
              {changePercent.toFixed(1)}%
            </span>
          </div>
        </td>
      </tr>
      {hasChildren && isExpanded &&
        item.children!.map((child) => (
          <BalanceSheetRow
            key={child.id}
            item={child}
            level={level + 1}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
          />
        ))}
    </>
  );
}

export function BalanceSheetView({
  data = mockBalanceSheet,
  companyName = "SC Exemplu SRL",
  cui = "12345678",
  className = "",
}: BalanceSheetViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["imob", "imob-corp", "stocuri", "creante", "disponibil", "rezerve"]));
  const [showDetails, setShowDetails] = useState(true);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: BalanceSheetItem[]) => {
      items.forEach((item) => {
        allIds.add(item.id);
        if (item.children) collectIds(item.children);
      });
    };
    collectIds([...data.assets.fixed, ...data.assets.current]);
    collectIds([...data.liabilities.equity, ...data.liabilities.longTerm, ...data.liabilities.shortTerm]);
    setExpandedItems(allIds);
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  // Check if balance sheet is balanced
  const isBalanced = data.assets.total === data.liabilities.total;
  const difference = Math.abs(data.assets.total - data.liabilities.total);

  // Calculate key ratios
  const currentRatio = data.assets.totalCurrent / data.liabilities.totalShortTerm;
  const debtToEquity = (data.liabilities.totalLongTerm + data.liabilities.totalShortTerm) / data.liabilities.totalEquity;
  const workingCapital = data.assets.totalCurrent - data.liabilities.totalShortTerm;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bilanț Contabil</h2>
          <p className="text-slate-500">
            {companyName} • CUI: {cui}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">{data.date}</span>
          </div>
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <Download className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Balance Check Banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-lg ${
          isBalanced ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
        }`}
      >
        {isBalanced ? (
          <>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-emerald-800">
              Bilanțul este echilibrat - Active = Pasive ({data.assets.total.toLocaleString("ro-RO")} lei)
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-800">
              Atenție: Diferență de {difference.toLocaleString("ro-RO")} lei între Active și Pasive
            </span>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Total Active</span>
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data.assets.total.toLocaleString("ro-RO")} <span className="text-base font-normal">lei</span>
          </p>
          <p className="text-sm text-emerald-600 mt-1">
            +{(((data.assets.total - data.assets.previousTotal) / data.assets.previousTotal) * 100).toFixed(1)}% vs. an anterior
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Capitaluri Proprii</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data.liabilities.totalEquity.toLocaleString("ro-RO")} <span className="text-base font-normal">lei</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {((data.liabilities.totalEquity / data.liabilities.total) * 100).toFixed(1)}% din total pasive
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Lichiditate Curentă</span>
            <Info className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {currentRatio.toFixed(2)}
          </p>
          <p
            className={`text-sm mt-1 ${
              currentRatio >= 2 ? "text-emerald-600" : currentRatio >= 1 ? "text-amber-600" : "text-red-600"
            }`}
          >
            {currentRatio >= 2 ? "Foarte bun" : currentRatio >= 1 ? "Acceptabil" : "Sub standard"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Fond de Rulment</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {workingCapital.toLocaleString("ro-RO")} <span className="text-base font-normal">lei</span>
          </p>
          <p className={`text-sm mt-1 ${workingCapital > 0 ? "text-emerald-600" : "text-red-600"}`}>
            {workingCapital > 0 ? "Pozitiv - situație bună" : "Negativ - necesită atenție"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Expandează tot
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Restrânge tot
          </button>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-600">Afișează detalii</span>
        </label>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 px-4 py-3">
          <h3 className="text-lg font-semibold text-white">A. ACTIVE</h3>
        </div>

        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Denumire</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">
                {data.date}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">
                {data.previousDate}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Variație</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Fixed Assets Section */}
            <tr className="bg-blue-50">
              <td colSpan={4} className="py-2 px-4 font-semibold text-blue-800">
                A.I. Active Imobilizate
              </td>
            </tr>
            {data.assets.fixed.map((item) => (
              <BalanceSheetRow
                key={item.id}
                item={item}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            ))}
            <tr className="bg-blue-50 font-semibold">
              <td className="py-2 px-4 text-blue-800">Total Active Imobilizate</td>
              <td className="py-2 px-4 text-right font-mono text-blue-800">
                {data.assets.totalFixed.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {(data.assets.fixed.reduce((sum, item) => sum + item.previousValue, 0)).toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4"></td>
            </tr>

            {/* Current Assets Section */}
            <tr className="bg-emerald-50">
              <td colSpan={4} className="py-2 px-4 font-semibold text-emerald-800">
                A.II. Active Circulante
              </td>
            </tr>
            {data.assets.current.map((item) => (
              <BalanceSheetRow
                key={item.id}
                item={item}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            ))}
            <tr className="bg-emerald-50 font-semibold">
              <td className="py-2 px-4 text-emerald-800">Total Active Circulante</td>
              <td className="py-2 px-4 text-right font-mono text-emerald-800">
                {data.assets.totalCurrent.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {(data.assets.current.reduce((sum, item) => sum + item.previousValue, 0)).toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4"></td>
            </tr>

            {/* Total Assets */}
            <tr className="bg-slate-800 text-white font-bold">
              <td className="py-3 px-4">TOTAL ACTIVE</td>
              <td className="py-3 px-4 text-right font-mono">
                {data.assets.total.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-3 px-4 text-right font-mono text-slate-300">
                {data.assets.previousTotal.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-emerald-400">
                  +{(((data.assets.total - data.assets.previousTotal) / data.assets.previousTotal) * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Liabilities Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-purple-600 px-4 py-3">
          <h3 className="text-lg font-semibold text-white">B. PASIVE (Capitaluri și Datorii)</h3>
        </div>

        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Denumire</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">
                {data.date}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">
                {data.previousDate}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Variație</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Equity Section */}
            <tr className="bg-purple-50">
              <td colSpan={4} className="py-2 px-4 font-semibold text-purple-800">
                B.I. Capitaluri Proprii
              </td>
            </tr>
            {data.liabilities.equity.map((item) => (
              <BalanceSheetRow
                key={item.id}
                item={item}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            ))}
            <tr className="bg-purple-50 font-semibold">
              <td className="py-2 px-4 text-purple-800">Total Capitaluri Proprii</td>
              <td className="py-2 px-4 text-right font-mono text-purple-800">
                {data.liabilities.totalEquity.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {(data.liabilities.equity.reduce((sum, item) => sum + item.previousValue, 0)).toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4"></td>
            </tr>

            {/* Long-term Liabilities Section */}
            <tr className="bg-amber-50">
              <td colSpan={4} className="py-2 px-4 font-semibold text-amber-800">
                B.II. Datorii pe Termen Lung
              </td>
            </tr>
            {data.liabilities.longTerm.map((item) => (
              <BalanceSheetRow
                key={item.id}
                item={item}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            ))}
            <tr className="bg-amber-50 font-semibold">
              <td className="py-2 px-4 text-amber-800">Total Datorii Termen Lung</td>
              <td className="py-2 px-4 text-right font-mono text-amber-800">
                {data.liabilities.totalLongTerm.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {(data.liabilities.longTerm.reduce((sum, item) => sum + item.previousValue, 0)).toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4"></td>
            </tr>

            {/* Short-term Liabilities Section */}
            <tr className="bg-red-50">
              <td colSpan={4} className="py-2 px-4 font-semibold text-red-800">
                B.III. Datorii pe Termen Scurt
              </td>
            </tr>
            {data.liabilities.shortTerm.map((item) => (
              <BalanceSheetRow
                key={item.id}
                item={item}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            ))}
            <tr className="bg-red-50 font-semibold">
              <td className="py-2 px-4 text-red-800">Total Datorii Termen Scurt</td>
              <td className="py-2 px-4 text-right font-mono text-red-800">
                {data.liabilities.totalShortTerm.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {(data.liabilities.shortTerm.reduce((sum, item) => sum + item.previousValue, 0)).toLocaleString("ro-RO")} lei
              </td>
              <td className="py-2 px-4"></td>
            </tr>

            {/* Total Liabilities */}
            <tr className="bg-slate-800 text-white font-bold">
              <td className="py-3 px-4">TOTAL PASIVE</td>
              <td className="py-3 px-4 text-right font-mono">
                {data.liabilities.total.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-3 px-4 text-right font-mono text-slate-300">
                {data.liabilities.previousTotal.toLocaleString("ro-RO")} lei
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-emerald-400">
                  +{(((data.liabilities.total - data.liabilities.previousTotal) / data.liabilities.previousTotal) * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Financial Ratios */}
      {showDetails && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Indicatori Financiari</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Rata Lichidității Curente</p>
              <p className="text-2xl font-bold text-slate-900">{currentRatio.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">
                Active Circulante / Datorii pe Termen Scurt
              </p>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${currentRatio >= 2 ? "bg-emerald-500" : currentRatio >= 1 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(currentRatio * 25, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Rata Datorii/Capitaluri Proprii</p>
              <p className="text-2xl font-bold text-slate-900">{debtToEquity.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">
                Datorii Totale / Capitaluri Proprii
              </p>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${debtToEquity <= 1 ? "bg-emerald-500" : debtToEquity <= 2 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(debtToEquity * 25, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Gradul de Autonomie Financiară</p>
              <p className="text-2xl font-bold text-slate-900">
                {((data.liabilities.totalEquity / data.liabilities.total) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Capitaluri Proprii / Total Pasive
              </p>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(data.liabilities.totalEquity / data.liabilities.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
