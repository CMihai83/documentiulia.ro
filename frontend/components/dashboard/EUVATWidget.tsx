'use client';

import { useState, useEffect } from 'react';
import { Globe, ChevronDown, ChevronUp, Info, Calculator, RefreshCw } from 'lucide-react';
import { Tooltip, InlineHelp } from '@/components/ui/Tooltip';

interface CountryVATConfig {
  country: string;
  countryName: string;
  currencyCode: string;
  standardRate: number;
  reducedRates: number[];
}

interface VATCalculation {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  country: string;
}

const FLAG_EMOJIS: Record<string, string> = {
  RO: '\u{1F1F7}\u{1F1F4}',
  AT: '\u{1F1E6}\u{1F1F9}',
  BE: '\u{1F1E7}\u{1F1EA}',
  BG: '\u{1F1E7}\u{1F1EC}',
  HR: '\u{1F1ED}\u{1F1F7}',
  CY: '\u{1F1E8}\u{1F1FE}',
  CZ: '\u{1F1E8}\u{1F1FF}',
  DK: '\u{1F1E9}\u{1F1F0}',
  EE: '\u{1F1EA}\u{1F1EA}',
  FI: '\u{1F1EB}\u{1F1EE}',
  FR: '\u{1F1EB}\u{1F1F7}',
  DE: '\u{1F1E9}\u{1F1EA}',
  GR: '\u{1F1EC}\u{1F1F7}',
  HU: '\u{1F1ED}\u{1F1FA}',
  IE: '\u{1F1EE}\u{1F1EA}',
  IT: '\u{1F1EE}\u{1F1F9}',
  LV: '\u{1F1F1}\u{1F1FB}',
  LT: '\u{1F1F1}\u{1F1F9}',
  LU: '\u{1F1F1}\u{1F1FA}',
  MT: '\u{1F1F2}\u{1F1F9}',
  NL: '\u{1F1F3}\u{1F1F1}',
  PL: '\u{1F1F5}\u{1F1F1}',
  PT: '\u{1F1F5}\u{1F1F9}',
  SK: '\u{1F1F8}\u{1F1F0}',
  SI: '\u{1F1F8}\u{1F1EE}',
  ES: '\u{1F1EA}\u{1F1F8}',
  SE: '\u{1F1F8}\u{1F1EA}',
};

