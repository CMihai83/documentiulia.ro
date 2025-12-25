'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { X, Loader2, Calculator, Save, AlertCircle } from 'lucide-react';

interface InvoiceFormData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  type: 'ISSUED' | 'RECEIVED';
  partnerName: string;
  partnerCui: string;
  partnerAddress: string;
  netAmount: number;
  vatRate: number;
  currency: string;
}

interface ValidationErrors {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  partnerName?: string;
  partnerCui?: string;
  netAmount?: string;
}

interface InvoiceCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Romanian CUI validation (simplified - checks format)
const validateCUI = (cui: string): boolean => {
  if (!cui) return true; // Optional field
  const cleaned = cui.replace(/^RO/i, '').replace(/\s/g, '');
  if (!/^\d{2,10}$/.test(cleaned)) return false;
  return true;
};

export function InvoiceCreateForm({ isOpen, onClose, onSuccess }: InvoiceCreateFormProps) {
  const t = useTranslations('invoices');
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const today = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: '',
    invoiceDate: today,
    dueDate: defaultDueDate,
    type: 'ISSUED',
    partnerName: '',
    partnerCui: '',
    partnerAddress: '',
    netAmount: 0,
    vatRate: 21,
    currency: 'RON',
  });

  const vatAmount = (formData.netAmount * formData.vatRate) / 100;
  const grossAmount = formData.netAmount + vatAmount;

  const validateForm = useCallback((data: InvoiceFormData): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Invoice number validation
    if (!data.invoiceNumber.trim()) {
      errors.invoiceNumber = 'Invoice number is required';
    } else if (data.invoiceNumber.length < 3) {
      errors.invoiceNumber = 'Invoice number must be at least 3 characters';
    }

    // Invoice date validation
    if (!data.invoiceDate) {
      errors.invoiceDate = 'Invoice date is required';
    }

    // Due date validation - should be after invoice date
    if (data.dueDate && data.invoiceDate && new Date(data.dueDate) < new Date(data.invoiceDate)) {
      errors.dueDate = 'Due date cannot be before invoice date';
    }

    // Partner name validation
    if (!data.partnerName.trim()) {
      errors.partnerName = 'Partner name is required';
    } else if (data.partnerName.length < 2) {
      errors.partnerName = 'Partner name must be at least 2 characters';
    }

    // CUI validation (Romanian VAT number)
    if (data.partnerCui && !validateCUI(data.partnerCui)) {
      errors.partnerCui = 'Invalid CUI format (e.g., RO12345678 or 12345678)';
    }

    // Net amount validation
    if (data.netAmount <= 0) {
      errors.netAmount = 'Net amount must be greater than 0';
    } else if (data.netAmount > 999999999) {
      errors.netAmount = 'Net amount is too large';
    }

    return errors;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newData = {
      ...formData,
      [name]: name === 'netAmount' || name === 'vatRate' ? parseFloat(value) || 0 : value,
    };
    setFormData(newData);

    // Clear error for this field when user starts typing
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate single field on blur
    const errors = validateForm(formData);
    if (errors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name]: errors[name as keyof ValidationErrors] }));
    }
  };

  const getFieldError = (fieldName: keyof ValidationErrors): string | undefined => {
    return touched[fieldName] ? validationErrors[fieldName] : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      partnerName: true,
      partnerCui: true,
      netAmount: true,
    });

    // Validate all fields
    const errors = validateForm(formData);
    setValidationErrors(errors);

    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create invoice');
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      invoiceDate: today,
      dueDate: defaultDueDate,
      type: 'ISSUED',
      partnerName: '',
      partnerCui: '',
      partnerAddress: '',
      netAmount: 0,
      vatRate: 21,
      currency: 'RON',
    });
    setError(null);
    setValidationErrors({});
    setTouched({});
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setFormData(prev => ({
      ...prev,
      invoiceNumber: `INV-${year}${month}-${random}`,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{t('new')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Invoice Type */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'ISSUED' }))}
              className={`p-4 border-2 rounded-lg text-center transition ${
                formData.type === 'ISSUED'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-medium">{t('issued')}</span>
              <p className="text-sm text-gray-500 mt-1">{t('issuedDesc')}</p>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'RECEIVED' }))}
              className={`p-4 border-2 rounded-lg text-center transition ${
                formData.type === 'RECEIVED'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-medium">{t('received')}</span>
              <p className="text-sm text-gray-500 mt-1">{t('receivedDesc')}</p>
            </button>
          </div>

          {/* Invoice Number and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('number')} *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="INV-2025-001"
                  className={`flex-1 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    getFieldError('invoiceNumber') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  aria-invalid={!!getFieldError('invoiceNumber')}
                  aria-describedby={getFieldError('invoiceNumber') ? 'invoiceNumber-error' : undefined}
                />
                <button
                  type="button"
                  onClick={generateInvoiceNumber}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition"
                  title={t('generate')}
                >
                  #
                </button>
              </div>
              {getFieldError('invoiceNumber') && (
                <p id="invoiceNumber-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {getFieldError('invoiceNumber')}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('date')} *
              </label>
              <input
                type="date"
                name="invoiceDate"
                value={formData.invoiceDate}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('invoiceDate') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                aria-invalid={!!getFieldError('invoiceDate')}
              />
              {getFieldError('invoiceDate') && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {getFieldError('invoiceDate')}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dueDate')}
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('dueDate') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                aria-invalid={!!getFieldError('dueDate')}
              />
              {getFieldError('dueDate') && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {getFieldError('dueDate')}
                </p>
              )}
            </div>
          </div>

          {/* Partner Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              {t('partner')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('partnerName')} *
                </label>
                <input
                  type="text"
                  name="partnerName"
                  value={formData.partnerName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Client SRL"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    getFieldError('partnerName') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  aria-invalid={!!getFieldError('partnerName')}
                />
                {getFieldError('partnerName') && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {getFieldError('partnerName')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('cui')}
                </label>
                <input
                  type="text"
                  name="partnerCui"
                  value={formData.partnerCui}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="RO12345678"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    getFieldError('partnerCui') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  aria-invalid={!!getFieldError('partnerCui')}
                />
                {getFieldError('partnerCui') && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {getFieldError('partnerCui')}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('address')}
              </label>
              <textarea
                name="partnerAddress"
                value={formData.partnerAddress}
                onChange={handleChange}
                rows={2}
                placeholder="Str. Exemplu nr. 1, Bucuresti"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Amount Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              {t('amounts')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('netAmount')} *
                </label>
                <input
                  type="number"
                  name="netAmount"
                  value={formData.netAmount || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    getFieldError('netAmount') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  aria-invalid={!!getFieldError('netAmount')}
                />
                {getFieldError('netAmount') && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {getFieldError('netAmount')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vatRate')} *
                </label>
                <select
                  name="vatRate"
                  value={formData.vatRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={21}>21% - Standard (Legea 141/2025)</option>
                  <option value={11}>11% - Redusă (alimente, medicamente)</option>
                  <option value={5}>5% - Specială (locuințe sociale)</option>
                  <option value={0}>0% - Scutit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('currency')}
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="RON">RON</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Calculated Amounts */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('netAmount')}:</span>
                <span className="font-medium">
                  {formData.netAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">TVA ({formData.vatRate}%):</span>
                <span className="font-medium">
                  {vatAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-700">{t('totalAmount')}:</span>
                <span className="font-bold text-blue-600">
                  {grossAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {formData.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
