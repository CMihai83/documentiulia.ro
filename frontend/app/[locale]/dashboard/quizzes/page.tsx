'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Copy,
  BarChart3,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  ArrowLeft,
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
  courseId: string;
  title: string;
  description?: string;
  type: 'QUIZ' | 'EXAM' | 'ASSIGNMENT' | 'PRACTICE';
  questions: Question[];
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  settings?: {
    randomizeQuestions?: boolean;
    randomizeOptions?: boolean;
    showCorrectAnswers?: boolean;
    showExplanations?: boolean;
    allowReview?: boolean;
  };
  stats?: {
    totalAttempts: number;
    averageScore: number;
    passRate: number;
  };
}

export default function QuizzesManagementPage() {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'QUIZ' as Assessment['type'],
    courseId: '',
    passingScore: 70,
    maxAttempts: 3,
    timeLimit: 30,
  });

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      // Note: This endpoint would need to be enhanced to list all assessments for a tenant/instructor
      // Currently we're simulating with an empty array
      // In production: const response = await fetch('/api/lms/assessments?instructorId=...', ...)
      setAssessments([]);
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAssessment() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/lms/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          questions: [], // Initially empty, questions added later
        }),
      });

      if (response.ok) {
        await fetchAssessments();
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          type: 'QUIZ',
          courseId: '',
          passingScore: 70,
          maxAttempts: 3,
          timeLimit: 30,
        });
      }
    } catch (error) {
      console.error('Failed to create assessment:', error);
    }
  }

  async function deleteAssessment(id: string) {
    if (!confirm('Sigur dorești să ștergi acest quiz?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      // DELETE endpoint would need to be added to backend
      // await fetch(`/api/lms/assessments/${id}`, { method: 'DELETE', headers: {...} });
      await fetchAssessments();
    } catch (error) {
      console.error('Failed to delete assessment:', error);
    }
  }

  async function duplicateAssessment(assessment: Assessment) {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/lms/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...assessment,
          title: `${assessment.title} (Copie)`,
          id: undefined,
          status: 'DRAFT',
        }),
      });

      if (response.ok) {
        await fetchAssessments();
      }
    } catch (error) {
      console.error('Failed to duplicate assessment:', error);
    }
  }

  async function publishAssessment(id: string) {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/lms/assessments/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchAssessments();
      }
    } catch (error) {
      console.error('Failed to publish assessment:', error);
    }
  }

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || assessment.type === filterType;
    const matchesStatus = filterStatus === 'all' || assessment.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadge = (type: string) => {
    const styles = {
      QUIZ: 'bg-blue-100 text-blue-700',
      EXAM: 'bg-red-100 text-red-700',
      ASSIGNMENT: 'bg-purple-100 text-purple-700',
      PRACTICE: 'bg-green-100 text-green-700',
    };
    const labels = {
      QUIZ: 'Quiz',
      EXAM: 'Examen',
      ASSIGNMENT: 'Temă',
      PRACTICE: 'Practică',
    };
    return { color: styles[type as keyof typeof styles], label: labels[type as keyof typeof labels] };
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PUBLISHED: 'bg-green-100 text-green-700',
      ARCHIVED: 'bg-orange-100 text-orange-700',
    };
    const labels = {
      DRAFT: 'Ciornă',
      PUBLISHED: 'Publicat',
      ARCHIVED: 'Arhivat',
    };
    return { color: styles[status as keyof typeof styles], label: labels[status as keyof typeof labels] };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi la Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestionare Quizuri și Evaluări</h1>
            <p className="text-gray-600 mt-1">
              Creează, editează și monitorizează quizuri pentru cursuri
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Quiz Nou
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Quizuri</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {assessments.length}
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Publicate</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {assessments.filter(a => a.status === 'PUBLISHED').length}
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Participanți</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {assessments.reduce((sum, a) => sum + (a.stats?.totalAttempts || 0), 0)}
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Rată Promovare</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {assessments.length > 0
                  ? Math.round(
                      assessments.reduce((sum, a) => sum + (a.stats?.passRate || 0), 0) /
                      assessments.length
                    )
                  : 0}%
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caută
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nume quiz..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tip
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate</option>
              <option value="QUIZ">Quiz</option>
              <option value="EXAM">Examen</option>
              <option value="ASSIGNMENT">Temă</option>
              <option value="PRACTICE">Practică</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate</option>
              <option value="DRAFT">Ciorne</option>
              <option value="PUBLISHED">Publicate</option>
              <option value="ARCHIVED">Arhivate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assessments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Niciun quiz găsit
          </h3>
          <p className="text-gray-600 mb-6">
            Începe prin a crea primul quiz pentru cursurile tale
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Creează Quiz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment) => {
            const typeBadge = getTypeBadge(assessment.type);
            const statusBadge = getStatusBadge(assessment.status);

            return (
              <div key={assessment.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadge.color}`}>
                      {typeBadge.label}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2">{assessment.title}</h3>
                  {assessment.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {assessment.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Întrebări:</span>
                      <span className="font-medium">{assessment.questions.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Durată:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {assessment.timeLimit ? `${assessment.timeLimit} min` : 'Nelimitată'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Prag promovare:</span>
                      <span className="font-medium">{assessment.passingScore}%</span>
                    </div>
                    {assessment.stats && (
                      <div className="flex items-center justify-between text-sm border-t pt-2">
                        <span className="text-gray-600">Încercări:</span>
                        <span className="font-medium">{assessment.stats.totalAttempts}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t">
                    <button
                      onClick={() => setSelectedAssessment(assessment)}
                      className="flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-blue-600 py-2"
                      title="Vizualizare"
                    >
                      <Eye className="h-4 w-4" />
                      Detalii
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-green-600 py-2"
                      title="Editează"
                    >
                      <Edit className="h-4 w-4" />
                      Editează
                    </button>
                    <button
                      onClick={() => duplicateAssessment(assessment)}
                      className="flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-purple-600 py-2"
                      title="Duplică"
                    >
                      <Copy className="h-4 w-4" />
                      Duplică
                    </button>
                    <button
                      onClick={() => deleteAssessment(assessment.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-red-600 py-2"
                      title="Șterge"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {assessment.status === 'DRAFT' && (
                    <button
                      onClick={() => publishAssessment(assessment.id)}
                      className="w-full mt-3 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Publică Quiz
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Creează Quiz Nou</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titlu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="De ex: Quiz TVA și Fiscalitate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descriere
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descriere scurtă a quiz-ului..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tip Quiz
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Assessment['type'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="QUIZ">Quiz</option>
                    <option value="EXAM">Examen</option>
                    <option value="ASSIGNMENT">Temă</option>
                    <option value="PRACTICE">Practică</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durată (minute)
                  </label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prag Promovare (%)
                  </label>
                  <input
                    type="number"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Număr Încercări
                  </label>
                  <input
                    type="number"
                    value={formData.maxAttempts}
                    onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Anulează
                </button>
                <button
                  onClick={handleCreateAssessment}
                  disabled={!formData.title}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Creează Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{selectedAssessment.title}</h2>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <div className="space-y-6">
              {selectedAssessment.description && (
                <p className="text-gray-600">{selectedAssessment.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Tip</p>
                  <p className="font-medium">{getTypeBadge(selectedAssessment.type).label}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Întrebări</p>
                  <p className="font-medium">{selectedAssessment.questions.length}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Durată</p>
                  <p className="font-medium">{selectedAssessment.timeLimit ? `${selectedAssessment.timeLimit} min` : 'Nelimitată'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Prag</p>
                  <p className="font-medium">{selectedAssessment.passingScore}%</p>
                </div>
              </div>

              {selectedAssessment.stats && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Statistici
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Încercări</p>
                      <p className="text-2xl font-bold">{selectedAssessment.stats.totalAttempts}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Scor Mediu</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedAssessment.stats.averageScore}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rată Promovare</p>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedAssessment.stats.passRate}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">Întrebări ({selectedAssessment.questions.length})</h3>
                <div className="space-y-3">
                  {selectedAssessment.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium">
                          {index + 1}. {question.text}
                        </p>
                        <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {question.points}p
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Tip: {question.type}</p>
                      {question.options && question.options.length > 0 && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-600 mb-1">Opțiuni:</p>
                          <ul className="list-disc list-inside text-gray-700">
                            {question.options.map((opt, i) => (
                              <li key={i}>{opt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
