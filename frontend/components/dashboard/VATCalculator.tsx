'use client';

import { useState } from 'react';
import { Calculator, Info } from 'lucide-react';

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

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary-600" />
        Calculator TVA
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suma (RON)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Introduceți suma"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cota TVA</label>
          <div className="grid grid-cols-4 gap-2">
            {[21, 11, 5, 0].map((r) => (
              <button
                key={r}
                onClick={() => setRate(r as VATRate)}
                className={`py-2 rounded-lg text-sm font-medium transition ${
                  rate === r
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Legea 141/2025: TVA standard 21%, redus 11% (alimente, medicamente)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!isGross}
              onChange={() => setIsGross(false)}
              className="text-primary-600"
            />
            <span className="text-sm">Sumă fără TVA</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={isGross}
              onChange={() => setIsGross(true)}
              className="text-primary-600"
            />
            <span className="text-sm">Sumă cu TVA</span>
          </label>
        </div>

        <button
          onClick={calculateVAT}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition"
        >
          Calculează
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Sumă netă:</span>
              <span className="font-semibold">{result.netAmount.toLocaleString('ro-RO')} RON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TVA ({result.rate}%):</span>
              <span className="font-semibold text-primary-600">
                {result.vatAmount.toLocaleString('ro-RO')} RON
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-800 font-medium">Total cu TVA:</span>
              <span className="font-bold text-lg">{result.grossAmount.toLocaleString('ro-RO')} RON</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
