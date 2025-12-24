'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Edit,
  Trash2,
  FileType,
  Receipt,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  MoreVertical,
  Check,
  X,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Template {
  id: string;
  name: string;
  description: string | null;
  documentType: 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'OTHER';
  language: string;
  isSystem: boolean;
  usageCount: number;
  createdAt: string;
  zones: Record<string, unknown>;
}

interface TrainingResult {
  templateId: string;
  templateName: string;
  totalDocumentsAnalyzed: number;
  totalCorrections: number;
  accuracyRate: number;
  fieldStats: Record<string, { correctionRate: number; avgConfidence: number }>;
  problematicFields: Array<{
    field: string;
    correctionRate: number;
    avgConfidence: number;
    suggestedPatterns: string[];
  }>;
  recommendations: string[];
  appliedChanges: string[];
  canApplyChanges: boolean;
}

const documentTypeIcons = {
  INVOICE: Receipt,
  RECEIPT: FileSpreadsheet,
  CONTRACT: FileText,
  OTHER: FileType,
};

const documentTypeColors = {
  INVOICE: 'bg-blue-100 text-blue-700',
  RECEIPT: 'bg-green-100 text-green-700',
  CONTRACT: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const languageLabels: Record<string, string> = {
  ro: 'Romana',
  en: 'English',
  de: 'Deutsch',
};

export default function TemplatesPage() {
  const router = useRouter();
  const t = useTranslations('ocr');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<Template[]>('/templates');
      if (response.data) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await api.delete(`/templates/${id}`);
      if (!response.error) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleTrain = async (id: string, applyChanges = false) => {
    setIsTraining(true);
    setShowDeleteConfirm(null);
    try {
      const response = await api.post<TrainingResult>(`/templates/${id}/train`, { applyChanges });
      if (response.data) {
        setTrainingResult(response.data);
        if (applyChanges) {
          loadTemplates();
        }
      }
    } catch (error) {
      console.error('Failed to train template:', error);
    } finally {
      setIsTraining(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === 'all' || template.documentType === filterType;
    const matchesLanguage =
      filterLanguage === 'all' || template.language === filterLanguage;
    return matchesSearch && matchesType && matchesLanguage;
  });

  const systemTemplates = filteredTemplates.filter((t) => t.isSystem);
  const customTemplates = filteredTemplates.filter((t) => !t.isSystem);

  const renderTemplateCard = (template: Template) => {
    const Icon = documentTypeIcons[template.documentType] || FileType;
    const isSelected = selectedTemplate === template.id;

    return (
      <div
        key={template.id}
        className={`p-4 rounded-lg border transition-all cursor-pointer ${
          isSelected
            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
        onClick={() => setSelectedTemplate(isSelected ? null : template.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                documentTypeColors[template.documentType]
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>{languageLabels[template.language] || template.language}</span>
                <span>•</span>
                <span>{template.usageCount} utilizari</span>
              </div>
            </div>
          </div>
          {template.isSystem ? (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              System
            </span>
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(
                    showDeleteConfirm === template.id ? null : template.id
                  );
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-400"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showDeleteConfirm === template.id && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrain(template.id);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('train') || 'Antreneaza'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(template.id);
                    }}
                    className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('delete') || 'Sterge'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {template.description}
          </p>
        )}

        {/* Zones Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {Object.keys(template.zones || {}).length}{' '}
            {t('zonesConfigured') || 'zone configurate'}
          </span>
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to template editor
                router.push(`/dashboard/templates/${template.id}`);
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {t('edit') || 'Editeaza'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {t('templatesTitle') || 'Template-uri OCR'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('templatesSubtitle') ||
              'Gestionati template-urile pentru extragerea datelor din documente'}
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('createTemplate') || 'Creeaza Template'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 border-b">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchTemplates') || 'Cauta template-uri...'}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-white"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white"
        >
          <option value="all">{t('allTypes') || 'Toate tipurile'}</option>
          <option value="INVOICE">{t('invoice') || 'Facturi'}</option>
          <option value="RECEIPT">{t('receipt') || 'Bonuri'}</option>
          <option value="CONTRACT">{t('contract') || 'Contracte'}</option>
        </select>

        {/* Language Filter */}
        <select
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white"
        >
          <option value="all">{t('allLanguages') || 'Toate limbile'}</option>
          <option value="ro">Romana</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-40 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileType className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">
              {searchQuery
                ? t('noTemplatesFound') || 'Niciun template gasit'
                : t('noTemplates') || 'Niciun template configurat'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t('createFirstTemplate') || 'Creati primul template'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* System Templates */}
            {systemTemplates.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {t('systemTemplates') || 'Template-uri de Sistem'}
                  <span className="text-gray-400">({systemTemplates.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemTemplates.map(renderTemplateCard)}
                </div>
              </div>
            )}

            {/* Custom Templates */}
            {customTemplates.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-500" />
                  {t('customTemplates') || 'Template-uri Personalizate'}
                  <span className="text-gray-400">({customTemplates.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTemplates.map(renderTemplateCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Training Results Modal */}
      {trainingResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {t('trainingResults') || 'Rezultate Antrenare'}
                    </h2>
                    <p className="text-sm text-gray-500">{trainingResult.templateName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setTrainingResult(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Accuracy Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {trainingResult.accuracyRate}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('accuracy') || 'Acuratete'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {trainingResult.totalDocumentsAnalyzed}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('documentsAnalyzed') || 'Documente'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {trainingResult.totalCorrections}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('corrections') || 'Corectii'}
                  </p>
                </div>
              </div>

              {/* Problematic Fields */}
              {trainingResult.problematicFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    {t('problematicFields') || 'Campuri Problematice'}
                  </h3>
                  <div className="space-y-2">
                    {trainingResult.problematicFields.map((field) => (
                      <div
                        key={field.field}
                        className="flex items-center justify-between bg-amber-50 rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{field.field}</p>
                          <p className="text-sm text-gray-500">
                            {t('correctionRate') || 'Rata corectii'}: {field.correctionRate}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {t('avgConfidence') || 'Incredere'}: {field.avgConfidence}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {trainingResult.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {t('recommendations') || 'Recomandari'}
                  </h3>
                  <ul className="space-y-2">
                    {trainingResult.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-blue-500 mt-0.5">-</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Applied Changes */}
              {trainingResult.appliedChanges.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {t('changesApplied') || 'Modificari Aplicate'}
                  </h3>
                  <ul className="space-y-1">
                    {trainingResult.appliedChanges.map((change, i) => (
                      <li key={i} className="text-sm text-green-700">
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setTrainingResult(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t('close') || 'Inchide'}
              </button>
              {trainingResult.canApplyChanges && trainingResult.appliedChanges.length === 0 && (
                <button
                  onClick={() => handleTrain(trainingResult.templateId, true)}
                  disabled={isTraining}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {isTraining
                    ? (t('applying') || 'Se aplica...')
                    : (t('applyChanges') || 'Aplica Modificari')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
