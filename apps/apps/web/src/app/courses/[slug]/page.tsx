"use client";

import { use } from "react";
import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import { useCourse } from "@/hooks/useApi";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  CheckCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Heart,
  Award,
  BarChart,
  FileText,
  Video,
  Loader2,
  GraduationCap,
  Calendar,
  Globe,
} from "lucide-react";

interface CourseLesson {
  id: string;
  title: string;
  duration: number;
  type: "VIDEO" | "TEXT" | "QUIZ";
  isFree: boolean;
  isCompleted?: boolean;
}

interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

// Fallback course data
const fallbackCourse = {
  id: "1",
  slug: "introducere-e-factura",
  title: "Introducere în e-Factura",
  description: "Ghid complet pentru înțelegerea și utilizarea sistemului e-Factura obligatoriu pentru toate firmele din România. Învață cum să generezi și să trimiți facturi electronice către ANAF.",
  longDescription: `
    <p>Acest curs te va ghida pas cu pas prin tot ce trebuie să știi despre sistemul e-Factura implementat de ANAF.</p>
    <h3>Ce vei învăța:</h3>
    <ul>
      <li>Fundamentele sistemului e-Factura și legislația în vigoare</li>
      <li>Cum să configurezi accesul la SPV (Spațiul Privat Virtual)</li>
      <li>Structura fișierului XML UBL 2.1 pentru facturi electronice</li>
      <li>Validarea și transmiterea facturilor către ANAF</li>
      <li>Gestionarea erorilor și respingerilor</li>
      <li>Integrarea cu software-ul de contabilitate</li>
    </ul>
    <h3>Pentru cine este acest curs:</h3>
    <p>Cursul este destinat contabililor, antreprenorilor și oricui dorește să înțeleagă sistemul e-Factura obligatoriu în România.</p>
  `,
  instructor: {
    name: "Admin Test",
    title: "Expert Contabilitate",
    avatar: null,
    bio: "Specialist în contabilitate și fiscalitate cu peste 10 ani experiență.",
  },
  duration: 120,
  lessonsCount: 12,
  studentsCount: 1234,
  rating: 4.8,
  reviewsCount: 156,
  level: "BEGINNER",
  language: "ro",
  isFree: true,
  price: null,
  category: "e-Factura",
  tags: ["e-factura", "anaf", "xml", "ubl"],
  thumbnail: null,
  previewVideoUrl: null,
  publishedAt: "2025-01-15",
  updatedAt: "2025-11-28",
  modules: [
    {
      id: "m1",
      title: "Introducere în e-Factura",
      lessons: [
        { id: "l1", title: "Ce este e-Factura?", duration: 8, type: "VIDEO" as const, isFree: true },
        { id: "l2", title: "Cadrul legislativ", duration: 12, type: "VIDEO" as const, isFree: true },
        { id: "l3", title: "Termene și obligații", duration: 10, type: "TEXT" as const, isFree: false },
      ],
    },
    {
      id: "m2",
      title: "Configurare și Acces SPV",
      lessons: [
        { id: "l4", title: "Crearea contului SPV", duration: 15, type: "VIDEO" as const, isFree: false },
        { id: "l5", title: "Certificat digital", duration: 20, type: "VIDEO" as const, isFree: false },
        { id: "l6", title: "Test: Configurare SPV", duration: 10, type: "QUIZ" as const, isFree: false },
      ],
    },
    {
      id: "m3",
      title: "Structura Facturii Electronice",
      lessons: [
        { id: "l7", title: "Format XML UBL 2.1", duration: 25, type: "VIDEO" as const, isFree: false },
        { id: "l8", title: "Câmpuri obligatorii", duration: 18, type: "TEXT" as const, isFree: false },
        { id: "l9", title: "Exemple practice", duration: 22, type: "VIDEO" as const, isFree: false },
      ],
    },
  ],
  whatYouWillLearn: [
    "Înțelegerea completă a sistemului e-Factura ANAF",
    "Configurarea accesului la Spațiul Privat Virtual",
    "Crearea și validarea facturilor în format XML",
    "Transmiterea și monitorizarea facturilor",
    "Rezolvarea erorilor frecvente",
    "Integrarea cu sisteme de contabilitate",
  ],
  requirements: [
    "Cunoștințe de bază despre facturare",
    "Acces la internet",
    "Calculator sau laptop",
  ],
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

function getLevelLabel(level: string): string {
  switch (level) {
    case "BEGINNER": return "Începător";
    case "INTERMEDIATE": return "Intermediar";
    case "ADVANCED": return "Avansat";
    default: return "Începător";
  }
}

function getLessonIcon(type: string) {
  switch (type) {
    case "VIDEO": return Video;
    case "TEXT": return FileText;
    case "QUIZ": return BarChart;
    default: return Play;
  }
}

export default function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { data: courseData, isLoading } = useCourse(resolvedParams.slug);

  // Use API data or fallback
  const course = courseData || fallbackCourse;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        </div>
        <MobileNav />
      </AppLayout>
    );
  }

  const modules = course.modules || fallbackCourse.modules;
  const totalLessons = modules.reduce((sum: number, m: CourseModule) => sum + m.lessons.length, 0);
  const totalDuration = modules.reduce(
    (sum: number, m: CourseModule) => sum + m.lessons.reduce((s: number, l: CourseLesson) => s + l.duration, 0),
    0
  );

  return (
    <AppLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 text-slate-400 mb-4">
            <Link href="/courses" className="hover:text-white transition">
              Cursuri
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-emerald-400">{course.category}</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-slate-300 text-lg mb-6">{course.description}</p>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{course.rating || 4.8}</span>
                  <span className="text-slate-400">({course.reviewsCount || 156} recenzii)</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <Users className="w-4 h-4" />
                  <span>{course.studentsCount || 1234} studenți</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <BookOpen className="w-4 h-4" />
                  <span>{totalLessons} lecții</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">{course.instructor?.name || "Admin Test"}</p>
                    <p className="text-sm text-slate-400">{course.instructor?.title || "Expert Contabilitate"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrollment Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 text-slate-900">
              {/* Preview Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-4 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-700 transition shadow-lg">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </button>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  Preview
                </span>
              </div>

              <div className="mb-4">
                {course.isFree ? (
                  <p className="text-3xl font-bold text-emerald-600">Gratuit</p>
                ) : (
                  <p className="text-3xl font-bold">{course.price} RON</p>
                )}
              </div>

              <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition mb-3">
                {course.isFree ? "Începe Gratuit" : "Înscrie-te Acum"}
              </button>

              <button className="w-full border border-slate-200 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 transition mb-4 flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" />
                Adaugă la Favorite
              </button>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{formatDuration(totalDuration)} de conținut video</span>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span>{totalLessons} lecții</span>
                </div>
                <div className="flex items-center gap-3">
                  <BarChart className="w-4 h-4 text-slate-400" />
                  <span>Nivel: {getLevelLabel(course.level || "BEGINNER")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>Limba: Română</span>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-slate-400" />
                  <span>Certificat de absolvire</span>
                </div>
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Resurse descărcabile</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-center gap-4">
                <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                  <Share2 className="w-4 h-4" />
                  Distribuie
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* What You'll Learn */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Ce vei învăța</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(course.whatYouWillLearn || fallbackCourse.whatYouWillLearn).map((item: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Content */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Conținut Curs</h2>
                <span className="text-sm text-slate-500">
                  {modules.length} module • {totalLessons} lecții • {formatDuration(totalDuration)}
                </span>
              </div>

              <div className="space-y-4">
                {modules.map((module: CourseModule, moduleIndex: number) => (
                  <div key={module.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-semibold">
                          {moduleIndex + 1}
                        </span>
                        <h3 className="font-semibold text-slate-900">{module.title}</h3>
                      </div>
                      <span className="text-sm text-slate-500">
                        {module.lessons.length} lecții •{" "}
                        {formatDuration(module.lessons.reduce((s, l) => s + l.duration, 0))}
                      </span>
                    </div>
                    <div className="divide-y">
                      {module.lessons.map((lesson: CourseLesson) => {
                        const LessonIcon = getLessonIcon(lesson.type);
                        return (
                          <div
                            key={lesson.id}
                            className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center gap-3">
                              <LessonIcon className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-700">{lesson.title}</span>
                              {lesson.isFree && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                                  Gratuit
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-slate-500">{lesson.duration} min</span>
                              {!lesson.isFree && !course.isFree && (
                                <Lock className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Cerințe</h2>
              <ul className="space-y-2">
                {(course.requirements || fallbackCourse.requirements).map((req: string, index: number) => (
                  <li key={index} className="flex items-center gap-3 text-slate-700">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Descriere</h2>
              <div
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: course.longDescription || fallbackCourse.longDescription }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instructor */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Instructor</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{course.instructor?.name || "Admin Test"}</p>
                  <p className="text-sm text-slate-500">{course.instructor?.title || "Expert Contabilitate"}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {course.instructor?.bio || "Specialist în contabilitate și fiscalitate cu peste 10 ani experiență."}
              </p>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Etichete</h3>
              <div className="flex flex-wrap gap-2">
                {(course.tags || fallbackCourse.tags).map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Course Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Informații Curs</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Publicat</span>
                  <span className="text-slate-900">
                    {new Date(course.publishedAt || fallbackCourse.publishedAt).toLocaleDateString("ro-RO")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ultima actualizare</span>
                  <span className="text-slate-900">
                    {new Date(course.updatedAt || fallbackCourse.updatedAt).toLocaleDateString("ro-RO")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Categorie</span>
                  <span className="text-slate-900">{course.category}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </AppLayout>
  );
}
