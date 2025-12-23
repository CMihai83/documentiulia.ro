import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Clock, Award, Play, ChevronDown, ChevronRight,
  Users, Star, CheckCircle, Lock, ArrowLeft
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration: number;
  order: number;
  isFree?: boolean;
}

interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  lessons?: Lesson[];
  _count?: { lessons: number };
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  duration: number;
  price: string | null;
  currency: string;
  isFree: boolean;
  language: string;
  tags: string[];
  status: string;
  hasCertificate: boolean;
  modules: CourseModule[];
  _count?: { enrollments: number };
}

const levelMap: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: 'Beginner', color: 'bg-green-100 text-green-700' },
  INTERMEDIATE: { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700' },
  ADVANCED: { label: 'Advanced', color: 'bg-orange-100 text-orange-700' },
  EXPERT: { label: 'Expert', color: 'bg-red-100 text-red-700' },
};

const categoryMap: Record<string, string> = {
  EXCEL_VBA: 'Excel & VBA',
  PM_AGILE: 'Project Management',
  PROJECT_MANAGEMENT: 'Project Management',
  FINANCE_OPS: 'Finance & Operations',
  LEADERSHIP: 'Leadership',
  TAX_COMPLIANCE: 'Tax & Compliance',
  HR_TRAINING: 'HR & Training',
  HR_COMPLIANCE: 'HR & Compliance',
  LEAN_OPERATIONS: 'Operations',
  MBA_STRATEGY: 'MBA & Strategy',
  HSE_SAFETY: 'Health & Safety',
  MARKETING: 'Marketing',
  SOFT_SKILLS: 'Soft Skills',
  TECHNOLOGY: 'Technology',
};

