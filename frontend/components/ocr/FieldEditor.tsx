'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  X,
  AlertTriangle,
  Edit2,
  RefreshCw,
} from 'lucide-react';

interface ExtractedField {
  name: string;
  value: string | null;
  confidence: number;
  originalValue?: string;
}

interface FieldEditorProps {
  fields: ExtractedField[];
  onSave: (corrections: Record<string, string>) => void;
  onCancel: () => void;
  selectedField?: string;
  onFieldSelect?: (fieldName: string) => void;
  isLoading?: boolean;
}

const fieldLabels: Record<string, { ro: string; en: string }> = {
  invoiceNumber: { ro: 'Numar Factura', en: 'Invoice Number' },
  invoiceDate: { ro: 'Data Factura', en: 'Invoice Date' },
  dueDate: { ro: 'Data Scadenta', en: 'Due Date' },
  partnerName: { ro: 'Nume Partener', en: 'Partner Name' },
  partnerCui: { ro: 'CUI Partener', en: 'Partner CUI' },
  partnerAddress: { ro: 'Adresa Partener', en: 'Partner Address' },
  netAmount: { ro: 'Suma Neta', en: 'Net Amount' },
  vatRate: { ro: 'Cota TVA', en: 'VAT Rate' },
  vatAmount: { ro: 'Suma TVA', en: 'VAT Amount' },
  grossAmount: { ro: 'Suma Bruta', en: 'Gross Amount' },
  currency: { ro: 'Moneda', en: 'Currency' },
  receiptNumber: { ro: 'Numar Bon', en: 'Receipt Number' },
  cashRegisterNo: { ro: 'Nr. Casa Marcat', en: 'Cash Register No.' },
  contractNumber: { ro: 'Numar Contract', en: 'Contract Number' },
};

export function FieldEditor({
  fields,
  onSave,
  onCancel,
  selectedField,
  onFieldSelect,
  isLoading = false,
}: FieldEditorProps) {
  const t = useTranslations('ocr');
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);

  // Initialize edited fields with original values
  useEffect(() => {
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      initial[field.name] = field.value || '';
    });
    setEditedFields(initial);
  }, [fields]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const resetField = (fieldName: string) => {
    const original = fields.find((f) => f.name === fieldName);
    if (original) {
      setEditedFields((prev) => ({
        ...prev,
        [fieldName]: original.value || '',
      }));
    }
  };

  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.9) {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <Check className="w-4 h-4" />
          {Math.round(confidence * 100)}%
        </span>
      );
    }
    if (confidence >= 0.7) {
      return (
        <span className="flex items-center gap-1 text-yellow-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {Math.round(confidence * 100)}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm">
        <X className="w-4 h-4" />
        {Math.round(confidence * 100)}%
      </span>
    );
  };

  const hasChanges = () => {
    return fields.some(
      (field) => editedFields[field.name] !== (field.value || '')
    );
  };

  const getFieldLabel = (fieldName: string, locale: string = 'ro') => {
    const labels = fieldLabels[fieldName];
    if (labels) {
      return locale === 'en' ? labels.en : labels.ro;
    }
    return fieldName.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleSubmit = () => {
    // Only send fields that were changed
    const corrections: Record<string, string> = {};
    fields.forEach((field) => {
      if (editedFields[field.name] !== (field.value || '')) {
        corrections[field.name] = editedFields[field.name];
      }
    });
    onSave(corrections);
  };

  // Sort fields by confidence (lowest first - need most attention)
  const sortedFields = [...fields].sort((a, b) => a.confidence - b.confidence);

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900">
          {t('fieldCorrection') || 'Corectare Campuri'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {t('fieldCorrectionHint') ||
            'Verificati si corectati campurile extrase automat'}
        </p>
      </div>

      {/* Fields List */}
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {sortedFields.map((field) => {
          const isEditing = editingField === field.name;
          const isSelected = selectedField === field.name;
          const wasChanged = editedFields[field.name] !== (field.value || '');

          return (
            <div
              key={field.name}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : wasChanged
                  ? 'border-yellow-500 bg-yellow-50'
                  : field.confidence < 0.7
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onFieldSelect?.(field.name)}
            >
              {/* Field Header */}
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  {getFieldLabel(field.name)}
                </label>
                <div className="flex items-center gap-2">
                  {getConfidenceIndicator(field.confidence)}
                  {wasChanged && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetField(field.name);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title={t('resetField') || 'Reseteaza'}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Field Input */}
              <div className="relative">
                <input
                  type="text"
                  value={editedFields[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  onFocus={() => {
                    setEditingField(field.name);
                    onFieldSelect?.(field.name);
                  }}
                  onBlur={() => setEditingField(null)}
                  className={`w-full px-3 py-2 text-sm border rounded-md transition-all ${
                    isEditing
                      ? 'border-blue-500 ring-1 ring-blue-500'
                      : wasChanged
                      ? 'border-yellow-400'
                      : 'border-gray-200'
                  }`}
                  placeholder={t('noValue') || 'Fara valoare'}
                />
                {!editedFields[field.name] && (
                  <span className="absolute right-3 top-2 text-gray-400 text-sm">
                    {t('empty') || '(gol)'}
                  </span>
                )}
              </div>

              {/* Original value hint */}
              {wasChanged && field.value && (
                <p className="mt-1 text-xs text-gray-500">
                  {t('originalValue') || 'Original'}: {field.value}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {hasChanges() && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Edit2 className="w-4 h-4" />
              {t('unsavedChanges') || 'Modificari nesalvate'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {t('cancel') || 'Anuleaza'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !hasChanges()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <RefreshCw className="w-4 h-4 animate-spin" />
            )}
            {t('saveCorrections') || 'Salveaza Corectiile'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FieldEditor;
