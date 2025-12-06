import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import {
  useTaxRates,
  useTaxCalculator,
  TaxUtils,
  type SalaryResult,
  type PFAResult,
  type MicroResult,
  type ProfitResult,
  type DividendResult,
  type VATResult,
  type CompareRegimesResult,
} from '../../hooks/useRomanianTax';

type CalculatorTab = 'salary' | 'pfa' | 'micro' | 'profit' | 'dividend' | 'vat' | 'compare';

interface TaxCalculatorProps {
  defaultTab?: CalculatorTab;
  className?: string;
}

/**
 * Romanian Tax Calculator Component
 * Comprehensive tax calculations for various scenarios
 */
const TaxCalculator: React.FC<TaxCalculatorProps> = ({
  defaultTab = 'salary',
  className = ''
}) => {
  const { language } = useI18n();
  const isRo = language === 'ro';
  const [activeTab, setActiveTab] = useState<CalculatorTab>(defaultTab);

  const { rates, fetchRates } = useTaxRates();

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const tabs: { key: CalculatorTab; labelRo: string; labelEn: string }[] = [
    { key: 'salary', labelRo: 'Salariu', labelEn: 'Salary' },
    { key: 'pfa', labelRo: 'PFA', labelEn: 'Freelancer' },
    { key: 'micro', labelRo: 'Micro', labelEn: 'Micro' },
    { key: 'profit', labelRo: 'Profit', labelEn: 'Profit' },
    { key: 'dividend', labelRo: 'Dividende', labelEn: 'Dividends' },
    { key: 'vat', labelRo: 'TVA', labelEn: 'VAT' },
    { key: 'compare', labelRo: 'Compara', labelEn: 'Compare' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg">
        <h2 className="text-xl font-bold text-white">
          {isRo ? 'Calculator Taxe Romania' : 'Romanian Tax Calculator'}
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          {isRo
            ? 'Calculeaza taxe si contributii conform legislatiei 2024/2025'
            : 'Calculate taxes and contributions per 2024/2025 legislation'}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {isRo ? tab.labelRo : tab.labelEn}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'salary' && <SalaryCalculator isRo={isRo} />}
        {activeTab === 'pfa' && <PFACalculator isRo={isRo} />}
        {activeTab === 'micro' && <MicroCalculator isRo={isRo} />}
        {activeTab === 'profit' && <ProfitCalculator isRo={isRo} />}
        {activeTab === 'dividend' && <DividendCalculator isRo={isRo} />}
        {activeTab === 'vat' && <VATCalculator isRo={isRo} />}
        {activeTab === 'compare' && <RegimeComparison isRo={isRo} />}
      </div>

      {/* Current rates info */}
      {rates && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-500">
            {isRo
              ? `Rate de referinta: ${rates.reference_date}. Salariu minim: ${TaxUtils.formatRON(rates.minimum_wage?.amount || 3300)}`
              : `Reference rates: ${rates.reference_date}. Minimum wage: ${TaxUtils.formatRON(rates.minimum_wage?.amount || 3300)}`}
          </p>
        </div>
      )}
    </div>
  );
};

