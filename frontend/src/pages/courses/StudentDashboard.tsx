import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Enrollment {
  enrollment_id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  course_thumbnail: string;
  enrolled_at: string;
  last_accessed_at: string;
  completion_percentage: number;
  lessons_completed: number;
  total_lessons: number;
  current_lesson_id: number | null;
  current_lesson_name: string | null;
  time_spent_minutes: number;
  certificate_issued_at: string | null;
}

interface Certificate {
  certificate_id: number;
  certificate_code: string;
  course_name: string;
  course_category: string;
  issued_at: string;
  final_score: number;
  certificate_url: string;
  is_valid: boolean;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates' | 'activity'>('courses');

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch enrollments
      const enrollmentsResponse = await fetch(
        'https://documentiulia.ro/api/v1/courses/my-enrollments.php',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const enrollmentsData = await enrollmentsResponse.json();
      if (enrollmentsData.success) {
        setEnrollments(enrollmentsData.enrollments || []);
      }

      // Fetch certificates (you'll need to create this endpoint)
      // For now, filter enrollments with certificates
      const certs = (enrollmentsData.enrollments || [])
        .filter((e: Enrollment) => e.certificate_issued_at)
        .map((e: Enrollment) => ({
          certificate_id: e.enrollment_id,
          certificate_code: 'CERT-PLACEHOLDER',
          course_name: e.course_title,
          course_category: 'Business',
          issued_at: e.certificate_issued_at,
          final_score: e.completion_percentage,
          certificate_url: '/certificates/placeholder.pdf',
          is_valid: true,
        }));

      setCertificates(certs);
    } catch (err) {
      setError('Failed to load student data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const continueLearning = (enrollment: Enrollment) => {
    if (enrollment.current_lesson_id) {
      navigate(`/courses/${enrollment.course_id}/learn/${enrollment.current_lesson_id}`);
    } else {
      navigate(`/courses/${enrollment.course_id}/learn`);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateStats = () => {
    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter(e => e.completion_percentage >= 100).length;
    const inProgressCourses = enrollments.filter(e => e.completion_percentage > 0 && e.completion_percentage < 100).length;
    const totalTimeSpent = enrollments.reduce((sum, e) => sum + (e.time_spent_minutes || 0), 0);

    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      totalTimeSpent,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Tabloul meu de bord</h1>
          <p className="text-blue-100">Gestionează-ți cursurile și urmărește-ți progresul</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Cursuri totale</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCourses}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Finalizate</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.completedCourses}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">În progres</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.inProgressCourses}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Timp petrecut</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {Math.floor(stats.totalTimeSpent / 60)}h
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {['courses', 'certificates', 'activity'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'courses' && 'Cursurile mele'}
                  {tab === 'certificates' && 'Certificate'}
                  {tab === 'activity' && 'Activitate recentă'}
                </button>
              ))}
            </nav>
          </div>

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="p-6">
              {enrollments.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Niciun curs înscris</h3>
                  <p className="mt-1 text-sm text-gray-500">Începe să înveți explorând catalogul nostru de cursuri.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/courses')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Explorează cursuri
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {enrollments.map(enrollment => (
                    <div key={enrollment.enrollment_id} className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative">
                        <img
                          src={enrollment.course_thumbnail || 'https://via.placeholder.com/400x225/3b82f6/ffffff?text=Course'}
                          alt={enrollment.course_title}
                          className="w-full h-40 object-cover"
                        />
                        {enrollment.completion_percentage >= 100 && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            ✓ Finalizat
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                          {enrollment.course_title}
                        </h3>

                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progres</span>
                            <span className="font-semibold">{Math.round(enrollment.completion_percentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getProgressColor(enrollment.completion_percentage)}`}
                              style={{ width: `${enrollment.completion_percentage}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            {enrollment.lessons_completed}/{enrollment.total_lessons}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                            </svg>
                            {formatTimeSpent(enrollment.time_spent_minutes)}
                          </span>
                        </div>

                        {enrollment.current_lesson_name && (
                          <p className="text-xs text-gray-500 mb-3">
                            Lecția curentă: <span className="font-medium">{enrollment.current_lesson_name}</span>
                          </p>
                        )}

                        <button
                          onClick={() => continueLearning(enrollment)}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                          {enrollment.completion_percentage === 0 ? 'Începe cursul' : 'Continuă învățarea'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div className="p-6">
              {certificates.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Niciun certificat încă</h3>
                  <p className="mt-1 text-sm text-gray-500">Finalizează un curs pentru a obține primul certificat.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {certificates.map(cert => (
                    <div key={cert.certificate_id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-blue-600 text-white p-3 rounded-full">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          {cert.course_category}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 mb-2">{cert.course_name}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Cod certificat: <span className="font-mono font-semibold">{cert.certificate_code}</span>
                      </p>

                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <span>Scor final: <span className="font-bold text-green-600">{cert.final_score}%</span></span>
                        <span>{new Date(cert.issued_at).toLocaleDateString('ro-RO')}</span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => window.open(cert.certificate_url, '_blank')}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                        >
                          Descarcă PDF
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(`https://documentiulia.ro/verify/${cert.certificate_code}`)}
                          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm"
                        >
                          Copiază link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="p-6">
              <div className="space-y-4">
                {enrollments
                  .filter(e => e.last_accessed_at)
                  .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime())
                  .slice(0, 10)
                  .map(enrollment => (
                    <div key={enrollment.enrollment_id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <img
                          src={enrollment.course_thumbnail || 'https://via.placeholder.com/80x80/3b82f6/ffffff?text=C'}
                          alt={enrollment.course_title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {enrollment.course_title}
                        </p>
                        {enrollment.current_lesson_name && (
                          <p className="text-sm text-gray-500 truncate">
                            {enrollment.current_lesson_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Ultimul acces: {new Date(enrollment.last_accessed_at).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => continueLearning(enrollment)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Continuă
                        </button>
                      </div>
                    </div>
                  ))}

                {enrollments.filter(e => e.last_accessed_at).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p>Nicio activitate recentă</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acțiuni rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/courses')}
              className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
              </svg>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Explorează cursuri</p>
                <p className="text-sm text-gray-600">Descoperă cursuri noi</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('certificates')}
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Certificatele mele</p>
                <p className="text-sm text-gray-600">Vezi certificatele obținute</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Setări cont</p>
                <p className="text-sm text-gray-600">Gestionează contul tău</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
