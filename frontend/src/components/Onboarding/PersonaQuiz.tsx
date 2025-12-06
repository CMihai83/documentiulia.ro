import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';

interface QuizOption {
  value: string;
  label: string;
  persona_weights: Record<string, number>;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  question_order: number;
}

interface QuizAnswer {
  question_id: string;
  value: string;
}

interface Recommendation {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  recommended_tier: string;
  score: number;
  match_percentage: number;
}

interface PersonaQuizProps {
  onComplete: (recommendation: Recommendation) => void;
  onBack: () => void;
}

const PersonaQuiz: React.FC<PersonaQuizProps> = ({ onComplete, onBack }) => {
  const { language } = useI18n();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    recommended: Recommendation;
    alternatives: Recommendation[];
  } | null>(null);

  useEffect(() => {
    loadQuestions();
  }, [language]);

  const loadQuestions = async () => {
    try {
      const response = await fetch('/api/v1/personas/quiz.php', {
        headers: {
          'Accept-Language': language
        }
      });
      const data = await response.json();
      if (data.success) {
        setQuestions(data.data);
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (value: string) => {
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(
      a => a.question_id === questions[currentIndex].id
    );

    if (existingIndex >= 0) {
      newAnswers[existingIndex].value = value;
    } else {
      newAnswers.push({
        question_id: questions[currentIndex].id,
        value
      });
    }

    setAnswers(newAnswers);

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        submitQuiz(newAnswers);
      }
    }, 300);
  };

  const submitQuiz = async (finalAnswers: QuizAnswer[]) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/v1/personas/quiz.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language
        },
        body: JSON.stringify({ answers: finalAnswers })
      });
      const data = await response.json();
      if (data.success) {
        setRecommendation(data.data);
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentAnswer = () => {
    const answer = answers.find(a => a.question_id === questions[currentIndex]?.id);
    return answer?.value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show recommendation
  if (recommendation) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Result header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'ro' ? 'Am gasit profilul potrivit!' : 'We found the right profile!'}
          </h2>
          <p className="text-gray-600">
            {language === 'ro'
              ? `Bazat pe raspunsurile tale, iti recomandam:`
              : `Based on your answers, we recommend:`}
          </p>
        </div>

        {/* Main recommendation */}
        <div
          className="p-6 rounded-xl mb-6"
          style={{ backgroundColor: `${recommendation.recommended.color}10` }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${recommendation.recommended.color}20` }}
            >
              <span className="text-3xl">{recommendation.recommended.icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {recommendation.recommended.name}
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: recommendation.recommended.color }}
                >
                  {recommendation.recommended.match_percentage}% {language === 'ro' ? 'potrivire' : 'match'}
                </span>
              </div>
              <p className="text-gray-600">{recommendation.recommended.description}</p>
            </div>
          </div>

          <button
            onClick={() => onComplete(recommendation.recommended)}
            className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {language === 'ro' ? 'Continua cu acest profil' : 'Continue with this profile'}
          </button>
        </div>

        {/* Alternatives */}
        {recommendation.alternatives.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              {language === 'ro' ? 'Alte optiuni potrivite:' : 'Other suitable options:'}
            </p>
            <div className="space-y-2">
              {recommendation.alternatives.map(alt => (
                <button
                  key={alt.id}
                  onClick={() => onComplete(alt)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{alt.icon}</span>
                    <span className="font-medium text-gray-900">{alt.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {alt.match_percentage}% {language === 'ro' ? 'potrivire' : 'match'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          className="mt-6 text-gray-500 hover:text-gray-700"
        >
          {language === 'ro' ? 'Inapoi la selectie manuala' : 'Back to manual selection'}
        </button>
      </div>
    );
  }

  // Show submitting state
  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">
          {language === 'ro' ? 'Analizam raspunsurile...' : 'Analyzing your answers...'}
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>
            {language === 'ro' ? 'Intrebarea' : 'Question'} {currentIndex + 1} / {questions.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {currentQuestion.question}
        </h2>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {currentQuestion.options.map(option => (
          <button
            key={option.value}
            onClick={() => handleAnswer(option.value)}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              getCurrentAnswer() === option.value
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <span className="font-medium text-gray-900">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => currentIndex > 0 ? setCurrentIndex(currentIndex - 1) : onBack()}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          {language === 'ro' ? 'Inapoi' : 'Back'}
        </button>

        {currentIndex < questions.length - 1 && getCurrentAnswer() && (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {language === 'ro' ? 'Urmatoarea' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonaQuiz;
