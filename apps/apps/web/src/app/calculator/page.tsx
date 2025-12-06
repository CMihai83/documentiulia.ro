"use client";

import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Calculator,
  Percent,
  ArrowRight,
  ArrowLeftRight,
  Copy,
  Check,
  Info,
  RefreshCw,
  FileText,
  Building2,
  Package,
  Utensils,
  Book,
  Home,
  Plane,
  History,
} from "lucide-react";

type VatRate = 19 | 9 | 5 | 0;
type CalculationMode = "addVat" | "removeVat" | "extractVat";

interface VatRateInfo {
  rate: VatRate;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: string[];
  color: string;
}

const vatRates: VatRateInfo[] = [
  {
    rate: 19,
    name: "Cota standard",
    description: "Se aplică majorității bunurilor și serviciilor",
    icon: Package,
    examples: ["Electronice", "Îmbrăcăminte", "Servicii generale", "Mobilier"],
    color: "blue",
  },
  {
    rate: 9,
    name: "Cota redusă",
    description: "Bunuri de necesitate și servicii esențiale",
    icon: Utensils,
    examples: ["Alimente", "Medicamente", "Hoteluri", "Restaurante (pe loc)"],
    color: "green",
  },
  {
    rate: 5,
    name: "Cota super-redusă",
    description: "Bunuri culturale și locuințe sociale",
    icon: Book,
    examples: ["Cărți, ziare", "Prima locuință (max 120mp)", "Evenimente culturale"],
    color: "purple",
  },
  {
    rate: 0,
    name: "Scutit cu drept de deducere",
    description: "Exporturi și livrări intracomunitare",
    icon: Plane,
    examples: ["Exporturi extra-UE", "Livrări intracomunitare", "Transport internațional"],
    color: "slate",
  },
];

const calculationHistory: { amount: number; rate: VatRate; mode: CalculationMode; result: number; date: string }[] = [];