export function EUVATWidget() {
  const [countries, setCountries] = useState<CountryVATConfig[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('RO');
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<string>('1000');
  const [calculation, setCalculation] = useState<VATCalculation | null>(null);

  useEffect(() => {
    fetchEUVATRates();
  }, []);

  useEffect(() => {
    if (amount && selectedCountry && countries.length > 0) {
      calculateVAT();
    }
  }, [amount, selectedCountry, countries]);

  const fetchEUVATRates = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await fetch(`${API_URL}/finance/eu-vat/countries`);
      if (response.ok) {
        const data = await response.json();
        setCountries(data);
      } else {
        // Use fallback data
        setCountries(FALLBACK_COUNTRIES);
      }
    } catch (err) {
      console.error('Error fetching EU VAT rates:', err);
      setCountries(FALLBACK_COUNTRIES);
    } finally {
      setLoading(false);
    }
  };

  const calculateVAT = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const country = countries.find(c => c.country === selectedCountry);
    if (!country) return;

    const vatRate = country.standardRate;
    const vatAmount = Math.round(numAmount * (vatRate / 100) * 100) / 100;
    const grossAmount = Math.round((numAmount + vatAmount) * 100) / 100;

    setCalculation({
      netAmount: numAmount,
      vatAmount,
      grossAmount,
      vatRate,
      country: selectedCountry,
    });
  };

  const selectedCountryData = countries.find(c => c.country === selectedCountry);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          TVA UE-27
          <InlineHelp
            content="Cotele TVA pentru toate cele 27 de state membre UE. Actualizat conform legislatiei europene in vigoare."
            title="TVA in Uniunea Europeana"
            size="sm"
          />
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700 transition p-1"
        >
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Country selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Selecteaza tara
        </label>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {countries.map((country) => (
            <option key={country.country} value={country.country}>
              {FLAG_EMOJIS[country.country]} {country.countryName} ({country.standardRate}%)
            </option>
          ))}
        </select>
      </div>

      {/* Selected country info */}
      {selectedCountryData && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{FLAG_EMOJIS[selectedCountryData.country]}</span>
            <span className="text-2xl font-bold text-blue-600">{selectedCountryData.standardRate}%</span>
          </div>
          <div className="text-sm text-gray-700">
            <div className="font-medium">{selectedCountryData.countryName}</div>
            <div className="text-gray-500">
              Moneda: {selectedCountryData.currencyCode}
            </div>
            {selectedCountryData.reducedRates.length > 0 && (
              <div className="text-gray-500 mt-1">
                Cote reduse: {selectedCountryData.reducedRates.join('%, ')}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick calculator */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
            <Calculator className="w-4 h-4" />
            Calculator rapid
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Suma neta"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {calculation && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Suma neta:</span>
              <span className="font-medium">{calculation.netAmount.toLocaleString('ro-RO')} {selectedCountryData?.currencyCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TVA ({calculation.vatRate}%):</span>
              <span className="font-semibold text-blue-600">{calculation.vatAmount.toLocaleString('ro-RO')} {selectedCountryData?.currencyCode}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Total cu TVA:</span>
              <span className="font-bold">{calculation.grossAmount.toLocaleString('ro-RO')} {selectedCountryData?.currencyCode}</span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded view - all countries */}
      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Toate cotele TVA UE-27</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {countries
              .sort((a, b) => b.standardRate - a.standardRate)
              .map((country) => (
                <button
                  key={country.country}
                  onClick={() => setSelectedCountry(country.country)}
                  className={`p-2 rounded-lg text-left text-xs transition ${
                    selectedCountry === country.country
                      ? 'bg-blue-100 border-blue-300 border'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{FLAG_EMOJIS[country.country]}</span>
                    <span className="font-medium truncate">{country.countryName}</span>
                  </div>
                  <div className="text-gray-600 mt-0.5">
                    {country.standardRate}% standard
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Romania special note */}
      {selectedCountry === 'RO' && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Nota Romania:</strong> Din August 2025, cota standard TVA creste de la 19% la 21%, iar cota redusa de la 9% la 11% (Legea 141/2025).
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback data in case API fails
const FALLBACK_COUNTRIES: CountryVATConfig[] = [
  { country: 'RO', countryName: 'Romania', standardRate: 21, reducedRates: [11], currencyCode: 'RON' },
  { country: 'HU', countryName: 'Hungary', standardRate: 27, reducedRates: [5, 18], currencyCode: 'HUF' },
  { country: 'HR', countryName: 'Croatia', standardRate: 25, reducedRates: [5, 13], currencyCode: 'EUR' },
  { country: 'DK', countryName: 'Denmark', standardRate: 25, reducedRates: [], currencyCode: 'DKK' },
  { country: 'SE', countryName: 'Sweden', standardRate: 25, reducedRates: [6, 12], currencyCode: 'SEK' },
  { country: 'FI', countryName: 'Finland', standardRate: 24, reducedRates: [10, 14], currencyCode: 'EUR' },
  { country: 'GR', countryName: 'Greece', standardRate: 24, reducedRates: [6, 13], currencyCode: 'EUR' },
  { country: 'IE', countryName: 'Ireland', standardRate: 23, reducedRates: [9, 13.5], currencyCode: 'EUR' },
  { country: 'PL', countryName: 'Poland', standardRate: 23, reducedRates: [5, 8], currencyCode: 'PLN' },
  { country: 'PT', countryName: 'Portugal', standardRate: 23, reducedRates: [6, 13], currencyCode: 'EUR' },
  { country: 'EE', countryName: 'Estonia', standardRate: 22, reducedRates: [9], currencyCode: 'EUR' },
  { country: 'IT', countryName: 'Italy', standardRate: 22, reducedRates: [4, 5, 10], currencyCode: 'EUR' },
  { country: 'SI', countryName: 'Slovenia', standardRate: 22, reducedRates: [5, 9.5], currencyCode: 'EUR' },
  { country: 'BE', countryName: 'Belgium', standardRate: 21, reducedRates: [6, 12], currencyCode: 'EUR' },
  { country: 'CZ', countryName: 'Czech Republic', standardRate: 21, reducedRates: [10, 15], currencyCode: 'CZK' },
  { country: 'ES', countryName: 'Spain', standardRate: 21, reducedRates: [4, 10], currencyCode: 'EUR' },
  { country: 'LV', countryName: 'Latvia', standardRate: 21, reducedRates: [5, 12], currencyCode: 'EUR' },
  { country: 'LT', countryName: 'Lithuania', standardRate: 21, reducedRates: [5, 9], currencyCode: 'EUR' },
  { country: 'NL', countryName: 'Netherlands', standardRate: 21, reducedRates: [9], currencyCode: 'EUR' },
  { country: 'AT', countryName: 'Austria', standardRate: 20, reducedRates: [10, 13], currencyCode: 'EUR' },
  { country: 'BG', countryName: 'Bulgaria', standardRate: 20, reducedRates: [9], currencyCode: 'BGN' },
  { country: 'FR', countryName: 'France', standardRate: 20, reducedRates: [5.5, 10], currencyCode: 'EUR' },
  { country: 'SK', countryName: 'Slovakia', standardRate: 20, reducedRates: [10], currencyCode: 'EUR' },
  { country: 'CY', countryName: 'Cyprus', standardRate: 19, reducedRates: [5, 9], currencyCode: 'EUR' },
  { country: 'DE', countryName: 'Germany', standardRate: 19, reducedRates: [7], currencyCode: 'EUR' },
  { country: 'MT', countryName: 'Malta', standardRate: 18, reducedRates: [5, 7], currencyCode: 'EUR' },
  { country: 'LU', countryName: 'Luxembourg', standardRate: 17, reducedRates: [3, 8], currencyCode: 'EUR' },
];
