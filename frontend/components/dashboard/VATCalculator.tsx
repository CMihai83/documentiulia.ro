'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Tooltip, InlineHelp, HelpCard } from '@/components/ui/Tooltip';

type VATRate = 21 | 11 | 5 | 0;

interface VATResult {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  rate: VATRate;
}

export function VATCalculator() {
  const [amount, setAmount] = useState<string>('');
  const [rate, setRate] = useState<VATRate>(21);
  const [isGross, setIsGross] = useState(false);
  const [result, setResult] = useState<VATResult | null>(null);

  const calculateVAT = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    let netAmount: number;
    let vatAmount: number;
    let grossAmount: number;

    if (isGross) {
      grossAmount = numAmount;
      netAmount = numAmount / (1 + rate / 100);
      vatAmount = grossAmount - netAmount;
    } else {
      netAmount = numAmount;
      vatAmount = netAmount * (rate / 100);
      grossAmount = netAmount + vatAmount;
    }

    setResult({
      netAmount: Math.round(netAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      rate,
    });
  };

  // VAT rate descriptions for tooltips
  const rateDescriptions: Record<VATRate, string> = {
    21: 'Cota standard TVA conform Legea 141/2025. Se aplică majorității bunurilor și serviciilor.',
    11: 'Cota redusă pentru alimente, medicamente, cărți, hoteluri și restaurante.',
    5: 'Cota super-redusă pentru locuințe sociale și anumite servicii culturale.',
    0: 'Scutit de TVA - export, transport internațional, anumite servicii medicale.',
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
        <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
        Calculator TVA
        <InlineHelp
          content="Calculează TVA conform noilor cote din Legea 141/2025 (în vigoare din August 2025)."
          title="Calculator TVA Romania"
          size="sm"
        />
      </h2>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <label className="text-sm font-medium text-gray-700">Suma (RON)</label>
            <InlineHelp
              content="Introduceți suma în lei (RON). Puteți alege dacă suma este cu sau fără TVA."
              size="sm"
            />
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Introduceți suma"
            className="w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
          />
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <label className="text-sm font-medium text-gray-700">Cota TVA</label>
            <InlineHelp
              content="Alegeți cota TVA aplicabilă. Cotele au fost actualizate conform Legea 141/2025."
              size="sm"
            />
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {([21, 11, 5, 0] as VATRate[]).map((r) => (
              <Tooltip key={r} content={rateDescriptions[r]} position="top">
                <button
                  onClick={() => setRate(r)}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-medium transition w-full ${
                    rate === r
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {r}%
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Tooltip content="Selectați dacă suma introdusă include sau nu TVA" position="top">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!isGross}
                onChange={() => setIsGross(false)}
                className="text-primary-600"
              />
              <span className="text-sm">Sumă fără TVA</span>
            </label>
          </Tooltip>
          <Tooltip content="Suma introdusă include deja TVA - se va calcula baza de impozitare" position="top">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isGross}
                onChange={() => setIsGross(true)}
                className="text-primary-600"
              />
              <span className="text-sm">Sumă cu TVA</span>
            </label>
          </Tooltip>
        </div>

        <button
          onClick={calculateVAT}
          className="w-full bg-primary-600 text-white py-2.5 sm:py-3 rounded-lg font-medium hover:bg-primary-700 transition text-sm sm:text-base"
        >
          Calculează
        </button>

        {result && (
          <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-600 flex items-center gap-1">
                Sumă netă
                <InlineHelp content="Valoarea fără TVA (baza de impozitare)" size="sm" />
              </span>
              <span className="font-semibold">{result.netAmount.toLocaleString('ro-RO')} RON</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-600">TVA ({result.rate}%):</span>
              <span className="font-semibold text-primary-600">
                {result.vatAmount.toLocaleString('ro-RO')} RON
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t text-sm sm:text-base">
              <span className="text-gray-800 font-medium">Total cu TVA:</span>
              <span className="font-bold text-base sm:text-lg">{result.grossAmount.toLocaleString('ro-RO')} RON</span>
            </div>
          </div>
        )}

        <HelpCard title="Noile cote TVA 2025" variant="info" dismissible>
          Din August 2025, cota standard TVA crește de la 19% la 21%, iar cota redusă de la 9% la 11% (Legea 141/2025).
        </HelpCard>
      </div>
    </div>
  );
}
