'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Globe,
  Calculator,
  Shield,
  FileCheck,
  Loader2,
  Download,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
  Eye,
} from 'lucide-react';

interface TaxRate {
  standard: number;
  reduced?: number[];
  superReduced?: number;
  zero?: number;
  parking?: number;
}

interface CountryTaxConfig {
  code: string;
  name: string;
  isEU: boolean;
  rates: TaxRate;
  currency: string;
  taxIDPrefix?: string;
  vatNumberFormat?: string;
  filingFrequency?: string;
  deadlineDays?: number;
}

interface TaxExemption {
  id: string;
  type: 'category' | 'entity' | 'transaction' | 'threshold';
  country: string;
  description: string;
  conditions: Record<string, any>;
  validFrom: string;
  validTo?: string;
}

interface TaxCalculationResult {
  amount: number;
  taxAmount: number;
  totalAmount: number;
  rate: number;
  country: string;
  rateType: string;
  applicableExemptions?: string[];
  reverseCharge?: boolean;
}

export default function TaxCodesPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'countries' | 'calculator' | 'validation' | 'exemptions'>('countries');

  // Countries Tab
  const [countries, setCountries] = useState<CountryTaxConfig[]>([]);
  const [euCountries, setEuCountries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryTaxConfig | null>(null);
  const [filterEU, setFilterEU] = useState(false);

  // Calculator Tab
  const [calcAmount, setCalcAmount] = useState('');
  const [calcCurrency, setCalcCurrency] = useState('RON');
  const [calcSellerCountry, setCalcSellerCountry] = useState('RO');
  const [calcBuyerCountry, setCalcBuyerCountry] = useState('RO');
  const [calcTransactionType, setCalcTransactionType] = useState<'B2B' | 'B2C' | 'B2G'>('B2B');
  const [calcResult, setCalcResult] = useState<TaxCalculationResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Validation Tab
  const [taxNumber, setTaxNumber] = useState('');
  const [taxNumberCountry, setTaxNumberCountry] = useState('RO');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  // Exemptions Tab
  const [exemptions, setExemptions] = useState<TaxExemption[]>([]);
  const [showExemptionModal, setShowExemptionModal] = useState(false);

  useEffect(() => {
    fetchCountries();
    fetchExemptions();
  }, []);

  async function fetchCountries() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [countriesRes, euRes] = await Promise.all([
        fetch('/api/finance/tax/countries', { headers }),
        fetch('/api/finance/tax/countries/eu', { headers }),
      ]);

      if (countriesRes.ok) {
        const data = await countriesRes.json();
        const countryConfigs = await Promise.all(
          data.countries.map(async (code: string) => {
            try {
              const configRes = await fetch(`/api/finance/tax/countries/${code}`, { headers });
              if (configRes.ok) {
                return await configRes.json();
              }
              return null;
            } catch {
              return null;
            }
          })
        );
        setCountries(countryConfigs.filter(Boolean));
      }

      if (euRes.ok) {
        const data = await euRes.json();
        setEuCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExemptions() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/finance/tax/exemptions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setExemptions(data.exemptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch exemptions:', error);
    }
  }

  async function calculateTax() {
    if (!calcAmount) return;

    setCalcLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/finance/tax/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(calcAmount),
          currency: calcCurrency,
          sellerCountry: calcSellerCountry,
          buyerCountry: calcBuyerCountry,
          transactionType: calcTransactionType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCalcResult(data);
      }
    } catch (error) {
      console.error('Tax calculation failed:', error);
    } finally {
      setCalcLoading(false);
    }
  }

  async function validateTaxNumberAPI() {
    if (!taxNumber) return;

    setValidating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/finance/tax/validate-tax-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taxNumber,
          country: taxNumberCountry,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult(data);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setValidating(false);
    }
  }

  async function deleteExemption(id: string) {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/finance/tax/exemptions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchExemptions();
      }
    } catch (error) {
      console.error('Failed to delete exemption:', error);
    }
  }

  const formatCurrency = (value: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const filteredCountries = countries.filter((country) => {
    const matchesSearch = country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEU = !filterEU || country.isEU;
    return matchesSearch && matchesEU;
  });

  const getExemptionTypeBadge = (type: string) => {
    const styles = {
      category: 'bg-blue-100 text-blue-700',
      entity: 'bg-green-100 text-green-700',
      transaction: 'bg-purple-100 text-purple-700',
      threshold: 'bg-orange-100 text-orange-700',
    };
    const labels = {
      category: 'Categorie',
      entity: 'Entitate',
      transaction: 'Tranzacție',
      threshold: 'Prag',
    };
    return { color: styles[type as keyof typeof styles], label: labels[type as keyof typeof labels] };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/accounting"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi la Contabilitate
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coduri și Conformitate Fiscală</h1>
            <p className="text-gray-600 mt-1">
              Gestionare coduri TVA, calcul taxe, și verificare conformitate
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('countries')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'countries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Globe className="h-4 w-4" />
              Țări și Coduri
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'calculator'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calculator className="h-4 w-4" />
              Calculator TVA
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'validation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileCheck className="h-4 w-4" />
              Validare CUI/TVA
            </button>
            <button
              onClick={() => setActiveTab('exemptions')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'exemptions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="h-4 w-4" />
              Scutiri Fiscale
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Countries Tab */}
          {activeTab === 'countries' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Caută țară..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterEU}
                    onChange={(e) => setFilterEU(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Doar UE</span>
                </label>
              </div>

              {/* Countries Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : filteredCountries.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nicio țară găsită</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCountries.map((country) => (
                    <div
                      key={country.code}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedCountry(country)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{country.name}</h3>
                          <span className="text-xs text-gray-500 font-mono">{country.code}</span>
                        </div>
                        {country.isEU && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            UE
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">TVA Standard:</span>
                          <span className="font-medium text-gray-900">{country.rates.standard}%</span>
                        </div>
                        {country.rates.reduced && country.rates.reduced.length > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">TVA Redusă:</span>
                            <span className="font-medium text-gray-900">
                              {country.rates.reduced.join('%, ')}%
                            </span>
                          </div>
                        )}
                        {country.rates.superReduced && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">TVA Super Redusă:</span>
                            <span className="font-medium text-gray-900">{country.rates.superReduced}%</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span className="text-gray-600">Monedă:</span>
                          <span className="font-medium text-gray-900">{country.currency}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Calculator TVA Internațional</p>
                  <p>Calculează automat TVA pentru tranzacții B2B, B2C, și B2G luând în considerare regulile UE și reverse charge.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suma (fără TVA)
                  </label>
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monedă
                  </label>
                  <select
                    value={calcCurrency}
                    onChange={(e) => setCalcCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Țara Vânzător
                  </label>
                  <select
                    value={calcSellerCountry}
                    onChange={(e) => setCalcSellerCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Țara Cumpărător
                  </label>
                  <select
                    value={calcBuyerCountry}
                    onChange={(e) => setCalcBuyerCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tip Tranzacție
                  </label>
                  <select
                    value={calcTransactionType}
                    onChange={(e) => setCalcTransactionType(e.target.value as 'B2B' | 'B2C' | 'B2G')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="B2B">B2B (Business to Business)</option>
                    <option value="B2C">B2C (Business to Consumer)</option>
                    <option value="B2G">B2G (Business to Government)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={calculateTax}
                disabled={calcLoading || !calcAmount}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {calcLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Se calculează...
                  </>
                ) : (
                  <>
                    <Calculator className="h-5 w-5" />
                    Calculează TVA
                  </>
                )}
              </button>

              {calcResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Rezultat Calcul
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700">Sumă Netă:</p>
                      <p className="text-xl font-bold text-green-900">{formatCurrency(calcResult.amount, calcCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700">TVA ({calcResult.rate}%):</p>
                      <p className="text-xl font-bold text-green-900">{formatCurrency(calcResult.taxAmount, calcCurrency)}</p>
                    </div>
                    <div className="col-span-2 border-t border-green-300 pt-4">
                      <p className="text-sm text-green-700">Total cu TVA:</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(calcResult.totalAmount, calcCurrency)}</p>
                    </div>
                    {calcResult.reverseCharge && (
                      <div className="col-span-2">
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium">Reverse Charge Aplicabil</p>
                            <p>TVA datorat de cumpărător conform regulilor UE intra-comunitare.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-medium mb-1">Validare Cod Fiscal</p>
                  <p>Verifică validitatea codurilor CUI/TVA pentru România și UE folosind bazele de date VIES.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cod Fiscal (CUI/TVA)
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="RO12345678 sau 12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Țară
                  </label>
                  <select
                    value={taxNumberCountry}
                    onChange={(e) => setTaxNumberCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={validateTaxNumberAPI}
                disabled={validating || !taxNumber}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {validating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Se validează...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-5 w-5" />
                    Validează Cod
                  </>
                )}
              </button>

              {validationResult && (
                <div className={`border rounded-lg p-6 ${
                  validationResult.valid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`font-semibold mb-4 flex items-center gap-2 ${
                    validationResult.valid ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {validationResult.valid ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Cod Valid
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" />
                        Cod Invalid
                      </>
                    )}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {validationResult.name && (
                      <div>
                        <span className="font-medium">Nume:</span> {validationResult.name}
                      </div>
                    )}
                    {validationResult.address && (
                      <div>
                        <span className="font-medium">Adresă:</span> {validationResult.address}
                      </div>
                    )}
                    {validationResult.message && (
                      <div className={validationResult.valid ? 'text-green-700' : 'text-red-700'}>
                        {validationResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Exemptions Tab */}
          {activeTab === 'exemptions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Total scutiri active: <span className="font-semibold">{exemptions.length}</span>
                </p>
                <button
                  onClick={() => setShowExemptionModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Adaugă Scutire
                </button>
              </div>

              {exemptions.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nicio scutire fiscală configurată</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exemptions.map((exemption) => {
                    const typeBadge = getExemptionTypeBadge(exemption.type);
                    return (
                      <div key={exemption.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${typeBadge.color}`}>
                              {typeBadge.label}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">{exemption.country}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="text-gray-600 hover:text-blue-600"
                              title="Vizualizare"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteExemption(exemption.id)}
                              className="text-gray-600 hover:text-red-600"
                              title="Șterge"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{exemption.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Valabil de la: {new Date(exemption.validFrom).toLocaleDateString('ro-RO')}</span>
                          {exemption.validTo && (
                            <span>până la: {new Date(exemption.validTo).toLocaleDateString('ro-RO')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Country Modal */}
      {selectedCountry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{selectedCountry.name}</h2>
                <span className="text-sm text-gray-500 font-mono">{selectedCountry.code}</span>
                {selectedCountry.isEU && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">UE</span>
                )}
              </div>
              <button
                onClick={() => setSelectedCountry(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Cote TVA</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Standard</p>
                    <p className="text-xl font-bold text-gray-900">{selectedCountry.rates.standard}%</p>
                  </div>
                  {selectedCountry.rates.reduced && selectedCountry.rates.reduced.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Redusă</p>
                      <p className="text-xl font-bold text-gray-900">
                        {selectedCountry.rates.reduced.join('%, ')}%
                      </p>
                    </div>
                  )}
                  {selectedCountry.rates.superReduced && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Super Redusă</p>
                      <p className="text-xl font-bold text-gray-900">{selectedCountry.rates.superReduced}%</p>
                    </div>
                  )}
                  {selectedCountry.rates.zero !== undefined && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Zero</p>
                      <p className="text-xl font-bold text-gray-900">{selectedCountry.rates.zero}%</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Detalii Fiscale</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-600">Monedă</dt>
                    <dd className="font-medium text-gray-900">{selectedCountry.currency}</dd>
                  </div>
                  {selectedCountry.taxIDPrefix && (
                    <div>
                      <dt className="text-gray-600">Prefix TVA</dt>
                      <dd className="font-medium text-gray-900 font-mono">{selectedCountry.taxIDPrefix}</dd>
                    </div>
                  )}
                  {selectedCountry.filingFrequency && (
                    <div>
                      <dt className="text-gray-600">Frecvență Raportare</dt>
                      <dd className="font-medium text-gray-900">{selectedCountry.filingFrequency}</dd>
                    </div>
                  )}
                  {selectedCountry.deadlineDays && (
                    <div>
                      <dt className="text-gray-600">Deadline Depunere</dt>
                      <dd className="font-medium text-gray-900">{selectedCountry.deadlineDays} zile</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exemption Modal Placeholder */}
      {showExemptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Adaugă Scutire Fiscală</h2>
              <button
                onClick={() => setShowExemptionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Formularul va fi disponibil în curând.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