async function getCourse(slug: string): Promise<Course | null> {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/courses/${slug}`, {
      next: { revalidate: 60 },
      cache: 'no-store',
    });

    if (!res.ok) {
      // Try to find by slug in all courses if direct fetch fails
      const allRes = await fetch(`${BACKEND_URL}/api/v1/courses`, {
        next: { revalidate: 60 },
        cache: 'no-store',
      });
      if (allRes.ok) {
        const courses = await allRes.json();
        const course = courses.find((c: Course) => c.slug === slug);
        if (course) return course;
      }
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching course:', error);
    return null;
  }
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const t = await getTranslations();
  const course = await getCourse(slug);

  if (!course) {
    notFound();
  }

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + (m._count?.lessons || m.lessons?.length || 0),
    0
  );
  const levelInfo = levelMap[course.level] || { label: course.level, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href={`/${locale}/courses`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('courses.backToCourses') || 'Inapoi la cursuri'}
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  {categoryMap[course.category] || course.category}
                </span>
                <span className={`text-sm px-3 py-1 rounded-full ${levelInfo.color}`}>
                  {levelInfo.label}
                </span>
                {course.isFree && (
                  <span className="text-sm font-bold bg-green-500 px-3 py-1 rounded-full">
                    {t('courses.free') || 'GRATUIT'}
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>

              <p className="text-lg opacity-90 mb-6 whitespace-pre-line">
                {course.description.split('\n')[0]}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {formatDuration(course.duration)}
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {course.modules.length} {t('courses.modules') || 'module'}
                </span>
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  {totalLessons} {t('courses.lessons') || 'lectii'}
                </span>
                {course.hasCertificate && (
                  <span className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    {t('courses.certificate') || 'Certificat'}
                  </span>
                )}
                {course._count?.enrollments !== undefined && course._count.enrollments > 0 && (
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {course._count.enrollments} {t('courses.enrolled') || 'inscrisi'}
                  </span>
                )}
              </div>
            </div>

            {/* Price Card */}
            <div className="lg:col-span-1">
              <div className="bg-white text-gray-900 rounded-xl p-6 shadow-lg">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    {course.isFree ? (
                      t('courses.free') || 'GRATUIT'
                    ) : (
                      `${course.price} ${course.currency}`
                    )}
                  </div>
                  {!course.isFree && (
                    <p className="text-sm text-gray-500">
                      {t('courses.oneTimePayment') || 'Plata unica, acces pe viata'}
                    </p>
                  )}
                </div>

                <Link
                  href={`/${locale}/register?redirect=/dashboard/lms/${course.slug}`}
                  className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-700 transition mb-4"
                >
                  {course.isFree
                    ? (t('courses.startFree') || 'Incepe Gratuit')
                    : (t('courses.enrollNow') || 'Inscrie-te Acum')
                  }
                </Link>

                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {t('courses.benefits.lifetime') || 'Acces pe viata'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {t('courses.benefits.mobile') || 'Acces mobil'}
                  </li>
                  {course.hasCertificate && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {t('courses.benefits.certificate') || 'Certificat de absolvire'}
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {t('courses.benefits.updates') || 'Actualizari gratuite'}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Content */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Description */}
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                <h2 className="text-xl font-bold mb-4">
                  {t('courses.aboutCourse') || 'Despre acest curs'}
                </h2>
                <div className="prose max-w-none text-gray-600 whitespace-pre-line">
                  {course.description}
                </div>

                {course.tags && course.tags.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-sm font-semibold text-gray-500 mb-3">
                      {t('courses.tags') || 'Tag-uri'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {course.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Curriculum */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6">
                  {t('courses.curriculum') || 'Continut curs'}
                </h2>
                <div className="space-y-4">
                  {course.modules
                    .sort((a, b) => a.order - b.order)
                    .map((module, idx) => (
                      <div
                        key={module.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold text-sm">
                              {idx + 1}
                            </span>
                            <div>
                              <h3 className="font-semibold">{module.title}</h3>
                              <p className="text-sm text-gray-500">
                                {module._count?.lessons || module.lessons?.length || 0} {t('courses.lessons') || 'lectii'} • {formatDuration(module.duration)}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                        {module.lessons && module.lessons.length > 0 && (
                          <div className="px-4 py-2 border-t">
                            {module.lessons.slice(0, 3).map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-3 py-2 text-sm text-gray-600"
                              >
                                <Play className="w-4 h-4 text-gray-400" />
                                <span className="flex-1">{lesson.title}</span>
                                <span className="text-gray-400">{lesson.duration}m</span>
                                {!lesson.isFree && <Lock className="w-4 h-4 text-gray-300" />}
                              </div>
                            ))}
                            {module.lessons.length > 3 && (
                              <div className="text-sm text-primary-600 py-2">
                                + {module.lessons.length - 3} {t('courses.moreLessons') || 'lectii in plus'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Course Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-4">
                <h3 className="font-bold mb-4">
                  {t('courses.courseIncludes') || 'Acest curs include'}
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-primary-600" />
                    <span>{formatDuration(course.duration)} {t('courses.videoContent') || 'continut video'}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                    <span>{totalLessons} {t('courses.lessons') || 'lectii'}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-primary-600" />
                    <span>{course.modules.length} {t('courses.modules') || 'module'}</span>
                  </li>
                  {course.hasCertificate && (
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary-600" />
                      <span>{t('courses.completionCertificate') || 'Certificat de absolvire'}</span>
                    </li>
                  )}
                </ul>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-bold mb-3">{t('courses.shareWith') || 'Imparte cu prietenii'}</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600 transition">
                      Facebook
                    </button>
                    <button className="flex-1 bg-sky-400 text-white py-2 rounded text-sm hover:bg-sky-500 transition">
                      Twitter
                    </button>
                    <button className="flex-1 bg-blue-700 text-white py-2 rounded text-sm hover:bg-blue-800 transition">
                      LinkedIn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t('courses.readyToStart') || 'Gata sa incepi?'}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {t('courses.startLearning') || 'Inscrie-te acum si incepe sa inveti imediat.'}
          </p>
          <Link
            href={`/${locale}/register?redirect=/dashboard/lms/${course.slug}`}
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            {course.isFree
              ? (t('courses.startFree') || 'Incepe Gratuit')
              : (t('courses.enrollNow') || 'Inscrie-te Acum')
            }
          </Link>
        </div>
      </section>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    return {
      title: 'Course Not Found',
    };
  }

  return {
    title: `${course.title} | DocumentIulia.ro`,
    description: course.description.slice(0, 160),
  };
}
