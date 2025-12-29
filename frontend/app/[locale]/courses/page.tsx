import { getTranslations } from 'next-intl/server';
import { BookOpen, Clock, Award, Play } from 'lucide-react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

interface Course {
  title: string;
  slug: string;
  description: string;
  category: string;
  level: string;
  duration: number;
  price: number;
  currency?: string;
  modules: Array<{
    title: string;
    duration?: string;
    lessons: string[];
  }>;
  objectives?: string[];
  prerequisites?: string[];
  instructor?: string;
  students?: number;
  rating?: number;
  seo?: {
    title: string;
    description: string;
    keywords: string[];
  };
}

const levelMap: Record<string, { label: string; color: string }> = {
  'Începător': { label: 'Începător', color: 'bg-green-100 text-green-700' },
  'Intermediar': { label: 'Intermediar', color: 'bg-yellow-100 text-yellow-700' },
  'Avansat': { label: 'Avansat', color: 'bg-red-100 text-red-700' },
};

const categoryColors: Record<string, string> = {
  'Contabilitate & Fiscalitate': 'bg-blue-50 text-blue-700',
  'HR & Legislația Muncii': 'bg-purple-50 text-purple-700',
  'Business & Operațiuni': 'bg-green-50 text-green-700',
  'Tehnologie & Automatizare': 'bg-orange-50 text-orange-700',
};

async function getCoursesData() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'courses.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const courses = JSON.parse(fileContents);

    // Group by category for filters
    const categories = courses.reduce((acc: Record<string, number>, course: Course) => {
      acc[course.category] = (acc[course.category] || 0) + 1;
      return acc;
    }, {});

    return { courses, categories };
  } catch (error) {
    console.error('Error loading courses:', error);
    return { courses: [], categories: {} };
  }
}

function formatDuration(hours: number) {
  if (hours < 1) return `${hours * 60} min`;
  return `${hours}h`;
}

export default async function CoursesPage() {
  const t = await getTranslations();
  const { courses, categories } = await getCoursesData();

  const totalLessons = courses.reduce((sum: number, course: Course) =>
    sum + course.modules.reduce((mSum: number, m) => mSum + m.lessons.length, 0), 0
  );
  const totalDuration = courses.reduce((sum: number, course: Course) => sum + course.duration, 0);
  const freeCourses = courses.filter((c: Course) => !c.price || c.price === 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Cursuri Contabilitate și Afaceri
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Învață contabilitate, fiscalitate, HR și tehnologie de la experți. Cursuri practice pentru profesioniști români.
          </p>
          <div className="flex justify-center gap-8 mt-8 flex-wrap">
            <div className="text-center">
              <div className="text-3xl font-bold">{courses.length}</div>
              <div className="text-sm opacity-80">Cursuri</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{totalLessons}</div>
              <div className="text-sm opacity-80">Lecții</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{Math.floor(totalDuration)}h</div>
              <div className="text-sm opacity-80">Ore de conținut</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{freeCourses}</div>
              <div className="text-sm opacity-80">Cursuri gratuite</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 border-b bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-600 text-white">
              Toate Cursurile ({courses.length})
            </span>
            {Object.entries(categories).map(([cat, count]) => (
              <span
                key={cat}
                className="px-4 py-2 rounded-full border transition text-sm font-medium border-gray-200 text-gray-700"
              >
                {cat} ({count as number})
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {courses.length === 0 ? (
            <p className="text-center text-gray-500 py-16">Nu există cursuri disponibile.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course: Course) => {
                const totalModuleLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
                const isFree = !course.price || course.price === 0;
                const levelInfo = levelMap[course.level] || { label: course.level, color: 'bg-gray-100 text-gray-700' };

                return (
                  <div key={course.slug} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden group">
                    <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center relative">
                      <BookOpen className="w-16 h-16 text-blue-600" />
                      {isFree && (
                        <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                          GRATUIT
                        </span>
                      )}
                      <span className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                        <Award className="w-3 h-3" /> Certificat
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${categoryColors[course.category] || 'bg-gray-100 text-gray-700'}`}>
                          {course.category}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${levelInfo.color}`}>
                          {levelInfo.label}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mt-3 mb-2 group-hover:text-blue-600 transition line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(course.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {course.modules.length} module
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="w-4 h-4" />
                          {totalModuleLessons} lecții
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-lg font-bold text-blue-600">
                          {isFree ? (
                            'GRATUIT'
                          ) : (
                            <span className="flex items-center gap-1">
                              {course.price} {course.currency || 'RON'}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                        >
                          Vezi Cursul
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
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Award className="w-16 h-16 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">Începe să Înveți Astăzi</h2>
          <p className="text-lg opacity-90 mb-8">
            Dobândește competențe valoroase în contabilitate, fiscalitate și business. Certificări recunoscute.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Înregistrează-te Gratuit
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              Vezi Planuri
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
