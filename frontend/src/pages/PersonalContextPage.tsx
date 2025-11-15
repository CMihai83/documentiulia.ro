import React, { useState, useEffect } from 'react';
import {
  UserCircle,
  Building,
  TrendingUp,
  Target,
  Download,
  Upload,
  Edit,
  Save,
  X
} from 'lucide-react';
import {
  getPersonalContext,
  updatePersonalContext,
  exportPersonalContext,
  importPersonalContext
} from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';

const PersonalContextPage: React.FC = () => {
  const { user } = useAuth();
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadContext();
  }, [user]);

  const loadContext = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await getPersonalContext(user.id);
      if (response.success) {
        setContext(response.context);
        setEditedData(response.context?.context_data || {});
      }
    } catch (err: any) {
      setError('Nu s-a putut încărca contextul personal');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await updatePersonalContext(
        user.id,
        { context_data: editedData },
        'Manual update from Personal Context page'
      );

      if (response.success) {
        setSuccess('Context actualizat cu succes!');
        setContext(response.context);
        setEditing(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Actualizarea a eșuat');
      }
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare la actualizare');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!user?.id) return;

    try {
      await exportPersonalContext(user.id);
      setSuccess('Context exportat cu succes!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Exportul a eșuat');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        const response = await importPersonalContext(user.id!, importedData);

        if (response.success) {
          setSuccess('Context importat cu succes!');
          await loadContext();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(response.message || 'Importul a eșuat');
        }
      } catch (err: any) {
        setError('Fișier invalid sau eroare la import');
      }
    };

    reader.readAsText(file);
  };

  if (loading && !context) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const contextData = context?.context_data || {};
  const basicInfo = contextData.basic_info || {};
  const performanceTracking = contextData.performance_tracking || {};
  const currentMetrics = performanceTracking.current_metrics || {};

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg">
            <UserCircle className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Contextul Meu de Business
            </h1>
            <p className="text-gray-600 mt-1">
              Profilul tău pentru consultanță AI personalizată
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            title="Exportă context"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Export</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden md:inline">Editează</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-300"
              >
                <Save className="w-4 h-4" />
                <span className="hidden md:inline">Salvează</span>
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditedData(context?.context_data || {});
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="hidden md:inline">Anulează</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* No Context State */}
      {!context && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Niciun Context de Business
          </h3>
          <p className="text-gray-600 mb-6">
            Creează-ți contextul de business pentru consultanță AI personalizată
          </p>
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
            Creează Context
          </button>
        </div>
      )}

      {/* Context Display */}
      {context && (
        <>
          {/* Basic Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Informații de Bază
                </h2>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume Business
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {basicInfo.business_name || context.business_name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip Business
                </label>
                <div className="text-lg text-gray-900">
                  {basicInfo.business_type || context.business_type || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industrie
                </label>
                <div className="text-lg text-gray-900">
                  {basicInfo.industry || context.industry || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stadiu Actual
                </label>
                <div className="inline-flex px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {basicInfo.current_stage || context.current_stage || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Current Metrics Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Metrici Curente
                </h2>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 font-medium mb-1">Venit Lunar</div>
                <div className="text-2xl font-bold text-blue-900">
                  {currentMetrics.revenue || 'N/A'}
                </div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium mb-1">Clienți</div>
                <div className="text-2xl font-bold text-green-900">
                  {currentMetrics.customers || 'N/A'}
                </div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600 font-medium mb-1">Creștere</div>
                <div className="text-2xl font-bold text-purple-900">
                  {currentMetrics.growth_rate || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Goals Card */}
          {basicInfo.business_goals && basicInfo.business_goals.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Obiective de Business
                  </h2>
                </div>
              </div>

              <div className="p-6">
                <ul className="space-y-3">
                  {basicInfo.business_goals.map((goal: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-green-600 mt-1">✓</span>
                      <span className="text-gray-700">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Context Stats */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
            <h3 className="text-sm font-semibold text-purple-900 mb-4">
              Statistici Context
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {context.version || '1.0'}
                </div>
                <div className="text-xs text-purple-700">Versiune</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">95%</div>
                <div className="text-xs text-purple-700">Confidence AI</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {context.last_accessed_at ? 'Astăzi' : 'N/A'}
                </div>
                <div className="text-xs text-purple-700">Ultima Accesare</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {context.updated_at ? new Date(context.updated_at).toLocaleDateString('ro-RO') : 'N/A'}
                </div>
                <div className="text-xs text-purple-700">Ultima Actualizare</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PersonalContextPage;
