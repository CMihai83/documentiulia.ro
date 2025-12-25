import { getTranslations } from 'next-intl/server';
import { BookOpen, Clock, Award, Play } from 'lucide-react';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: string;
  duration: number;
}

interface CourseModule {
  id: string;
  title: string;
  order: number;
  duration: number;
  lessons: Lesson[];
  isFree: boolean;
}

interface Instructor {
  id: string;
  name: string;
  title: string;
  avatar?: string;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  duration: number;
  price: number;
  currency: string;
  isFree: boolean;
  language: string;
  tags: string[];
  status: string;
  certificateEnabled: boolean;
  modules: CourseModule[];
  instructor: Instructor;
  enrollmentCount: number;
  rating: number;
}

const levelMap: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
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

async function getCoursesData() {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const [coursesRes, categoriesRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/courses?limit=100`, {
        next: { revalidate: 10, tags: ['courses'] },
      }),
      fetch(`${BACKEND_URL}/api/v1/courses/categories`, {
        next: { revalidate: 10, tags: ['courses'] },
      })
    ]);

    const courses = coursesRes.ok ? await coursesRes.json() : [];
    const categories = categoriesRes.ok ? await categoriesRes.json() : [];

    return { courses, categories };
  } catch (error) {
    console.error('Error fetching courses data:', error);
    return { courses: [], categories: [] };
  }
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default async function CoursesPage() {
  const t = await getTranslations();
  const { courses, categories } = await getCoursesData();

  const totalLessons = courses.reduce((sum: number, course: Course) =>
    sum + course.modules.reduce((mSum: number, m: CourseModule) => mSum + (m.lessons?.length || 0), 0), 0
  );
  const totalDuration = courses.reduce((sum: number, course: Course) => sum + course.duration, 0);
  const freeCourses = courses.filter((c: Course) => c.isFree).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('courses.title')}</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            {t('courses.subtitle')}
          </p>
          <div className="flex justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold">{courses.length}</div>
              <div className="text-sm opacity-80">{t('courses.coursesCount')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{totalLessons}</div>
              <div className="text-sm opacity-80">{t('courses.lessonsCount')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{Math.floor(totalDuration / 60)}h</div>
              <div className="text-sm opacity-80">{t('courses.contentHours')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{freeCourses}</div>
              <div className="text-sm opacity-80">{t('courses.freeCourses')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 border-b bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/courses"
              className="px-4 py-2 rounded-full border transition text-sm font-medium bg-primary-600 text-white border-primary-600"
            >
              {t('courses.allCourses')} ({courses.length})
            </Link>
            {categories.slice(0, 6).map((cat: CategoryCount) => (
              <Link
                key={cat.category}
                href={`/courses?category=${cat.category}`}
                className="px-4 py-2 rounded-full border transition text-sm font-medium border-gray-200 hover:border-primary-500 hover:text-primary-600"
              >
                {categoryMap[cat.category] || cat.category} ({cat.count})
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {courses.length === 0 ? (
            <p className="text-center text-gray-500 py-16">{t('courses.noCourses')}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course: Course) => {
                const totalModuleLessons = course.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
                return (
                  <div key={course.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden group">
                    <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center relative">
                      <BookOpen className="w-16 h-16 text-primary-600" />
                      {course.isFree && (
                        <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                          {t('courses.free')}
                        </span>
                      )}
                      {course.certificateEnabled && (
                        <span className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <Award className="w-3 h-3" /> {t('courses.certificate')}
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                          {categoryMap[course.category] || course.category}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          course.level === 'BEGINNER' ? 'bg-green-100 text-green-700' :
                          course.level === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {levelMap[course.level]}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mt-3 mb-2 group-hover:text-primary-600 transition line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(course.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {course.modules.length} {t('courses.modules')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="w-4 h-4" />
                          {totalModuleLessons} {t('courses.lessons')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-lg font-bold text-primary-600">
                          {course.isFree ? (
                            t('courses.free')
                          ) : (
                            <span className="flex items-center gap-1">
                              {course.price} {course.currency}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                        >
                          {t('courses.viewCourse')}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Award className="w-16 h-16 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">{t('courses.cta.title')}</h2>
          <p className="text-lg opacity-90 mb-8">
            {t('courses.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              {t('courses.cta.startFree')}
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              {t('courses.cta.viewPlans')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
