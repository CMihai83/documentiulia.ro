'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader2,
  Award,
  TrendingUp,
  Target,
} from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  explanation?: string;
}

interface Assessment {
  id: string;
  title: string;
  description?: string;
  type: 'QUIZ' | 'EXAM' | 'ASSIGNMENT' | 'PRACTICE';
  questions: Question[];
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number;
  settings?: {
    randomizeQuestions?: boolean;
    randomizeOptions?: boolean;
    showCorrectAnswers?: boolean;
    showExplanations?: boolean;
    allowReview?: boolean;
  };
}

interface Attempt {
  id: string;
  assessmentId: string;
  userId: string;
  enrollmentId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  score?: number;
  percentage?: number;
  passed?: boolean;
  startedAt: string;
  submittedAt?: string;
  answers: AttemptAnswer[];
  timeSpent?: number;
}

interface AttemptAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  pointsEarned?: number;
}

interface QuizPlayerProps {
  assessmentId: string;
  userId: string;
  enrollmentId: string;
  onComplete?: (attempt: Attempt) => void;
}

export function QuizPlayer({ assessmentId, userId, enrollmentId, onComplete }: QuizPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadAssessmentAndStartAttempt();
  }, [assessmentId]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining === 0 || attempt?.status !== 'IN_PROGRESS') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, attempt?.status]);

  async function loadAssessmentAndStartAttempt() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Load assessment
      const assessmentRes = await fetch(`/api/lms/assessments/${assessmentId}`, { headers });
      if (!assessmentRes.ok) throw new Error('Failed to load assessment');
      const assessmentData = await assessmentRes.json();
      setAssessment(assessmentData);

      // Start new attempt
      const attemptRes = await fetch(`/api/lms/assessments/${assessmentId}/attempts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, enrollmentId }),
      });
      if (!attemptRes.ok) throw new Error('Failed to start attempt');
      const attemptData = await attemptRes.json();
      setAttempt(attemptData);

      // Initialize timer if time limit exists
      if (assessmentData.timeLimit) {
        setTimeRemaining(assessmentData.timeLimit * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!attempt || !assessment) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const attemptAnswers: AttemptAnswer[] = assessment.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      const response = await fetch(`/api/lms/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: attemptAnswers }),
      });

      if (response.ok) {
        const result = await response.json();
        setAttempt(result);
        setShowResults(true);
        onComplete?.(result);
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnswerChange(questionId: string, answer: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!assessment || !attempt) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Nu s-a putut încărca quiz-ul</p>
      </div>
    );
  }

  if (showResults && attempt.status === 'GRADED') {
    const passed = attempt.passed || false;
    return (
      <div className="max-w-3xl mx-auto">
        <div className={`rounded-lg p-8 text-center ${
          passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {passed ? (
            <>
              <Award className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-green-900 mb-2">Felicitări!</h2>
              <p className="text-green-700 mb-6">Ai trecut testul cu succes!</p>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-red-900 mb-2">Încearcă din nou</h2>
              <p className="text-red-700 mb-6">Nu ai atins pragul minim pentru promovare</p>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">Scor</span>
              </div>
              <p className="text-2xl font-bold">{attempt.score || 0}</p>
              <p className="text-xs text-gray-500">din {assessment.questions.reduce((sum, q) => sum + q.points, 0)} puncte</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">Procent</span>
              </div>
              <p className={`text-2xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {attempt.percentage || 0}%
              </p>
              <p className="text-xs text-gray-500">minim {assessment.passingScore}%</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">Timp</span>
              </div>
              <p className="text-2xl font-bold">{formatTime(attempt.timeSpent || 0)}</p>
              <p className="text-xs text-gray-500">din {assessment.timeLimit ? `${assessment.timeLimit} min` : 'nelimitat'}</p>
            </div>
          </div>

          {assessment.settings?.showCorrectAnswers && (
            <div className="text-left bg-white rounded-lg p-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Răspunsuri</h3>
              <div className="space-y-4">
                {assessment.questions.map((question, index) => {
                  const attemptAnswer = attempt.answers.find(a => a.questionId === question.id);
                  const isCorrect = attemptAnswer?.isCorrect || false;

                  return (
                    <div key={question.id} className="border-b pb-4">
                      <div className="flex items-start gap-3 mb-2">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mt-1" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-1">
                            {index + 1}. {question.text}
                          </p>
                          <p className="text-sm text-gray-600">
                            Răspunsul tău: <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                              {Array.isArray(attemptAnswer?.answer)
                                ? attemptAnswer.answer.join(', ')
                                : attemptAnswer?.answer || 'Niciun răspuns'}
                            </span>
                          </p>
                          {!isCorrect && question.correctAnswer && (
                            <p className="text-sm text-green-700 mt-1">
                              Răspuns corect: {Array.isArray(question.correctAnswer)
                                ? question.correctAnswer.join(', ')
                                : question.correctAnswer}
                            </p>
                          )}
                          {assessment.settings?.showExplanations && question.explanation && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              {question.explanation}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium">
                          {attemptAnswer?.pointsEarned || 0}/{question.points}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === assessment.questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
            {assessment.description && (
              <p className="text-gray-600 mt-1">{assessment.description}</p>
            )}
          </div>
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              <Clock className="h-5 w-5" />
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Întrebarea {currentQuestionIndex + 1} din {assessment.questions.length}
          </p>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {currentQuestionIndex + 1}. {currentQuestion.text}
            </h3>
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {currentQuestion.points} {currentQuestion.points === 1 ? 'punct' : 'puncte'}
            </span>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'SINGLE_CHOICE' && currentQuestion.options && (
              currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">{option}</span>
                </label>
              ))
            )}

            {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
              currentQuestion.options.map((option, index) => {
                const currentAnswers = (answers[currentQuestion.id] as string[]) || [];
                return (
                  <label
                    key={index}
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      value={option}
                      checked={currentAnswers.includes(option)}
                      onChange={(e) => {
                        const newAnswers = e.target.checked
                          ? [...currentAnswers, option]
                          : currentAnswers.filter(a => a !== option);
                        handleAnswerChange(currentQuestion.id, newAnswers);
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900">{option}</span>
                  </label>
                );
              })
            )}

            {currentQuestion.type === 'TRUE_FALSE' && (
              <>
                <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="true"
                    checked={answers[currentQuestion.id] === 'true'}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">Adevărat</span>
                </label>
                <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="false"
                    checked={answers[currentQuestion.id] === 'false'}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">Fals</span>
                </label>
              </>
            )}

            {(currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'ESSAY') && (
              <textarea
                value={(answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                rows={currentQuestion.type === 'ESSAY' ? 8 : 3}
                placeholder="Scrie răspunsul tău aici..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Înapoi
          </button>

          {!isLastQuestion ? (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Următoarea
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Se trimite...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Trimite Răspunsurile
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Question Navigation Grid */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h4 className="font-medium text-gray-900 mb-3">Navighează la întrebare:</h4>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {assessment.questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`aspect-square rounded-lg font-medium text-sm transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-blue-600 text-white'
                  : answers[q.id]
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-3">
          <span className="inline-block w-3 h-3 bg-green-100 rounded mr-1"></span>
          Răspuns dat ·
          <span className="inline-block w-3 h-3 bg-gray-100 rounded mx-1"></span>
          Fără răspuns ·
          <span className="inline-block w-3 h-3 bg-blue-600 rounded mx-1"></span>
          Curentă
        </p>
      </div>
    </div>
  );
}
