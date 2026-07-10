'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Clock, Award, Play, Users, Star,
  CheckCircle, Lock, Video, FileText, Download
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration: number;
  order: number;
  type: string;
  isFree?: boolean;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  level: string;
  duration: number;
  price: string | null;
  currency: string;
  isFree: boolean;
  language: string;
  tags: string[];
  status: string;
  hasCertificate: boolean;
  modules: Module[];
  _count?: { enrollments: number };
}

// Mock courses for demo (matching dashboard/lms page)

const levelMap: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: 'Începător', color: 'bg-green-100 text-green-700' },
  INTERMEDIATE: { label: 'Intermediar', color: 'bg-yellow-100 text-yellow-700' },
  ADVANCED: { label: 'Avansat', color: 'bg-orange-100 text-orange-700' },
  EXPERT: { label: 'Expert', color: 'bg-red-100 text-red-700' },
};

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function LMSCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const courseId = params.id as string;

  useEffect(() => {
    async function loadCourse() {
      setLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        const token = localStorage.getItem('auth_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await fetch(`${API_URL}/courses/${courseId}`, { headers });
        if (res.ok) {
          setCourse(await res.json());
        } else {
          const allRes = await fetch(`${API_URL}/courses`, { headers });
          if (allRes.ok) {
            const d = await allRes.json();
            const courses = Array.isArray(d) ? d : (d?.data ?? d?.items ?? []);
            setCourse(courses.find((c: Course) => c.slug === courseId || c.id === courseId) ?? null);
          } else {
            setCourse(null);
          }
        }
      } catch (error) {
        console.error('Error loading course:', error);
        setCourse(null);
      }
      setLoading(false);
    }

    loadCourse();
  }, [courseId]);

  const handleEnroll = () => {
    setEnrolled(true);
    // In real app, would call API to enroll
  };

  const handleStartLesson = (lessonId: string) => {
    // Navigate to the lesson page
    // Use the learn route for database courses, or the old mock route for mock courses
    if (course && course.slug) {
      router.push(`/dashboard/lms/learn/${course.slug}/${lessonId}`);
    } else if (course) {
      router.push(`/dashboard/lms/courses/${course.id}/lessons/${lessonId}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">Curs negăsit</h2>
          <p className="text-gray-500 mb-4">Cursul solicitat nu a fost găsit.</p>
          <Link
            href="/dashboard/lms"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Înapoi la catalog
          </Link>
        </div>
      </div>
    );
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const levelInfo = levelMap[course.level] || { label: course.level, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className={`px-2 py-0.5 rounded-full text-xs ${levelInfo.color}`}>
              {levelInfo.label}
            </span>
            <span>{course.category}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatDuration(course.duration)}
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {course.modules.length} module
              </span>
              <span className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                {totalLessons} lecții
              </span>
              {course._count?.enrollments && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {course._count.enrollments} înscriși
                </span>
              )}
              {course.hasCertificate && (
                <span className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  Certificat inclus
                </span>
              )}
            </div>

            <h2 className="text-lg font-semibold mb-3">Despre curs</h2>
            <div className="prose max-w-none text-gray-600 whitespace-pre-line">
              {course.description}
            </div>

            {course.tags && course.tags.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Curriculum */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Conținut curs</h2>
            {course.modules.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
                <p className="text-yellow-700 font-medium">Conținutul cursului este în pregătire</p>
                <p className="text-yellow-600 text-sm mt-1">Lecțiile vor fi disponibile în curând!</p>
              </div>
            ) : (
            <div className="space-y-3">
              {course.modules
                .sort((a, b) => a.order - b.order)
                .map((module) => (
                  <div key={module.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setActiveModule(activeModule === module.id ? null : module.id)}
                      className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                          {module.order}
                        </span>
                        <div className="text-left">
                          <h3 className="font-medium">{module.title}</h3>
                          <p className="text-xs text-gray-500">
                            {module.lessons?.length || 0} lecții • {formatDuration(module.duration)}
                          </p>
                        </div>
                      </div>
                      <Play className={`h-5 w-5 text-gray-400 transition-transform ${activeModule === module.id ? 'rotate-90' : ''}`} />
                    </button>

                    {activeModule === module.id && module.lessons && module.lessons.length > 0 && (
                      <div className="px-4 py-2 border-t bg-white">
                        {module.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => enrolled || lesson.isFree ? handleStartLesson(lesson.id) : null}
                            disabled={!enrolled && !lesson.isFree}
                            className={`w-full flex items-center gap-3 py-2 text-sm ${
                              enrolled || lesson.isFree
                                ? 'text-gray-700 hover:text-blue-600 cursor-pointer'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <Play className="h-4 w-4" />
                            <span className="flex-1 text-left">{lesson.title}</span>
                            <span className="text-gray-400">{lesson.duration}m</span>
                            {lesson.isFree ? (
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">GRATUIT</span>
                            ) : !enrolled ? (
                              <Lock className="h-4 w-4 text-gray-300" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {course.isFree ? 'GRATUIT' : `${course.price} ${course.currency}`}
              </div>
              {!course.isFree && (
                <p className="text-sm text-gray-500">Acces pe viață</p>
              )}
            </div>

            {enrolled ? (
              <div className="space-y-3">
                <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Înscris
                </button>
                {totalLessons > 0 ? (
                  <button
                    onClick={() => handleStartLesson(course.modules[0]?.lessons?.[0]?.id || '')}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Continuă cursul
                  </button>
                ) : (
                  <div className="w-full bg-yellow-50 text-yellow-700 py-3 rounded-lg font-medium text-center border border-yellow-200">
                    Conținut în pregătire
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                {course.isFree ? 'Începe Gratuit' : 'Înscrie-te Acum'}
              </button>
            )}

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Acces pe viață</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Acces mobil</span>
              </li>
              {course.hasCertificate && (
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Certificat de absolvire</span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Actualizări gratuite</span>
              </li>
              <li className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>Materiale descărcabile</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
