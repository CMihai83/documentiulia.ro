'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, ArrowRight, CheckCircle, BookOpen, Clock,
  ChevronDown, ChevronUp, List, X, Loader2
} from 'lucide-react';

interface LessonNav {
  id: string;
  title: string;
  moduleId: string;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  duration: number;
  type: string;
  order: number;
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: {
    id: string;
    title: string;
    duration: number;
    type: string;
    order: number;
  }[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  modules: Module[];
}

interface LessonData {
  course: Course;
  module: {
    id: string;
    title: string;
    order: number;
  };
  lesson: Lesson;
  navigation: {
    prev: LessonNav | null;
    next: LessonNav | null;
    current: number;
    total: number;
  };
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseSlug = params.courseSlug as string;
  const lessonId = params.lessonId as string;

  const [data, setData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function fetchLesson() {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://documentiulia.ro/api/v1';
        const response = await fetch(`${apiUrl}/courses/${courseSlug}/lessons/${lessonId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch lesson');
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (courseSlug && lessonId) {
      fetchLesson();
    }
  }, [courseSlug, lessonId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-500">Se incarca lectia...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-semibold mb-2">Lectie negasita</h1>
          <p className="text-gray-500 mb-4">{error || 'Continutul nu este disponibil.'}</p>
          <Link href="/dashboard/lms" className="text-blue-600 hover:underline">
            Inapoi la cursuri
          </Link>
        </div>
      </div>
    );
  }

  const { course, module, lesson, navigation } = data;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - Course Navigation */}
      {showSidebar && (
        <div className="w-80 bg-white border-r flex-shrink-0 overflow-y-auto hidden lg:block">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/dashboard/lms/courses/${course.slug}`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Inapoi la curs
              </Link>
              <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="font-semibold text-gray-900 truncate">{course.title}</h2>
          </div>

          <div className="p-2">
            {course.modules.map((mod) => (
              <div key={mod.id} className="mb-2">
                <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded">
                  {mod.order + 1}. {mod.title}
                </div>
                <div className="ml-2">
                  {mod.lessons.map((l, lIdx) => (
                    <Link
                      key={l.id}
                      href={`/dashboard/lms/learn/${course.slug}/${l.id}`}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded ${
                        l.id === lessonId
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center text-xs bg-gray-200 rounded-full">
                        {lIdx + 1}
                      </span>
                      <span className="flex-1 truncate">{l.title}</span>
                      <span className="text-xs text-gray-400">{l.duration}m</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-gray-100 rounded lg:hidden">
                  <List className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className="font-semibold text-gray-900">{lesson.title}</h1>
                <p className="text-sm text-gray-500">{module.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {lesson.duration} min
              </span>
              <span className="text-sm text-gray-400">
                {navigation.current}/{navigation.total}
              </span>
              <button
                onClick={() => setCompleted(!completed)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
                  completed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                {completed ? 'Completat' : 'Marcheaza'}
              </button>
            </div>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            {/* Markdown Content */}
            <article className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:marker:text-gray-400">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mb-6 pb-3 border-b">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold mt-4 mb-2 text-gray-700">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 italic">
                      {children}
                    </blockquote>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                      {children}
                    </pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-gray-200 border">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2 bg-gray-100 text-left font-semibold">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 border-t">{children}</td>
                  ),
                  hr: () => <hr className="my-8 border-gray-200" />,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-700">{children}</em>
                  ),
                }}
              >
                {lesson.content || 'Continutul lectiei va fi disponibil in curand.'}
              </ReactMarkdown>
            </article>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {navigation.prev ? (
              <Link
                href={`/dashboard/lms/learn/${course.slug}/${navigation.prev.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs text-gray-500">Lectia anterioara</div>
                  <div className="text-sm font-medium text-gray-700 max-w-[200px] truncate">
                    {navigation.prev.title}
                  </div>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {navigation.next ? (
              <Link
                href={`/dashboard/lms/learn/${course.slug}/${navigation.next.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <div className="text-right">
                  <div className="text-xs text-blue-200">Lectia urmatoare</div>
                  <div className="text-sm font-medium max-w-[200px] truncate">
                    {navigation.next.title}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/dashboard/lms/courses/${course.slug}`}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Finalizeaza cursul</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