// Salary Calculator Sub-component
const SalaryCalculator: React.FC<{ isRo: boolean }> = ({ isRo }) => {
  const { calculateSalary, loading, error } = useTaxCalculator();
  const [gross, setGross] = useState<string>('5000');
  const [isIT, setIsIT] = useState(false);
  const [dependents, setDependents] = useState<string>('0');
  const [result, setResult] = useState<SalaryResult | null>(null);

  const handleCalculate = async () => {
    const res = await calculateSalary({
      gross_salary: parseFloat(gross) || 0,
      is_it_worker: isIT,
      has_dependents: parseInt(dependents) || 0,
    });
    if (res) setResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Salariu brut (RON)' : 'Gross salary (RON)'}
          </label>
          <input
            type="number"
            value={gross}
            onChange={(e) => setGross(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="5000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Persoane in intretinere' : 'Dependents'}
          </label>
          <input
            type="number"
            value={dependents}
            onChange={(e) => setDependents(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isIT}
              onChange={(e) => setIsIT(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              {isRo ? 'Angajat IT (scutit impozit)' : 'IT worker (tax exempt)'}
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? (isRo ? 'Se calculeaza...' : 'Calculating...') : (isRo ? 'Calculeaza' : 'Calculate')}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">
            {isRo ? 'Rezultate' : 'Results'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard label={isRo ? 'Salariu brut' : 'Gross'} value={result.gross_salary} />
            <ResultCard label="CAS (25%)" value={result.cas} negative />
            <ResultCard label="CASS (10%)" value={result.cass} negative />
            <ResultCard label={isRo ? 'Impozit' : 'Income tax'} value={result.income_tax} negative />
            <ResultCard label={isRo ? 'Salariu net' : 'Net salary'} value={result.net_salary} highlight />
            <ResultCard label="CAM (2.25%)" value={result.cam} />
            <ResultCard label={isRo ? 'Cost angajator' : 'Employer cost'} value={result.employer_cost} />
            <ResultCard
              label={isRo ? 'Rata efectiva' : 'Effective rate'}
              value={`${(result.effective_tax_rate * 100).toFixed(1)}%`}
              isText
            />
          </div>
        </div>
      )}
    </div>
  );
};

// PFA Calculator Sub-component
const PFACalculator: React.FC<{ isRo: boolean }> = ({ isRo }) => {
  const { calculatePFA, loading, error } = useTaxCalculator();
  const [income, setIncome] = useState<string>('100000');
  const [expenses, setExpenses] = useState<string>('20000');
  const [taxSystem, setTaxSystem] = useState<'real' | 'norm'>('real');
  const [payCAS, setPayCAS] = useState(true);
  const [payCASS, setPayCASS] = useState(true);
  const [result, setResult] = useState<PFAResult | null>(null);

  const handleCalculate = async () => {
    const res = await calculatePFA({
      annual_income: parseFloat(income) || 0,
      annual_expenses: parseFloat(expenses) || 0,
      tax_system: taxSystem,
      pay_cas: payCAS,
      pay_cass: payCASS,
    });
    if (res) setResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Venit anual (RON)' : 'Annual income (RON)'}
          </label>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Cheltuieli (RON)' : 'Expenses (RON)'}
          </label>
          <input
            type="number"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Sistem impozitare' : 'Tax system'}
          </label>
          <select
            value={taxSystem}
            onChange={(e) => setTaxSystem(e.target.value as 'real' | 'norm')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="real">{isRo ? 'Sistem real' : 'Real system'}</option>
            <option value="norm">{isRo ? 'Norma de venit' : 'Income norm'}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={payCAS}
            onChange={(e) => setPayCAS(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">CAS (25%)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={payCASS}
            onChange={(e) => setPayCASS(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">CASS (10%)</span>
        </label>
      </div>

      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? (isRo ? 'Se calculeaza...' : 'Calculating...') : (isRo ? 'Calculeaza' : 'Calculate')}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">{isRo ? 'Rezultate' : 'Results'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard label={isRo ? 'Venit brut' : 'Gross income'} value={result.gross_income} />
            <ResultCard label={isRo ? 'Cheltuieli' : 'Expenses'} value={result.expenses} negative />
            <ResultCard label={isRo ? 'Venit net' : 'Net income'} value={result.net_income} />
            <ResultCard label={isRo ? 'Impozit' : 'Income tax'} value={result.income_tax} negative />
            <ResultCard label="CAS" value={result.cas} negative />
            <ResultCard label="CASS" value={result.cass} negative />
            <ResultCard label={isRo ? 'Total taxe' : 'Total taxes'} value={result.total_taxes} negative />
            <ResultCard label={isRo ? 'Net dupa taxe' : 'Net after taxes'} value={result.net_after_taxes} highlight />
          </div>
        </div>
      )}
    </div>
  );
};

// Micro Calculator Sub-component
const MicroCalculator: React.FC<{ isRo: boolean }> = ({ isRo }) => {
  const { calculateMicro, loading, error } = useTaxCalculator();
  const [revenue, setRevenue] = useState<string>('50000');
  const [hasEmployees, setHasEmployees] = useState(true);
  const [result, setResult] = useState<MicroResult | null>(null);

  const handleCalculate = async () => {
    const res = await calculateMicro({
      revenue: parseFloat(revenue) || 0,
      has_employees: hasEmployees,
    });
    if (res) setResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Venituri trimestriale (RON)' : 'Quarterly revenue (RON)'}
          </label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasEmployees}
              onChange={(e) => setHasEmployees(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              {isRo ? 'Are cel putin 1 angajat' : 'Has at least 1 employee'}
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? (isRo ? 'Se calculeaza...' : 'Calculating...') : (isRo ? 'Calculeaza' : 'Calculate')}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">{isRo ? 'Rezultate' : 'Results'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard label={isRo ? 'Venituri' : 'Revenue'} value={result.revenue} />
            <ResultCard
              label={isRo ? 'Rata impozit' : 'Tax rate'}
              value={`${(result.tax_rate * 100).toFixed(0)}%`}
              isText
            />
            <ResultCard label={isRo ? 'Impozit micro' : 'Micro tax'} value={result.tax_amount} negative />
            <ResultCard label={isRo ? 'Net' : 'Net'} value={result.net_revenue} highlight />
          </div>
        </div>
      )}
    </div>
  );
};

// Profit Calculator Sub-component
const ProfitCalculator: React.FC<{ isRo: boolean }> = ({ isRo }) => {
  const { calculateProfit, loading, error } = useTaxCalculator();
  const [revenue, setRevenue] = useState<string>('500000');
  const [expenses, setExpenses] = useState<string>('300000');
  const [result, setResult] = useState<ProfitResult | null>(null);

  const handleCalculate = async () => {
    const res = await calculateProfit({
      revenue: parseFloat(revenue) || 0,
      expenses: parseFloat(expenses) || 0,
    });
    if (res) setResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Venituri anuale (RON)' : 'Annual revenue (RON)'}
          </label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Cheltuieli anuale (RON)' : 'Annual expenses (RON)'}
          </label>
          <input
            type="number"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? (isRo ? 'Se calculeaza...' : 'Calculating...') : (isRo ? 'Calculeaza' : 'Calculate')}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">{isRo ? 'Rezultate' : 'Results'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard label={isRo ? 'Venituri' : 'Revenue'} value={result.revenue} />
            <ResultCard label={isRo ? 'Cheltuieli' : 'Expenses'} value={result.expenses} negative />
            <ResultCard label={isRo ? 'Profit brut' : 'Gross profit'} value={result.gross_profit} />
            <ResultCard label={isRo ? 'Impozit profit' : 'Profit tax'} value={result.profit_tax} negative />
            <ResultCard label={isRo ? 'Profit net' : 'Net profit'} value={result.net_profit} highlight />
            <ResultCard
              label={isRo ? 'Rata efectiva' : 'Effective rate'}
              value={`${(result.effective_rate * 100).toFixed(1)}%`}
              isText
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Dividend Calculator Sub-component
const DividendCalculator: React.FC<{ isRo: boolean }> = ({ isRo }) => {
  const { calculateDividend, loading, error } = useTaxCalculator();
  const [grossDividend, setGrossDividend] = useState<string>('10000');
  const [result, setResult] = useState<DividendResult | null>(null);

  const handleCalculate = async () => {
    const res = await calculateDividend({
      gross_dividend: parseFloat(grossDividend) || 0,
    });
    if (res) setResult(res);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isRo ? 'Dividende brute (RON)' : 'Gross dividends (RON)'}
        </label>
        <input
          type="number"
          value={grossDividend}
          onChange={(e) => setGrossDividend(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? (isRo ? 'Se calculeaza...' : 'Calculating...') : (isRo ? 'Calculeaza' : 'Calculate')}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">{isRo ? 'Rezultate' : 'Results'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard label={isRo ? 'Dividende brute' : 'Gross dividends'} value={result.gross_dividend} />
            <ResultCard
              label={isRo ? 'Rata impozit' : 'Tax rate'}
              value={`${(result.tax_rate * 100).toFixed(0)}%`}
              isText
            />
            <ResultCard label={isRo ? 'Impozit dividende' : 'Dividend tax'} value={result.tax_amount} negative />
            <ResultCard label={isRo ? 'Dividende nete' : 'Net dividends'} value={result.net_dividend} highlight />
          </div>
        </div>
      )}
    </div>
  );
};

// VAT Calculator Sub-component
const VATCalculator: React.FC<{ isRo: boolean }> = ({ isRo }) => {
  const { calculateVAT, loading, error } = useTaxCalculator();
  const [amount, setAmount] = useState<string>('1000');
  const [vatType, setVatType] = useState<string>('vat_19');
  const [inclusive, setInclusive] = useState(false);
  const [result, setResult] = useState<VATResult | null>(null);

  const handleCalculate = async () => {
    const res = await calculateVAT({
      amount: parseFloat(amount) || 0,
      vat_type: vatType as 'vat_19' | 'vat_9' | 'vat_5' | 'vat_0',
      inclusive,
    });
    if (res) setResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Suma (RON)' : 'Amount (RON)'}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Cota TVA' : 'VAT Rate'}
          </label>
          <select
            value={vatType}
            onChange={(e) => setVatType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="vat_19">19% - Standard</option>
            <option value="vat_9">9% - {isRo ? 'Redus (alimente, etc.)' : 'Reduced (food, etc.)'}</option>
            <option value="vat_5">5% - {isRo ? 'Redus (carti, etc.)' : 'Reduced (books, etc.)'}</option>
            <option value="vat_0">0% - {isRo ? 'Scutit' : 'Exempt'}</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inclusive}
              onChange={(e) => setInclusive(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              {isRo ? 'Suma include TVA' : 'Amount includes VAT'}
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? (isRo ? 'Se calculeaza...' : 'Calculating...') : (isRo ? 'Calculeaza' : 'Calculate')}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">{isRo ? 'Rezultate' : 'Results'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard label={isRo ? 'Suma neta' : 'Net amount'} value={result.net_amount} />
            <ResultCard label="TVA" value={result.vat_amount} />
            <ResultCard label={isRo ? 'Suma bruta' : 'Gross amount'} value={result.gross_amount} highlight />
            <ResultCard
              label={isRo ? 'Cota TVA' : 'VAT rate'}
              value={`${(result.vat_rate * 100).toFixed(0)}%`}
              isText
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Regime Comparison Sub-component
const RegimeComparison: React.FC<{ isRo: boolean }> = ({ isRo }) => {
  const { compareRegimes, loading, error } = useTaxCalculator();
  const [revenue, setRevenue] = useState<string>('200000');
  const [expenses, setExpenses] = useState<string>('50000');
  const [hasEmployees, setHasEmployees] = useState(true);
  const [result, setResult] = useState<CompareRegimesResult | null>(null);

  const handleCompare = async () => {
    const res = await compareRegimes({
      annual_revenue: parseFloat(revenue) || 0,
      annual_expenses: parseFloat(expenses) || 0,
      has_employees: hasEmployees,
    });
    if (res) setResult(res);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Venituri anuale (RON)' : 'Annual revenue (RON)'}
          </label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isRo ? 'Cheltuieli anuale (RON)' : 'Annual expenses (RON)'}
          </label>
          <input
            type="number"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasEmployees}
              onChange={(e) => setHasEmployees(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              {isRo ? 'Are angajati' : 'Has employees'}
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? (isRo ? 'Se compara...' : 'Comparing...') : (isRo ? 'Compara regimuri' : 'Compare regimes')}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="mt-6 space-y-4">
          {/* Recommendation */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              {isRo ? 'Recomandare' : 'Recommendation'}
            </h3>
            <p className="text-green-700">{result.recommendation}</p>
            {result.savings_potential > 0 && (
              <p className="text-green-600 text-sm mt-1">
                {isRo ? 'Economie potentiala: ' : 'Potential savings: '}
                {TaxUtils.formatRON(result.savings_potential)}
              </p>
            )}
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {isRo ? 'Regim' : 'Regime'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {isRo ? 'Total taxe' : 'Total tax'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {isRo ? 'Rata efectiva' : 'Effective rate'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {isRo ? 'Venit net' : 'Net income'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.comparisons.map((comp, idx) => (
                  <tr key={idx} className={idx === 0 ? 'bg-green-50' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {comp.regime}
                      {idx === 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded">
                          {isRo ? 'Optim' : 'Best'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {TaxUtils.formatRON(comp.total_tax)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {(comp.effective_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {TaxUtils.formatRON(comp.net_income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Result Card Component
interface ResultCardProps {
  label: string;
  value: number | string;
  negative?: boolean;
  highlight?: boolean;
  isText?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ label, value, negative, highlight, isText }) => {
  const displayValue = isText ? value : TaxUtils.formatRON(value as number);

  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-blue-100' : 'bg-white'}`}>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-lg font-semibold ${negative ? 'text-red-600' : highlight ? 'text-blue-700' : 'text-gray-900'}`}>
        {negative && !isText ? '-' : ''}{displayValue}
      </p>
    </div>
  );
};

export default TaxCalculator;
