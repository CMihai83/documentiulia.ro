import React, { useState } from 'react';
import { Brain, Send, Sparkles, BookOpen, TrendingUp } from 'lucide-react';
import { businessConsult } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';

const BusinessConsultantPage: React.FC = () => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [contextUsed, setContextUsed] = useState(false);
  const [error, setError] = useState('');

  const exampleQuestions = [
    "Cum pot să-mi cresc veniturile?",
    "Ce strategie de preț ar trebui să folosesc?",
    "Ar trebui să angajez mai mulți angajați acum?",
    "Cum îmi îmbunătățesc fluxul de numerar?",
    "Care sunt cele 5 părți ale oricărei afaceri?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const response = await businessConsult(question, user?.id);

      if (response.success !== false) {
        setAnswer(response.answer || 'No answer received');
        setConfidence(response.confidence * 100 || 90);
        setContextUsed(response.context_used || false);
      } else {
        setError(response.message || 'Failed to get consultation');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while consulting the AI');
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
        <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Consultant de Afaceri AI
          </h1>
          <p className="text-gray-600 mt-1">
            Sfaturi strategice bazate pe principii dovedite de business și inteligență artificială
          </p>
        </div>
      </div>

      {/* Context Status Banner */}
      {contextUsed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-900">
              Răspuns Personalizat Activ
            </p>
            <p className="text-xs text-green-700">
              Folosim contextul tău de business pentru sfaturi personalizate ({confidence.toFixed(0)}% confidență)
            </p>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Pune Întrebarea Ta de Business
          </h2>
          <p className="text-sm text-gray-600">
            Primește sfaturi strategice despre venituri, marketing, vânzări, operațiuni și finanțe
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Exemplu: Cum pot să-mi cresc veniturile lunare cu 30%?"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Se gândește...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Primește Sfaturi AI</span>
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
                <Brain className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Răspuns Consultant AI:</span>
                <span className="ml-auto bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  {confidence.toFixed(0)}% Confidență
                </span>
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div
                  className="text-gray-800 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: answer }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Example Questions */}
      {!answer && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-600" />
            Întrebări Exemplu
          </h3>
          <div className="space-y-2">
            {exampleQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(q)}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-sm text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-semibold text-blue-900">Crearea de Valoare</h4>
          </div>
          <p className="text-sm text-blue-800">
            Descoperă ce au nevoie oamenii și creează produse sau servicii care rezolvă probleme reale
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-semibold text-green-900">Marketing & Vânzări</h4>
          </div>
          <p className="text-sm text-green-800">
            Atrage atenția, construiește cererea și transformă prospecții în clienți plătitori
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-semibold text-purple-900">Finanțe</h4>
          </div>
          <p className="text-sm text-purple-800">
            Gestionează fluxul de numerar, prețurile și profitabilitatea pentru a construi o afacere sustenabilă
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessConsultantPage;
