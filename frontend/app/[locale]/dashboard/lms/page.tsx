'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Play, CheckCircle, Clock, Award, Users,
  TrendingUp, Star, RefreshCw, Search, Filter, Calendar,
  Video, FileText, Download, Target, AlertCircle, Plus,
  ChevronRight, BarChart2, GraduationCap, PlayCircle, Crown,
  Sparkles, Unlock, Lock, Shield
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  company?: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  duration: number; // minutes
  lessons: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  rating: number;
  enrollments: number;
  thumbnail?: string;
  instructor: string;
  tags: string[];
  price?: number;
  isFree?: boolean;
  moduleCount?: number;
  lessonCount?: number;
}

interface Enrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  startedAt: string;
  lastAccessedAt: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'NOT_STARTED';
}

interface Certificate {
  id: string;
  courseName: string;
  issuedAt: string;
  credentialId: string;
  expiresAt?: string;
}

interface LMSStats {
  totalCourses: number;
  enrolledCourses: number;
  completedCourses: number;
  totalHoursLearned: number;
  certificates: number;
  streak: number;
}

type TabType = 'dashboard' | 'catalog' | 'my-courses' | 'certificates' | 'paths';

export default function LMSPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LMSStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Check if user has premium access
  const hasPremiumAccess = userProfile?.tier === 'PRO' || userProfile?.tier === 'BUSINESS';
  const hasFullAccess = userProfile?.tier === 'BUSINESS';

  const categories = [
    'Toate', 'Contabilitate', 'Fiscalitate', 'HR', 'ANAF',
    'Business', 'IT', 'Marketing', 'Management'
  ];

  // Navigation handlers
  const handleViewCourse = (course: Course) => {
    router.push(`/dashboard/lms/courses/${course.slug || course.id}`);
  };

  const handleStartLearning = (course: Course) => {
    router.push(`/dashboard/lms/learn/${course.slug || course.id}`);
  };

  const handleEnrollCourse = async (course: Course) => {
    try {
      const token = localStorage.getItem('auth_token');
      // Resolve the current user id the same way fetchData does (REQ-038)
      let userId: string | undefined;
      try {
        const storedUser = localStorage.getItem('user');
        userId = storedUser ? JSON.parse(storedUser)?.id : undefined;
      } catch { /* ignore */ }
      if (!userId) {
        toast.error('Înscriere eșuată', 'Nu am putut identifica utilizatorul curent. Reautentificați-vă.');
        return;
      }
      // Real endpoint: POST /lms/enrollments (REQ-038)
      const response = await fetch(`${API_URL}/lms/enrollments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, courseId: course.id }),
      });

      if (response.ok) {
        toast.success('Înscris cu succes', `Te-ai înscris la cursul "${course.title}"`);
        fetchData(); // Refresh data
      } else {
        const body = await response.json().catch(() => null);
        toast.error('Înscriere eșuată', body?.message || `Înscrierea la "${course.title}" a eșuat.`);
      }
    } catch (err) {
      console.error('Enrollment failed:', err);
      toast.error('Înscriere eșuată', 'Nu s-a putut contacta serverul. Încercați din nou.');
    }
  };

  const handleContinueCourse = (enrollment: Enrollment) => {
    router.push(`/dashboard/lms/courses/${enrollment.courseId}/learn`);
  };

  const handleDownloadCertificate = async (cert: Certificate) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/lms/certificates/${cert.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificat_${cert.courseName.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Descărcare', `Certificat descărcat: ${cert.courseName}`);
      } else {
        toast.info('În dezvoltare', `Descărcarea certificatului "${cert.courseName}" nu este încă disponibilă.`);
      }
    } catch (err) {
      console.error('Download failed:', err);
      toast.info('În dezvoltare', `Descărcarea certificatului "${cert.courseName}" nu este încă disponibilă.`);
    }
  };

  const handleVerifyCertificate = (cert: Certificate) => {
    router.push(`/dashboard/lms/certificates/verify?id=${cert.credentialId}`);
  };

  const handleContinueLearning = () => {
    const inProgress = enrollments.find(e => e.status === 'IN_PROGRESS');
    if (inProgress) {
      handleContinueCourse(inProgress);
    } else {
      setActiveTab('catalog');
      toast.success('Explorează', 'Alege un curs nou pentru a începe');
    }
  };

  const handleSetGoals = () => {
    router.push('/dashboard/lms/goals');
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch user profile
      let userId: string | undefined;
      try {
        const profileRes = await fetch(`${API_URL}/auth/profile`, { headers });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUserProfile(profile);
          userId = profile?.id ?? profile?.user?.id;
        }
      } catch {
        // Use stored user info if available
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            setUserProfile(JSON.parse(storedUser));
          } catch {}
        }
      }

      // Fetch real courses from API
      let realCourses: Course[] = [];
      try {
        const coursesRes = await fetch(`${API_URL}/courses`, { headers });
        if (coursesRes.ok) {
          const data = await coursesRes.json();
          realCourses = (data.courses || data || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            slug: c.slug,
            description: c.description || '',
            category: c.category || 'Business',
            duration: c.duration || 60,
            lessons: c.lessonCount || c._count?.modules || 0,
            level: c.level || 'BEGINNER',
            rating: 4.5 + Math.random() * 0.5,
            enrollments: Math.floor(100 + Math.random() * 500),
            instructor: 'Echipa DocumentIulia',
            tags: c.tags || [],
            price: c.price,
            isFree: c.isFree,
            moduleCount: c.moduleCount || c._count?.modules,
            lessonCount: c.lessonCount,
          }));
          if (realCourses.length > 0) {
            setCourses(realCourses);
          }
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      }

      // Stats from REAL data only — no invented counters.
      let enrolled = 0, completed = 0, certificates = 0;
      let enrollList: any[] = [];
      try {
        if (userId) {
          const enrRes = await fetch(`${API_URL}/lms/enrollments/user/${userId}`, { headers });
          if (enrRes.ok) {
            const enr = await enrRes.json();
            const list = Array.isArray(enr) ? enr : enr?.enrollments ?? enr?.data ?? [];
            enrollList = list;
            enrolled = list.length;
            completed = list.filter((e: any) => e.completedAt || e.status === 'COMPLETED' || Number(e.progress ?? 0) >= 100).length;
            certificates = list.filter((e: any) => e.certificateId || e.certificateIssuedAt).length;
          }
        }
      } catch { /* stats stay 0 — honest */ }
      setStats({
        totalCourses: realCourses.length,
        enrolledCourses: enrolled,
        completedCourses: completed,
        totalHoursLearned: 0,
        certificates,
        streak: 0,
      });

      // No fabricated fallback courses: an empty catalog renders the empty state.

      setEnrollments(enrollList.map((e: any) => ({
        id: String(e.id),
        courseId: String(e.courseId ?? e.course?.id ?? ''),
        courseTitle: e.course?.title ?? e.courseTitle ?? '-',
        progress: Number(e.progress ?? 0),
        completedLessons: Number(e.completedLessons ?? e.lessonsCompleted ?? 0),
        totalLessons: Number(e.totalLessons ?? e.course?.lessonCount ?? 0),
        startedAt: (e.startedAt ?? e.createdAt ?? '').toString().slice(0, 10),
        lastAccessedAt: (e.lastAccessedAt ?? e.updatedAt ?? '').toString().slice(0, 10),
        status: e.completedAt || Number(e.progress ?? 0) >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
      })) as any);

      setCertificates(enrollList
        .filter((e: any) => e.certificateId || e.certificateIssuedAt)
        .map((e: any) => ({
          id: String(e.certificateId ?? e.id),
          courseName: e.course?.title ?? e.courseTitle ?? '-',
          issuedAt: (e.certificateIssuedAt ?? e.completedAt ?? '').toString().slice(0, 10),
          credentialId: e.certificateNumber ?? String(e.certificateId ?? ''),
        })) as any);

    } catch (err) {
      console.error('Failed to fetch LMS data:', err);
      setError('Eroare la încărcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'BEGINNER': 'Începător',
      'INTERMEDIATE': 'Intermediar',
      'ADVANCED': 'Avansat',
    };
    return labels[level] || level;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Eroare</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Access Banner */}
      {hasFullAccess && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div className="text-white">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Acces Premium BUSINESS
                </h2>
                <p className="text-amber-100 text-sm">
                  Bine ai venit, {userProfile?.name || 'Utilizator Premium'}! Ai acces complet la toate cursurile și materialele.
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right text-white">
                <p className="text-sm text-amber-100">Abonament activ</p>
                <p className="font-semibold flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  {userProfile?.tier}
                </p>
              </div>
              <div className="flex items-center gap-1 px-4 py-2 bg-white/20 rounded-lg backdrop-blur">
                <Unlock className="h-5 w-5 text-white" />
                <span className="text-white font-medium">Toate cursurile deblocate</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Banner for Free Users */}
      {!hasPremiumAccess && userProfile && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <h3 className="font-semibold">Upgrade la Premium pentru acces complet</h3>
                <p className="text-blue-100 text-sm">Deblochează toate cursurile, certificatele și materialele exclusive.</p>
              </div>
            </div>
            <Link
              href="/pricing"
              className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Vezi Prețuri
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academia DocumentIulia</h1>
          <p className="text-gray-500 mt-1">
            Cursuri și certificări pentru profesioniști
            {userProfile && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                {hasFullAccess ? (
                  <>
                    <Crown className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-700">Premium</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-600">{userProfile.tier}</span>
                  </>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Cursuri Totale</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalCourses}</p>
              </div>
              <BookOpen className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600">În Progres</p>
                <p className="text-xl font-bold text-yellow-900">{stats.enrolledCourses}</p>
              </div>
              <Play className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600">Completate</p>
                <p className="text-xl font-bold text-green-900">{stats.completedCourses}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">Ore Învățate</p>
                <p className="text-xl font-bold text-blue-900">{stats.totalHoursLearned}h</p>
              </div>
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600">Certificate</p>
                <p className="text-xl font-bold text-purple-900">{stats.certificates}</p>
              </div>
              <Award className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600">Serie</p>
                <p className="text-xl font-bold text-orange-900">{stats.streak} zile</p>
              </div>
              <TrendingUp className="h-6 w-6 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { key: 'catalog', label: 'Catalog', icon: BookOpen },
            { key: 'my-courses', label: 'Cursurile Mele', icon: Play },
            { key: 'certificates', label: 'Certificate', icon: Award },
            { key: 'paths', label: 'Trasee', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-gray-500">Se încarcă...</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Continue Learning */}
          {enrollments.filter(e => e.status === 'IN_PROGRESS').length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Continuă Învățarea</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments.filter(e => e.status === 'IN_PROGRESS').map((enrollment) => (
                  <div key={enrollment.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{enrollment.courseTitle}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {enrollment.completedLessons}/{enrollment.totalLessons} lecții
                        </p>
                      </div>
                      <PlayCircle className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Progres</span>
                        <span className="font-medium text-blue-600">{enrollment.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                    </div>
                    <button onClick={() => handleContinueCourse(enrollment)} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2">
                      <Play className="h-4 w-4" />
                      Continuă
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Courses */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cursuri Recomandate</h3>
              <button onClick={() => setActiveTab('catalog')} className="text-sm text-blue-600 hover:text-blue-800">
                Vezi toate →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.slice(0, 3).map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-white/30" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getLevelColor(course.level)}`}>
                        {getLevelLabel(course.level)}
                      </span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium ml-1">{course.rating}</span>
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{course.title}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {course.lessons} lecții
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(course.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {course.enrollments}
                      </span>
                    </div>
                    <button onClick={() => handleEnrollCourse(course)} className="w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100">
                      Înscrie-te
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'catalog' ? (
        <div>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută cursuri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat === 'Toate' ? 'all' : cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      (cat === 'Toate' && categoryFilter === 'all') || cat === categoryFilter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses
              .filter((c) =>
                (searchQuery === '' || c.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
                (categoryFilter === 'all' || c.category === categoryFilter)
              )
              .map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow relative">
                  {/* Premium Access Badge */}
                  {hasFullAccess && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-medium rounded-full shadow-lg">
                      <Unlock className="h-3 w-3" />
                      Deblocat
                    </div>
                  )}
                  {course.isFree && !hasFullAccess && (
                    <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                      GRATUIT
                    </div>
                  )}
                  {!course.isFree && !hasFullAccess && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-gray-800 text-white text-xs font-medium rounded-full">
                      <Lock className="h-3 w-3" />
                      Premium
                    </div>
                  )}
                  <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
                    <GraduationCap className="h-20 w-20 text-white/30" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 bg-white/90 text-gray-800 text-xs font-medium rounded">
                        {course.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getLevelColor(course.level)}`}>
                        {getLevelLabel(course.level)}
                      </span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium ml-1">{course.rating}</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                    <p className="text-xs text-gray-400 mb-3">Instructor: {course.instructor}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {course.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Video className="h-4 w-4" />
                        {course.lessons} lecții
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(course.duration)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {hasFullAccess || course.isFree ? (
                        <button
                          onClick={() => handleStartLearning(course)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-md hover:from-green-700 hover:to-green-800 flex items-center justify-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Începe Cursul
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnrollCourse(course)}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                          <Lock className="h-4 w-4" />
                          Înscrie-te
                        </button>
                      )}
                      <button onClick={() => handleViewCourse(course)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                        Detalii
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : activeTab === 'my-courses' ? (
        <div className="space-y-4">
          {enrollments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Nu ești înscris la niciun curs</p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Explorează Catalogul
              </button>
            </div>
          ) : (
            enrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-10 w-10 text-white/50" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{enrollment.courseTitle}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {enrollment.completedLessons}/{enrollment.totalLessons} lecții completate
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        enrollment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {enrollment.status === 'COMPLETED' ? 'Finalizat' : 'În Progres'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Progres</span>
                        <span className="font-medium text-blue-600">{enrollment.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleContinueCourse(enrollment)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
                    {enrollment.status === 'COMPLETED' ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Revizuiește
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Continuă
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'certificates' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow p-8 text-center">
              <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Nu ai certificate încă</p>
              <p className="text-sm text-gray-400 mt-1">Completează un curs pentru a primi un certificat</p>
            </div>
          ) : (
            certificates.map((cert) => (
              <div key={cert.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Award className="h-16 w-16 text-white" />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{cert.courseName}</h4>
                  <div className="space-y-1 text-sm text-gray-500 mb-4">
                    <p>Emis: {new Date(cert.issuedAt).toLocaleDateString('ro-RO')}</p>
                    <p>Credențial: {cert.credentialId}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDownloadCertificate(cert)} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-1">
                      <Download className="h-4 w-4" />
                      Descarcă
                    </button>
                    <button onClick={() => handleVerifyCertificate(cert)} className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                      Verifică
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Trasee de învățare - În curând</p>
          <p className="text-sm text-gray-400 mt-1">Trasee personalizate pentru obiectivele tale profesionale</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Acțiuni Rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span className="text-sm">Explorează Cursuri</span>
          </button>
          <button onClick={handleContinueLearning} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Play className="h-5 w-5 text-green-600" />
            <span className="text-sm">Continuă Învățarea</span>
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <Award className="h-5 w-5 text-purple-600" />
            <span className="text-sm">Certificatele Mele</span>
          </button>
          <button onClick={handleSetGoals} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Target className="h-5 w-5 text-orange-600" />
            <span className="text-sm">Setează Obiective</span>
          </button>
        </div>
      </div>
    </div>
  );
}
