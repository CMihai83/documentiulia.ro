'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Check,
  AlertTriangle,
  ArrowRight,
  Download,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

interface ExtractedData {
  documentId: string;
  templateName?: string;
  documentType: 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'OTHER';
  language: string;
  overallConfidence: number;
  fields: {
    name: string;
    value: string | null;
    confidence: number;
  }[];
  rawText?: string;
}

interface ExtractionPreviewProps {
  data: ExtractedData;
  onCreateInvoice?: () => void;
  onEdit?: () => void;
  onDownload?: () => void;
  isCreatingInvoice?: boolean;
}

const documentTypeIcons = {
  INVOICE: Receipt,
  RECEIPT: FileSpreadsheet,
  CONTRACT: FileText,
  OTHER: FileText,
};

const documentTypeLabels = {
  INVOICE: { ro: 'Factura', en: 'Invoice' },
  RECEIPT: { ro: 'Bon Fiscal', en: 'Receipt' },
  CONTRACT: { ro: 'Contract', en: 'Contract' },
  OTHER: { ro: 'Altele', en: 'Other' },
};

const languageLabels: Record<string, string> = {
  ro: 'Romana',
  en: 'English',
  de: 'Deutsch',
};

export function ExtractionPreview({
  data,
  onCreateInvoice,
  onEdit,
  onDownload,
  isCreatingInvoice = false,
}: ExtractionPreviewProps) {
  const t = useTranslations('ocr');
  const [showRawText, setShowRawText] = useState(false);

  const Icon = documentTypeIcons[data.documentType] || FileText;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return t('highConfidence') || 'Incredere Ridicata';
    if (confidence >= 0.7) return t('mediumConfidence') || 'Incredere Medie';
    return t('lowConfidence') || 'Incredere Scazuta';
  };

  // Group fields by category
  const invoiceFields = data.fields.filter((f) =>
    ['invoiceNumber', 'invoiceDate', 'dueDate'].includes(f.name)
  );
  const partnerFields = data.fields.filter((f) =>
    ['partnerName', 'partnerCui', 'partnerAddress'].includes(f.name)
  );
  const amountFields = data.fields.filter((f) =>
    ['netAmount', 'vatRate', 'vatAmount', 'grossAmount', 'currency'].includes(f.name)
  );
  const otherFields = data.fields.filter(
    (f) =>
      !invoiceFields.includes(f) &&
      !partnerFields.includes(f) &&
      !amountFields.includes(f)
  );

  const renderFieldGroup = (
    title: string,
    fields: typeof data.fields,
    icon: React.ReactNode
  ) => {
    if (fields.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          {icon}
          {title}
        </h4>
        <div className="space-y-2">
          {fields.map((field) => (
            <div
              key={field.name}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
            >
              <div className="flex-1">
                <span className="text-sm text-gray-500">{field.name}</span>
                <p className="font-medium text-gray-900">
                  {field.value || (
                    <span className="text-gray-400 italic">
                      {t('noValue') || 'Nu a fost detectat'}
                    </span>
                  )}
                </p>
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(
                  field.confidence
                )}`}
              >
                {Math.round(field.confidence * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {documentTypeLabels[data.documentType]?.ro || data.documentType}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {data.templateName && (
                <>
                  <span>{data.templateName}</span>
                  <span>•</span>
                </>
              )}
              <span>{languageLabels[data.language] || data.language}</span>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${getConfidenceColor(
              data.overallConfidence
            )}`}
          >
            {data.overallConfidence >= 0.9 ? (
              <Check className="w-4 h-4 inline mr-1" />
            ) : (
              <AlertTriangle className="w-4 h-4 inline mr-1" />
            )}
            {getConfidenceLabel(data.overallConfidence)}
          </div>
        </div>
      </div>

      {/* Extracted Fields */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {renderFieldGroup(
          t('invoiceInfo') || 'Informatii Factura',
          invoiceFields,
          <Receipt className="w-4 h-4 text-blue-500" />
        )}
        {renderFieldGroup(
          t('partnerInfo') || 'Informatii Partener',
          partnerFields,
          <FileText className="w-4 h-4 text-green-500" />
        )}
        {renderFieldGroup(
          t('amounts') || 'Sume',
          amountFields,
          <FileSpreadsheet className="w-4 h-4 text-purple-500" />
        )}
        {renderFieldGroup(
          t('otherFields') || 'Alte Campuri',
          otherFields,
          <FileText className="w-4 h-4 text-gray-500" />
        )}

        {/* Raw Text Toggle */}
        {data.rawText && (
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showRawText
                ? t('hideRawText') || 'Ascunde Text Brut'
                : t('showRawText') || 'Arata Text Brut'}
            </button>
            {showRawText && (
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {data.rawText}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t flex items-center gap-3">
        {data.overallConfidence < 0.7 && (
          <div className="flex-1 flex items-center gap-2 text-sm text-yellow-700">
            <AlertTriangle className="w-4 h-4" />
            {t('lowConfidenceWarning') ||
              'Incredere scazuta - verificati campurile'}
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-md hover:bg-gray-100"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm text-gray-700 border rounded-md hover:bg-gray-100"
            >
              {t('editFields') || 'Editeaza Campuri'}
            </button>
          )}
          {onCreateInvoice && data.documentType === 'INVOICE' && (
            <button
              onClick={onCreateInvoice}
              disabled={isCreatingInvoice}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {t('createInvoice') || 'Creeaza Factura'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExtractionPreview;
