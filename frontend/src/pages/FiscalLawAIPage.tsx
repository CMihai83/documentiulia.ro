import React, { useState } from 'react';
import { Scale, Send, FileText, Calendar, AlertCircle } from 'lucide-react';
import { fiscalConsult } from '../services/aiService';

const FiscalLawAIPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [articles, setArticles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exampleQuestions = [
    "Care este pragul de înregistrare pentru TVA în 2025?",
    "Ce condiții trebuie să îndeplinesc pentru regimul de microîntreprindere?",
    "Cum se calculează contribuțiile sociale pentru PFA?",
    "Când trebuie depusă Declarația Unică?",
    "Ce cheltuieli sunt deductibile fiscal?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    setAnswer('');
    setArticles([]);

    try {
      const response = await fiscalConsult(question);

      if (response.success !== false) {
        setAnswer(response.answer || 'Nu am primit un răspuns');
        setArticles(response.articles_referenced || []);
      } else {
        setError(response.message || 'Consultarea fiscală a eșuat');
      }
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare la consultarea legislației fiscale');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (exampleQuestion: string) => {
    setQuestion(exampleQuestion);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
          <Scale className="w-10 h-10 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇷🇴</span>
            <h1 className="text-3xl font-bold text-gray-900">
              Consultant Fiscal AI
            </h1>
          </div>
          <p className="text-gray-600 mt-1">
            628 articole din Codul Fiscal 2015 • Răspunsuri cu referințe legale
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 mb-1">
            Consultanță Fiscală Automată
          </p>
          <p className="text-xs text-blue-700">
            AI-ul are acces la întreaga legislație fiscală română și poate interpreta situații complexe.
            Răspunsurile includ referințe la articolele relevante din Codul Fiscal.
          </p>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Pune Întrebarea Ta Fiscală
          </h2>
          <p className="text-sm text-gray-600">
            Scrie în limba română pentru cele mai bune rezultate
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Exemplu: Care este pragul de înregistrare pentru TVA în 2025?"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Analizez legislația...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Consultă Legislația</span>
                </>
              )}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Answer Display */}
          {answer && !loading && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Scale className="w-4 h-4 text-green-600" />
                <span className="font-medium">Răspuns AI cu Bază Legală:</span>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div
                  className="text-gray-800 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: answer }}
                />
              </div>

              {/* Referenced Articles */}
              {articles && articles.length > 0 && (
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h4 className="font-semibold text-gray-900">
                      Articole Referite:
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {articles.map((article, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span>{article}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Example Questions */}
      {!answer && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Întrebări Frecvente
          </h3>
          <div className="space-y-2">
            {exampleQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(q)}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-green-50 rounded-lg transition-colors text-sm text-gray-700 hover:text-green-700 border border-gray-200 hover:border-green-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-semibold text-blue-900">Termene Importante</h4>
          </div>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• 25 ale lunii - Declarație TVA (D300)</li>
            <li>• 25 ale lunii - Plata TVA</li>
            <li>• 25 Mai - Declarația Unică (D212)</li>
            <li>• 31 Martie - Bilanț contabil</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-semibold text-green-900">Template-uri Disponibile</h4>
          </div>
          <ul className="text-sm text-green-800 space-y-2">
            <li>• Declarația Unică (D212)</li>
            <li>• Declarație TVA (D300)</li>
            <li>• Bilanț Contabil (D101)</li>
            <li>• Declarație REVISAL</li>
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-800">
        <strong>Notă importantă:</strong> Informațiile furnizate de AI sunt orientative și bazate pe Codul Fiscal 2015.
        Pentru situații complexe sau decizii importante, vă recomandăm să consultați un expert contabil autorizat.
      </div>
    </div>
  );
};

export default FiscalLawAIPage;
