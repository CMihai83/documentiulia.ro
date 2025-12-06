import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Course {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  price_ron: number;
  thumbnail_url: string;
  category: string;
  level: string;
  duration_hours: number;
  total_lessons: number;
  total_enrolled: number;
  average_rating: number;
  instructor_id: string;
  instructor_name: string;
  instructor_bio: string;
  modules: Module[];
  what_you_will_learn: string[];
  requirements: string[];
  target_audience: string[];
  is_published: boolean;
  created_at: string;
}

interface Module {
  id: number;
  module_name: string;
  module_description: string;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: number;
  lesson_name: string;
  lesson_type: string;
  duration_minutes: number;
  is_preview: boolean;
}

const CourseDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'instructor' | 'reviews'>('overview');
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchCourseDetails();
  }, [slug]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `https://documentiulia.ro/api/v1/courses/get.php?slug=${slug}`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        // Expand first module by default
        if (data.course.modules.length > 0) {
          setExpandedModules(new Set([data.course.modules[0].id]));
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to load course details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login', { state: { returnTo: `/courses/${slug}` } });
      return;
    }

    if (!course) return;

    try {
      const response = await fetch('https://documentiulia.ro/api/v1/courses/enroll.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ course_id: course.id }),
      });

      const data = await response.json();
      if (data.success) {
        navigate(`/courses/${course.id}/learn`);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to enroll in course');
      console.error(err);
    }
  };

  const toggleModule = (moduleId: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const getLessonIcon = (lessonType: string) => {
    switch (lessonType) {
      case 'video':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
          </svg>
        );
      case 'quiz':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
          </svg>
        );
      case 'text':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/>
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 text-xl mb-4">{error || 'Course not found'}</div>
        <button
          onClick={() => navigate('/courses')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Course Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <span className="px-3 py-1 bg-blue-500 rounded-full text-sm font-semibold">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-blue-500 rounded-full text-sm">
                  {course.level.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-xl text-blue-100 mb-6">{course.short_description}</p>

              <div className="flex items-center space-x-6 text-blue-100">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span className="font-semibold">{course.average_rating?.toFixed(1) || 'N/A'}</span>
                </div>

                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                  <span>{course.total_enrolled} studenți înscriși</span>
                </div>

                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                  <span>{course.duration_hours} ore • {course.total_lessons} lecții</span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-blue-200">Creat de <span className="font-semibold text-white">{course.instructor_name}</span></p>
              </div>
            </div>

            {/* Right: Enrollment Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-xl p-6 text-gray-900">
                <img
                  src={course.thumbnail_url || 'https://via.placeholder.com/400x225/3b82f6/ffffff?text=Course'}
                  alt={course.title}
                  className="w-full rounded-lg mb-4"
                />

                <div className="text-center mb-6">
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    {course.price_ron === 0 ? 'Gratuit' : `${course.price_ron} RON`}
                  </p>
                  {course.price_ron > 0 && (
                    <p className="text-sm text-gray-500">Plată unică • Acces nelimitat</p>
                  )}
                </div>

                <button
                  onClick={handleEnroll}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg mb-4"
                >
                  Înscrie-te acum
                </button>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Acces nelimitat pe viață
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Certificat de absolvire
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Resurse descărcabile
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Suport 24/7
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'curriculum', 'instructor', 'reviews'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'overview' && 'Prezentare generală'}
                {tab === 'curriculum' && 'Curriculum'}
                {tab === 'instructor' && 'Instructor'}
                {tab === 'reviews' && 'Recenzii'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Despre acest curs</h2>
                <div className="prose max-w-none text-gray-600">
                  {course.description}
                </div>
              </section>

              {course.what_you_will_learn && course.what_you_will_learn.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Ce vei învăța</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.what_you_will_learn.map((item, index) => (
                      <div key={index} className="flex items-start">
                        <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {course.requirements && course.requirements.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Cerințe</h2>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {course.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </section>
              )}

              {course.target_audience && course.target_audience.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Acest curs este pentru tine dacă</h2>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {course.target_audience.map((audience, index) => (
                      <li key={index}>{audience}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Statistici curs</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Durată totală</span>
                    <span className="font-semibold">{course.duration_hours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lecții</span>
                    <span className="font-semibold">{course.total_lessons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Studenți</span>
                    <span className="font-semibold">{course.total_enrolled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nivel</span>
                    <span className="font-semibold">{course.level.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Curriculum Tab */}
        {activeTab === 'curriculum' && (
          <div className="max-w-4xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Conținutul cursului</h2>
              <p className="text-gray-600">
                {course.modules.length} module • {course.total_lessons} lecții • {course.duration_hours}h durată totală
              </p>
            </div>

            <div className="space-y-4">
              {course.modules.map(module => (
                <div key={module.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          expandedModules.has(module.id) ? 'transform rotate-90' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                      </svg>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-900">
                          Modulul {module.order_index}: {module.module_name}
                        </h3>
                        {module.module_description && (
                          <p className="text-sm text-gray-600 mt-1">{module.module_description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {module.lessons.length} lecții
                    </div>
                  </button>

                  {expandedModules.has(module.id) && (
                    <div className="border-t">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="text-gray-400">
                              {getLessonIcon(lesson.lesson_type)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{lesson.lesson_name}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500 capitalize">
                                  {lesson.lesson_type}
                                </span>
                                {lesson.duration_minutes > 0 && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">
                                      {lesson.duration_minutes} min
                                    </span>
                                  </>
                                )}
                                {lesson.is_preview && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-blue-600 font-semibold">Preview</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {lesson.is_preview && (
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
                              Vizionează
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructor Tab */}
        {activeTab === 'instructor' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-start space-x-6">
                <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
                  {course.instructor_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{course.instructor_name}</h2>
                  <p className="text-gray-600 mb-6">{course.instructor_bio || 'Expert instructor cu experiență vastă în domeniu.'}</p>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{course.total_enrolled}</p>
                      <p className="text-sm text-gray-600">Studenți</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">1</p>
                      <p className="text-sm text-gray-600">Cursuri</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{course.average_rating?.toFixed(1) || 'N/A'}</p>
                      <p className="text-sm text-gray-600">Rating mediu</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Fără recenzii încă</h3>
              <p className="text-gray-600">Fii primul care lasă o recenzie pentru acest curs!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