export default function CalculatorPage() {
  const [amount, setAmount] = useState<string>("");
  const [selectedRate, setSelectedRate] = useState<VatRate>(19);
  const [mode, setMode] = useState<CalculationMode>("addVat");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<typeof calculationHistory>([]);

  const calculation = useMemo(() => {
    const value = parseFloat(amount) || 0;
    const rate = selectedRate / 100;

    switch (mode) {
      case "addVat":
        return {
          baseAmount: value,
          vatAmount: value * rate,
          totalAmount: value * (1 + rate),
          label: "TVA de adăugat",
        };
      case "removeVat":
        return {
          baseAmount: value / (1 + rate),
          vatAmount: value - value / (1 + rate),
          totalAmount: value,
          label: "TVA inclus",
        };
      case "extractVat":
        return {
          baseAmount: value,
          vatAmount: value * rate,
          totalAmount: value * (1 + rate),
          label: "TVA extras",
        };
      default:
        return { baseAmount: 0, vatAmount: 0, totalAmount: 0, label: "" };
    }
  }, [amount, selectedRate, mode]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const copyResult = () => {
    const text = `Sumă fără TVA: ${formatCurrency(calculation.baseAmount)}\nTVA ${selectedRate}%: ${formatCurrency(calculation.vatAmount)}\nTotal cu TVA: ${formatCurrency(calculation.totalAmount)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addToHistory = () => {
    if (parseFloat(amount) > 0) {
      setHistory((prev) => [
        {
          amount: parseFloat(amount),
          rate: selectedRate,
          mode,
          result: calculation.totalAmount,
          date: new Date().toLocaleTimeString("ro-RO"),
        },
        ...prev.slice(0, 9),
      ]);
    }
  };

  const resetCalculator = () => {
    setAmount("");
    setSelectedRate(19);
    setMode("addVat");
  };

  const selectedRateInfo = vatRates.find((r) => r.rate === selectedRate)!;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-7 h-7 text-blue-600" />
              Calculator TVA
            </h1>
            <p className="text-slate-600 mt-1">
              Calculează rapid TVA pentru facturile tale
            </p>
          </div>
          <button
            onClick={resetCalculator}
            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl font-medium border border-slate-200 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-5 h-5" />
            Resetează
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calculator */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Tip Calcul</h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setMode("addVat")}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    mode === "addVat"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className={`w-5 h-5 ${mode === "addVat" ? "text-blue-600" : "text-slate-400"}`} />
                    <span className={`font-medium ${mode === "addVat" ? "text-blue-900" : "text-slate-700"}`}>
                      Adaugă TVA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Din sumă fără TVA</p>
                </button>
                <button
                  onClick={() => setMode("removeVat")}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    mode === "removeVat"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowLeftRight className={`w-5 h-5 ${mode === "removeVat" ? "text-blue-600" : "text-slate-400"}`} />
                    <span className={`font-medium ${mode === "removeVat" ? "text-blue-900" : "text-slate-700"}`}>
                      Extrage TVA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Din sumă cu TVA</p>
                </button>
                <button
                  onClick={() => setMode("extractVat")}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    mode === "extractVat"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className={`w-5 h-5 ${mode === "extractVat" ? "text-blue-600" : "text-slate-400"}`} />
                    <span className={`font-medium ${mode === "extractVat" ? "text-blue-900" : "text-slate-700"}`}>
                      Doar TVA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Calculează doar TVA</p>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">
                {mode === "removeVat" ? "Sumă cu TVA inclus" : "Sumă fără TVA"}
              </h2>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-4xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-medium">
                  RON
                </span>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 mt-4">
                {[100, 500, 1000, 5000, 10000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg transition"
                  >
                    {val.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* VAT Rate Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Cota TVA</h2>
              <div className="grid grid-cols-4 gap-3">
                {vatRates.map((rate) => {
                  const Icon = rate.icon;
                  return (
                    <button
                      key={rate.rate}
                      onClick={() => setSelectedRate(rate.rate)}
                      className={`p-4 rounded-xl border-2 transition ${
                        selectedRate === rate.rate
                          ? `border-${rate.color}-500 bg-${rate.color}-50`
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 mx-auto mb-2 ${
                          selectedRate === rate.rate ? `text-${rate.color}-600` : "text-slate-400"
                        }`}
                      />
                      <p className={`text-2xl font-bold ${
                        selectedRate === rate.rate ? `text-${rate.color}-900` : "text-slate-700"
                      }`}>
                        {rate.rate}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{rate.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-blue-100">Rezultat Calcul</h2>
                <div className="flex gap-2">
                  <button
                    onClick={addToHistory}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                    title="Adaugă la istoric"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={copyResult}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                    title="Copiază"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-blue-100">Sumă fără TVA</span>
                  <span className="text-2xl font-bold">{formatCurrency(calculation.baseAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-blue-100">TVA {selectedRate}%</span>
                  <span className="text-2xl font-bold">{formatCurrency(calculation.vatAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-blue-100 font-medium">TOTAL cu TVA</span>
                  <span className="text-3xl font-bold">{formatCurrency(calculation.totalAmount)}</span>
                </div>
              </div>

              <button
                className="w-full mt-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Generează Factură
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Rate Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 bg-${selectedRateInfo.color}-100 rounded-xl flex items-center justify-center`}>
                  <selectedRateInfo.icon className={`w-6 h-6 text-${selectedRateInfo.color}-600`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">TVA {selectedRate}%</h3>
                  <p className="text-sm text-slate-500">{selectedRateInfo.name}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">{selectedRateInfo.description}</p>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Exemple</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRateInfo.examples.map((example, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 bg-${selectedRateInfo.color}-50 text-${selectedRateInfo.color}-700 text-xs rounded-lg`}
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                Istoric Calcule
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Niciun calcul salvat încă
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 rounded-lg text-sm cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => {
                        setAmount(item.amount.toString());
                        setSelectedRate(item.rate);
                        setMode(item.mode);
                      }}
                    >
                      <div className="flex justify-between">
                        <span className="text-slate-600">{formatCurrency(item.amount)}</span>
                        <span className="font-medium text-slate-900">{item.rate}%</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-slate-400">{item.date}</span>
                        <span className="text-xs font-medium text-blue-600">
                          → {formatCurrency(item.result)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900">Cotele TVA 2024</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Cotele de TVA sunt reglementate de Codul Fiscal (Art. 291).
                    Verifică întotdeauna cota aplicabilă pentru tipul specific de
                    bun sau serviciu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
