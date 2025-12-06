'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building2,
  CreditCard,
  Landmark,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';

interface BankAccountFormData {
  accountName: string;
  bankName: string;
  iban: string;
  swift?: string;
  currency: string;
  accountType: 'current' | 'savings' | 'deposit';
  isDefault: boolean;
  initialBalance: number;
}

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  account?: BankAccountFormData;
}

// Romanian banks
const romanianBanks = [
  { code: 'BTRL', name: 'Banca Transilvania', logo: 'BT' },
  { code: 'BRDE', name: 'BRD - Groupe Société Générale', logo: 'BRD' },
  { code: 'RNCB', name: 'BCR - Banca Comercială Română', logo: 'BCR' },
  { code: 'INGB', name: 'ING Bank', logo: 'ING' },
  { code: 'RZBR', name: 'Raiffeisen Bank', logo: 'RB' },
  { code: 'UGBI', name: 'UniCredit Bank', logo: 'UC' },
  { code: 'CECE', name: 'CEC Bank', logo: 'CEC' },
  { code: 'OTPV', name: 'OTP Bank', logo: 'OTP' },
  { code: 'PIRB', name: 'First Bank (ex Piraeus)', logo: 'FB' },
  { code: 'EGNA', name: 'Garanti BBVA', logo: 'BBVA' },
  { code: 'LIBR', name: 'Libra Internet Bank', logo: 'LIB' },
  { code: 'ABNR', name: 'Alpha Bank', logo: 'AB' },
  { code: 'EXBS', name: 'Exim Banca Românească', logo: 'EBR' },
  { code: 'BCRL', name: 'Banca Românească', logo: 'BR' },
  { code: 'FNNB', name: 'Vista Bank', logo: 'VB' },
  { code: 'REVOLT', name: 'Revolut', logo: 'R' },
  { code: 'WISE', name: 'Wise', logo: 'W' },
];

// Validate Romanian IBAN
const validateIBAN = (iban: string): boolean => {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  if (cleanIban.length !== 24) return false;
  if (!cleanIban.startsWith('RO')) return false;

  // Basic format check
  const regex = /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/;
  return regex.test(cleanIban);
};

// Format IBAN for display
const formatIBAN = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
};

// Get bank from IBAN
const getBankFromIBAN = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (clean.length >= 8) {
    const bankCode = clean.substring(4, 8);
    const bank = romanianBanks.find(b => b.code === bankCode);
    return bank?.name || '';
  }
  return '';
};

export function BankAccountModal({ isOpen, onClose, onSuccess, account }: BankAccountModalProps) {
  const { selectedCompanyId } = useCompanyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ibanError, setIbanError] = useState<string | null>(null);

  const [formData, setFormData] = useState<BankAccountFormData>({
    accountName: '',
    bankName: '',
    iban: '',
    swift: '',
    currency: 'RON',
    accountType: 'current',
    isDefault: false,
    initialBalance: 0,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (account) {
        setFormData(account);
      } else {
        setFormData({
          accountName: '',
          bankName: '',
          iban: '',
          swift: '',
          currency: 'RON',
          accountType: 'current',
          isDefault: false,
          initialBalance: 0,
        });
      }
      setIbanError(null);
    }
  }, [isOpen, account]);

  // Handle IBAN change with auto-detection
  const handleIBANChange = (value: string) => {
    const formattedIBAN = formatIBAN(value);
    setFormData((prev) => ({ ...prev, iban: formattedIBAN }));

    // Auto-detect bank
    const detectedBank = getBankFromIBAN(value);
    if (detectedBank && !formData.bankName) {
      setFormData((prev) => ({ ...prev, bankName: detectedBank }));
    }

    // Validate
    const cleanIban = value.replace(/\s/g, '');
    if (cleanIban.length === 24) {
      if (validateIBAN(cleanIban)) {
        setIbanError(null);
      } else {
        setIbanError('IBAN invalid. Verifică formatul.');
      }
    } else if (cleanIban.length > 0) {
      setIbanError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanIban = formData.iban.replace(/\s/g, '');
    if (!validateIBAN(cleanIban)) {
      setIbanError('IBAN invalid. Verifică formatul.');
      return;
    }

    if (!formData.bankName) {
      alert('Selectează banca');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Bank account data:', {
        ...formData,
        iban: cleanIban,
        companyId: selectedCompanyId,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving bank account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Landmark className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {account ? 'Editează Contul' : 'Cont Bancar Nou'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Adaugă un cont bancar pentru firma ta
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5">
                {/* Account Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Denumire Cont
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, accountName: e.target.value }))}
                    placeholder="ex: Cont Principal, Cont Salarii"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* IBAN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IBAN *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => handleIBANChange(e.target.value)}
                      placeholder="RO00 XXXX 0000 0000 0000 0000"
                      maxLength={29}
                      className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 font-mono ${
                        ibanError
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-200 dark:border-gray-700 focus:ring-emerald-500'
                      }`}
                    />
                    {formData.iban && !ibanError && formData.iban.replace(/\s/g, '').length === 24 && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {ibanError && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {ibanError}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Introdu IBAN-ul și banca va fi detectată automat
                  </p>
                </div>

                {/* Bank */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bancă *
                  </label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Selectează banca --</option>
                    {romanianBanks.map((bank) => (
                      <option key={bank.code} value={bank.name}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Currency and Type Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monedă
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="RON">RON - Leu românesc</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="USD">USD - Dolar</option>
                      <option value="GBP">GBP - Liră sterlină</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tip Cont
                    </label>
                    <select
                      value={formData.accountType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accountType: e.target.value as 'current' | 'savings' | 'deposit' }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="current">Cont Curent</option>
                      <option value="savings">Cont de Economii</option>
                      <option value="deposit">Depozit</option>
                    </select>
                  </div>
                </div>

                {/* SWIFT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cod SWIFT/BIC (opțional)
                  </label>
                  <input
                    type="text"
                    value={formData.swift || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, swift: e.target.value.toUpperCase() }))}
                    placeholder="ex: BTRLRO22"
                    maxLength={11}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Initial Balance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sold Inițial
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.initialBalance}
                      onChange={(e) => setFormData((prev) => ({ ...prev, initialBalance: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {formData.currency}
                    </span>
                  </div>
                </div>

                {/* Default Account Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      formData.isDefault ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        formData.isDefault ? 'translate-x-5' : ''
                      }`} />
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Setează ca cont implicit
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.iban || !formData.bankName || !!ibanError}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Se salvează...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      {account ? 'Salvează Modificări' : 'Adaugă Cont'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
