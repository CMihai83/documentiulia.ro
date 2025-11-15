import React, { useState } from 'react';
import { Send, Lightbulb, BookOpen, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface FiscalAnswer {
  success: boolean;
  method: 'decision_tree' | 'ai' | 'queued';
  answer?: string;
  references?: string[];
  mba_recommendations?: MBARecommendation[];
  strategic_advice?: string;
}

interface MBARecommendation {
  framework: string;
  book: string;
  book_id: number;
  recommendation: string;
  fiscal_benefit: string;
  tactical_steps: string[];
  estimated_savings?: string;
}

const HybridFiscalConsultant: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [fiscalAnswer, setFiscalAnswer] = useState<FiscalAnswer | null>(null);
  const [mbaRecommendations, setMbaRecommendations] = useState<MBARecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'fiscal' | 'mba'>('fiscal');

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setFiscalAnswer(null);
    setMbaRecommendations([]);

    try {
      // Get fiscal answer
      const fiscalResponse = await fetch('/api/v1/fiscal/hybrid-consultant.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user_id: localStorage.getItem('user_id'),
          company_id: localStorage.getItem('company_id')
        })
      });

      const fiscalData = await fiscalResponse.json();
      setFiscalAnswer(fiscalData);

      // Get MBA recommendations in parallel
      const mbaResponse = await fetch('/api/v1/mba/recommendations.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fiscal_situation: question,
          user_id: localStorage.getItem('user_id'),
          company_id: localStorage.getItem('company_id')
        })
      });

      const mbaData = await mbaResponse.json();
      if (mbaData.success && mbaData.recommendations) {
        setMbaRecommendations(mbaData.recommendations);
      }

    } catch (error) {
      console.error('Consultation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Consultant Fiscal + Strategie MBA
        </h1>
        <p className="text-gray-600">
          Primești răspunsuri fiscale + strategii de business din cele 99 de cărți MBA
        </p>
      </div>

      {/* Question Input */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pune o întrebare fiscală sau de business:
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
              placeholder="Ex: Vreau să îmi deschid un business, cum încep?"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={askQuestion}
              disabled={loading || !question.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Procesez...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Întreabă
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Sugestii:</span>
            {[
              'Cum mă înregistrez la TVA?',
              'PFA sau Microîntreprindere?',
              'Cum optimizez taxele?',
              'Când angajez primul salariat?'
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuestion(suggestion)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {fiscalAnswer && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('fiscal')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'fiscal'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <AlertCircle className="w-5 h-5 inline mr-2" />
              Răspuns Fiscal
            </button>
            <button
              onClick={() => setActiveTab('mba')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'mba'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Strategie MBA
              {mbaRecommendations.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {mbaRecommendations.length}
                </span>
              )}
            </button>
          </div>

          {/* Fiscal Answer Tab */}
          {activeTab === 'fiscal' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Răspuns Fiscal</h2>
                  {fiscalAnswer.answer && (
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: fiscalAnswer.answer }}
                    />
                  )}
                </div>
              </div>

              {/* References */}
              {fiscalAnswer.references && fiscalAnswer.references.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">📚 Referințe Legislative:</h3>
                  <ul className="space-y-1">
                    {fiscalAnswer.references.map((ref, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        • {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* MBA Recommendations Tab */}
          {activeTab === 'mba' && (
            <div className="space-y-4">
              {mbaRecommendations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Se procesează recomandările MBA pentru situația ta...
                  </p>
                </div>
              ) : (
                mbaRecommendations.map((rec, idx) => (
                  <MBARecommendationCard key={idx} recommendation={rec} />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MBARecommendationCardProps {
  recommendation: MBARecommendation;
}

const MBARecommendationCard: React.FC<MBARecommendationCardProps> = ({ recommendation }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border-l-4 border-blue-600 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-gray-900">{recommendation.framework}</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BookOpen className="w-4 h-4" />
              <span>{recommendation.book}</span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            {expanded ? 'Ascunde' : 'Detalii'}
          </button>
        </div>

        {/* Main Recommendation */}
        <div className="mb-4">
          <p className="text-gray-800 leading-relaxed">{recommendation.recommendation}</p>
        </div>

        {/* Fiscal Benefit */}
        <div className="p-4 bg-green-50 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 mb-1">Beneficiu Fiscal:</h4>
              <p className="text-green-800 text-sm">{recommendation.fiscal_benefit}</p>
              {recommendation.estimated_savings && (
                <p className="text-green-700 font-semibold mt-2">
                  💰 Economie estimată: {recommendation.estimated_savings}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tactical Steps */}
        {expanded && recommendation.tactical_steps && (
          <div className="mt-4">
            <h4 className="font-semibold text-gray-900 mb-3">✅ Pași Tactici:</h4>
            <ol className="space-y-2">
              {recommendation.tactical_steps.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 flex-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default HybridFiscalConsultant;
