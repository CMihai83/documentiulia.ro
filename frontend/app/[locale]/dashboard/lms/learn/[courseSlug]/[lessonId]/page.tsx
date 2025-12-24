'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft, ArrowRight, CheckCircle, BookOpen, Clock,
  ChevronDown, ChevronUp, List, X, Loader2, Play, FileText,
  Lightbulb, AlertTriangle, Info, GraduationCap, Target,
  Bookmark, Share2, Printer, Download
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
  slug?: string;
  content: string;
  duration: number;
  type: string;
  order: number;
  isFree?: boolean;
  videoUrl?: string;
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
  const [showToc, setShowToc] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  // Extract table of contents from markdown
  const tableOfContents = useMemo(() => {
    if (!data?.lesson?.content) return [];
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const toc: { level: number; text: string; id: string }[] = [];
    let match;
    while ((match = headingRegex.exec(data.lesson.content)) !== null) {
      toc.push({
        level: match[1].length,
        text: match[2],
        id: match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
    }
    return toc;
  }, [data?.lesson?.content]);

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / scrollHeight) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

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
            <div className="mt-2 text-xs text-gray-500">
              Progres: {navigation.current}/{navigation.total} lectii
            </div>
          </div>

          <div className="p-2">
            {course.modules.map((mod) => (
              <div key={mod.id} className="mb-2">
                <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-gray-400" />
                  <span className="flex-1">{mod.order + 1}. {mod.title}</span>
                </div>
                <div className="ml-2">
                  {mod.lessons.map((l, lIdx) => (
                    <Link
                      key={l.id}
                      href={`/dashboard/lms/learn/${course.slug}/${l.id}`}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded ${
                        l.id === lessonId
                          ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center text-xs rounded-full ${
                        l.id === lessonId ? 'bg-blue-600 text-white' : 'bg-gray-200'
                      }`}>
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
        <div className="bg-white border-b sticky top-1 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-gray-100 rounded">
                  <List className="h-5 w-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-gray-900">{lesson.title}</h1>
                  {lesson.isFree && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">GRATUIT</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <span>{module.title}</span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.duration} min lectura
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tableOfContents.length > 3 && (
                <button
                  onClick={() => setShowToc(!showToc)}
                  className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <FileText className="h-4 w-4" />
                  Cuprins
                </button>
              )}
              <span className="text-sm text-gray-400 hidden sm:block">
                {navigation.current}/{navigation.total}
              </span>
              <button
                onClick={() => setCompleted(!completed)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-all ${
                  completed
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{completed ? 'Completat' : 'Marcheaza'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Video Placeholder Section */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg mb-8 overflow-hidden">
            <div className="aspect-video max-h-[400px] flex flex-col items-center justify-center p-8 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-full flex items-center justify-center mb-4 mx-auto border border-white/20">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Lectie Text - Continut Complet</h2>
                <p className="text-slate-300 max-w-md mx-auto text-sm">
                  Aceasta lectie contine continut educational detaliat in format text.
                  Parcurgeti materialul de mai jos pentru o intelegere completa.
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{lesson.duration} minute</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Target className="h-4 w-4" />
                    <span>Lectie {navigation.current} din {navigation.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table of Contents - Collapsible */}
          {showToc && tableOfContents.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Cuprins Lectie
              </h3>
              <nav className="space-y-2">
                {tableOfContents.map((item, idx) => (
                  <a
                    key={idx}
                    href={`#${item.id}`}
                    className={`block text-sm text-blue-700 hover:text-blue-900 hover:underline ${
                      item.level === 1 ? 'font-semibold' : item.level === 2 ? 'ml-4' : 'ml-8 text-blue-600'
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-10 lg:p-12">
            {/* Markdown Content */}
            <article className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:marker:text-gray-400">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return (
                      <h1 id={id} className="text-3xl font-bold mb-6 pb-4 border-b-2 border-gray-200 scroll-mt-20">
                        {children}
                      </h1>
                    );
                  },
                  h2: ({ children }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return (
                      <h2 id={id} className="text-2xl font-bold mt-10 mb-5 text-gray-900 flex items-center gap-3 scroll-mt-20">
                        <span className="w-1 h-8 bg-blue-600 rounded-full" />
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ children }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return (
                      <h3 id={id} className="text-xl font-semibold mt-8 mb-4 text-gray-800 scroll-mt-20">
                        {children}
                      </h3>
                    );
                  },
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">{children}</h4>
                  ),
                  p: ({ children }) => {
                    // Check if contains special callouts
                    const text = String(children);
                    if (text.startsWith('💡') || text.startsWith('**Sfat:**') || text.startsWith('**Tip:**')) {
                      return (
                        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg my-4">
                          <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-amber-800 mb-0">{children}</p>
                        </div>
                      );
                    }
                    if (text.startsWith('⚠️') || text.startsWith('**Atentie:**') || text.startsWith('**Important:**')) {
                      return (
                        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg my-4">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-red-800 mb-0">{children}</p>
                        </div>
                      );
                    }
                    if (text.startsWith('ℹ️') || text.startsWith('**Nota:**') || text.startsWith('**Info:**')) {
                      return (
                        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg my-4">
                          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-blue-800 mb-0">{children}</p>
                        </div>
                      );
                    }
                    return <p className="mb-5 leading-relaxed text-gray-700">{children}</p>;
                  },
                  ul: ({ children }) => (
                    <ul className="list-none pl-0 mb-6 space-y-3">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-6 space-y-3">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2.5 flex-shrink-0" />
                      <span>{children}</span>
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-5 py-3 my-6 bg-gradient-to-r from-blue-50 to-transparent italic text-gray-700 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="bg-gray-100 text-blue-700 px-2 py-1 rounded text-sm font-mono border border-gray-200">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={`${className} text-sm`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <div className="relative my-6 group">
                      <pre className="bg-slate-900 text-slate-100 p-5 rounded-xl overflow-x-auto text-sm leading-relaxed shadow-lg">
                        {children}
                      </pre>
                    </div>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gray-50">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-5 py-3 text-sm text-gray-700 border-t border-gray-100">{children}</td>
                  ),
                  hr: () => (
                    <hr className="my-10 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-600">{children}</em>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {lesson.content || 'Continutul lectiei va fi disponibil in curand.'}
              </ReactMarkdown>
            </article>
          </div>

          {/* Lesson Summary Card */}
          {completed && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">Lectie completata!</h3>
                  <p className="text-sm text-green-600">Progresul tau a fost salvat. Continua la urmatoarea lectie.</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 gap-4">
            {navigation.prev ? (
              <Link
                href={`/dashboard/lms/learn/${course.slug}/${navigation.prev.id}`}
                className="flex-1 flex items-center gap-3 px-5 py-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all border border-gray-100 group"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                <div className="text-left">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Lectia anterioara</div>
                  <div className="text-sm font-medium text-gray-700 max-w-[200px] truncate group-hover:text-blue-600 transition-colors">
                    {navigation.prev.title}
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}

            {navigation.next ? (
              <Link
                href={`/dashboard/lms/learn/${course.slug}/${navigation.next.id}`}
                className="flex-1 flex items-center justify-end gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all group"
              >
                <div className="text-right">
                  <div className="text-xs text-blue-200 uppercase tracking-wide">Lectia urmatoare</div>
                  <div className="text-sm font-medium max-w-[200px] truncate">
                    {navigation.next.title}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <Link
                href={`/dashboard/lms/courses/${course.slug}`}
                className="flex-1 flex items-center justify-end gap-3 px-5 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all"
              >
                <div className="text-right">
                  <div className="text-xs text-green-200 uppercase tracking-wide">Felicitari!</div>
                  <div className="text-sm font-medium">Finalizeaza cursul</div>
                </div>
                <CheckCircle className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
