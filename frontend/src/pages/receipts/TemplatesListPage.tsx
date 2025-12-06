import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Edit, Trash2, Calendar, TrendingUp } from 'lucide-react';

interface Template {
  id: number;
  merchant_name: string;
  merchant_pattern: string;
  date_pattern: string | null;
  amount_pattern: string | null;
  vat_pattern: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const TemplatesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch('/api/v1/receipts/templates.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to load templates');
      }

      setTemplates(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = async (merchantName: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      // Fetch the most recent receipt for this merchant
      const response = await fetch('/api/v1/receipts/list.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch receipts');
      }

      // Find the most recent receipt from this merchant
      const merchantReceipt = result.data.find((r: any) =>
        r.merchant_name === merchantName
      );

      if (!merchantReceipt) {
        alert(`Nu s-a găsit nicio chitanță de la ${merchantName}. Încărcați o chitanță nouă pentru a edita șablonul.`);
        navigate('/receipts/upload');
        return;
      }

      // Navigate to template editor with this receipt
      navigate(`/receipts/template/${merchantReceipt.id}`);
    } catch (err: any) {
      alert(`Eroare: ${err.message}`);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Sigur doriți să ștergeți acest șablon?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(`/api/v1/receipts/templates.php?id=${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete template');
      }

      // Reload templates after deletion
      loadTemplates();
    } catch (err: any) {
      alert(`Eroare: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă șabloanele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Layers className="w-8 h-8 text-blue-600" />
                Șabloane OCR
              </h1>
              <p className="text-gray-600 mt-2">
                Gestionați șabloanele pentru recunoașterea automată a datelor din chitanțe
              </p>
            </div>
            <button
              onClick={() => navigate('/receipts/list')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Mergi la Chitanțe
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Eroare:</p>
            <p>{error}</p>
          </div>
        )}

        {templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nu există șabloane configurate
            </h3>
            <p className="text-gray-600 mb-6">
              Șabloanele se creează automat când corectați datele extrase din chitanțe
            </p>
            <button
              onClick={() => navigate('/receipts/upload')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Încarcă Prima Chitanță
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="p-6">
                  {/* Merchant Name */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span>{template.merchant_name}</span>
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{template.id}
                    </span>
                  </h3>

                  {/* Stats */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span>Utilizat de <strong>{template.usage_count}</strong> {template.usage_count === 1 ? 'dată' : 'ori'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Creat: {formatDate(template.created_at)}</span>
                    </div>
                  </div>

                  {/* Patterns */}
                  <div className="space-y-2 mb-6 text-sm">
                    {template.amount_pattern && (
                      <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                        <span className="font-medium text-green-900">Sumă:</span>
                        <span className="ml-2 text-green-700 font-mono text-xs">
                          {template.amount_pattern.length > 30
                            ? template.amount_pattern.substring(0, 30) + '...'
                            : template.amount_pattern}
                        </span>
                      </div>
                    )}
                    {template.date_pattern && (
                      <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                        <span className="font-medium text-blue-900">Dată:</span>
                        <span className="ml-2 text-blue-700 font-mono text-xs">
                          {template.date_pattern}
                        </span>
                      </div>
                    )}
                    {template.vat_pattern && (
                      <div className="bg-purple-50 border border-purple-200 rounded px-3 py-2">
                        <span className="font-medium text-purple-900">TVA:</span>
                        <span className="ml-2 text-purple-700 font-mono text-xs">
                          {template.vat_pattern.length > 30
                            ? template.vat_pattern.substring(0, 30) + '...'
                            : template.vat_pattern}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTemplate(template.merchant_name)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Editează</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      title="Șterge șablon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            💡 Cum funcționează șabloanele?
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold mt-0.5">1.</span>
              <span>Încărcați o chitanță și procesați-o cu OCR</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold mt-0.5">2.</span>
              <span>Dacă datele extrase nu sunt corecte, corectați-le și salvați șablonul</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold mt-0.5">3.</span>
              <span>Următoarele chitanțe de la același comerciant vor folosi șablonul salvat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold mt-0.5">4.</span>
              <span>Șabloanele se îmbunătățesc automat cu fiecare corecție</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TemplatesListPage;
