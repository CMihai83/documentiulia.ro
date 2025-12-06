'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Play,
  Clock,
  Users,
  Star,
  CheckCircle2,
  Lock,
  BookOpen,
  Award,
  TrendingUp,
  Filter,
  Search,
  ChevronRight,
  PlayCircle,
  FileText,
  Target,
  X,
  ChevronDown,
  Video,
  Trophy,
  Sparkles,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    avatar: string;
    role: string;
    bio: string;
  };
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  lessons: Lesson[];
  students: number;
  rating: number;
  reviews: number;
  progress?: number;
  thumbnail: string;
  isPremium: boolean;
  isNew?: boolean;
  tags: string[];
  curriculum: Module[];
  requirements: string[];
  outcomes: string[];
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  duration: string;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'quiz' | 'exercise' | 'reading';
  completed?: boolean;
  locked?: boolean;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  passingScore: number;
  timeLimit: number; // in minutes
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface CourseCategory {
  id: string;
  name: string;
  count: number;
}

const categories: CourseCategory[] = [
  { id: 'all', name: 'Toate', count: 24 },
  { id: 'contabilitate', name: 'Contabilitate', count: 8 },
  { id: 'fiscalitate', name: 'Fiscalitate', count: 6 },
  { id: 'software', name: 'Software', count: 5 },
  { id: 'business', name: 'Business', count: 5 },
  { id: 'hr', name: 'HR & Management', count: 3 },
  { id: 'eu-funds', name: 'Fonduri EU', count: 2 },
];

// Generate more mock data for infinite scroll
const generateMockCourses = (page: number, perPage: number = 6): Course[] => {
  const baseCourses: Partial<Course>[] = [
    {
      title: 'Contabilitate de Bază pentru Antreprenori',
      description: 'Învață fundamentele contabilității pentru a-ți gestiona mai bine afacerea.',
      category: 'contabilitate',
      level: 'beginner',
      duration: '4h 30m',
      students: 1234,
      rating: 4.8,
      reviews: 156,
      isPremium: false,
      tags: ['contabilitate', 'începători', 'fundamentale'],
    },
    {
      title: 'Masterclass e-Factura ANAF 2025',
      description: 'Tot ce trebuie să știi despre sistemul e-Factura: de la integrare la troubleshooting.',
      category: 'fiscalitate',
      level: 'intermediate',
      duration: '3h 15m',
      students: 892,
      rating: 4.9,
      reviews: 98,
      isPremium: true,
      isNew: true,
      tags: ['e-Factura', 'ANAF', 'XML'],
    },
    {
      title: 'TVA România: Ghid Complet 2026',
      description: 'De la înregistrare până la decontări complexe - tot ce trebuie să știi despre noile cote TVA 21%/11%.',
      category: 'fiscalitate',
      level: 'intermediate',
      duration: '6h 45m',
      students: 2156,
      rating: 4.7,
      reviews: 234,
      isPremium: true,
      tags: ['TVA', 'declarații', 'D300', '2026'],
    },
    {
      title: 'SAF-T D406: Implementare Pas cu Pas',
      description: 'Pregătește-te pentru raportarea SAF-T cu acest curs practic și detaliat.',
      category: 'software',
      level: 'advanced',
      duration: '5h 20m',
      students: 567,
      rating: 4.6,
      reviews: 67,
      isPremium: true,
      isNew: true,
      tags: ['SAF-T', 'D406', 'raportare'],
    },
    {
      title: 'Excel Avansat pentru Contabili',
      description: 'Formule avansate, pivot tables și automatizări pentru eficiență maximă.',
      category: 'software',
      level: 'intermediate',
      duration: '8h',
      students: 3421,
      rating: 4.9,
      reviews: 412,
      isPremium: false,
      tags: ['Excel', 'formule', 'productivitate'],
    },
    {
      title: 'Finanțarea Afacerii: De la Start-up la Scale-up',
      description: 'Surse de finanțare, granturi europene și strategii de creștere.',
      category: 'business',
      level: 'intermediate',
      duration: '4h',
      students: 789,
      rating: 4.5,
      reviews: 89,
      isPremium: true,
      tags: ['finanțare', 'granturi', 'investiții'],
    },
    {
      title: 'HR Intelligence: Recrutare cu AI',
      description: 'Cum să folosești inteligența artificială pentru ATS și matching candidați.',
      category: 'hr',
      level: 'advanced',
      duration: '3h 30m',
      students: 456,
      rating: 4.8,
      reviews: 52,
      isPremium: true,
      isNew: true,
      tags: ['HR', 'AI', 'recrutare', 'ATS'],
    },
    {
      title: 'PNRR Digitalizare: Ghid Aplicație',
      description: 'Tot ce trebuie să știi pentru a accesa fonduri PNRR pentru digitalizare IMM.',
      category: 'eu-funds',
      level: 'beginner',
      duration: '2h 45m',
      students: 678,
      rating: 4.7,
      reviews: 78,
      isPremium: false,
      tags: ['PNRR', 'fonduri EU', 'digitalizare'],
    },
    {
      title: 'Impozit Dividende 16%: Strategii Optimizare',
      description: 'Cum să te pregătești pentru noua cotă de impozit pe dividende din 2026.',
      category: 'fiscalitate',
      level: 'advanced',
      duration: '4h 15m',
      students: 1234,
      rating: 4.9,
      reviews: 145,
      isPremium: true,
      tags: ['dividende', 'impozit', '2026', 'optimizare'],
    },
  ];

  return baseCourses.slice(0, perPage).map((course, idx) => ({
    id: `course-${page}-${idx}`,
    ...course,
    instructor: {
      name: ['Elena Popescu', 'Mihai Ionescu', 'Ana Dumitrescu', 'Radu Gheorghe'][idx % 4],
      avatar: '/avatars/instructor.jpg',
      role: ['Expert Contabil', 'Consultant ANAF', 'Expert Fiscal', 'IT Consultant'][idx % 4],
      bio: 'Specialist cu peste 10 ani experiență în domeniu.',
    },
    lessons: Array.from({ length: Math.floor(Math.random() * 20) + 10 }, (_, i) => ({
      id: `lesson-${idx}-${i}`,
      title: `Lecția ${i + 1}`,
      duration: `${Math.floor(Math.random() * 15) + 5}m`,
      type: ['video', 'quiz', 'exercise', 'reading'][Math.floor(Math.random() * 4)] as Lesson['type'],
      completed: Math.random() > 0.5,
      locked: i > 3 && course.isPremium,
    })),
    thumbnail: `/courses/course-${idx}.jpg`,
    curriculum: [
      {
        id: 'mod-1',
        title: 'Introducere',
        duration: '45m',
        lessons: [
          { id: 'l1', title: 'Bun venit', duration: '5m', type: 'video' },
          { id: 'l2', title: 'Prezentare curs', duration: '10m', type: 'video' },
          { id: 'l3', title: 'Quiz introductiv', duration: '15m', type: 'quiz' },
        ],
      },
      {
        id: 'mod-2',
        title: 'Concepte fundamentale',
        duration: '1h 30m',
        lessons: [
          { id: 'l4', title: 'Teoria de bază', duration: '20m', type: 'video' },
          { id: 'l5', title: 'Exercițiu practic', duration: '30m', type: 'exercise' },
          { id: 'l6', title: 'Studiu de caz', duration: '25m', type: 'reading' },
        ],
      },
    ],
    requirements: ['Cunoștințe de bază contabilitate', 'Laptop cu acces internet', 'Cont ANAF activ'],
    outcomes: ['Înțelegerea completă a subiectului', 'Abilități practice', 'Certificat de absolvire'],
    progress: course.isPremium ? undefined : Math.random() > 0.5 ? Math.floor(Math.random() * 100) : undefined,
  })) as Course[];
};

const initialCourses = generateMockCourses(1);

// Quiz data
const sampleQuiz: Quiz = {
  id: 'quiz-1',
  title: 'Quiz: TVA 2026 - Verificare cunoștințe',
  passingScore: 70,
  timeLimit: 10,
  questions: [
    {
      id: 'q1',
      question: 'Care va fi cota standard de TVA din august 2025?',
      options: ['19%', '21%', '24%', '20%'],
      correctAnswer: 1,
      explanation: 'Conform noilor reglementări, cota standard TVA crește la 21% începând cu 1 august 2025.',
    },
    {
      id: 'q2',
      question: 'Care va fi cota redusă de TVA pentru alimente de bază?',
      options: ['5%', '9%', '11%', '13%'],
      correctAnswer: 2,
      explanation: 'Cota redusă pentru alimente de bază va fi de 11% conform reformei fiscale 2026.',
    },
    {
      id: 'q3',
      question: 'Când devine obligatoriu SAF-T D406 pentru toate firmele?',
      options: ['1 ianuarie 2025', '1 ianuarie 2026', '1 iulie 2026', '1 ianuarie 2027'],
      correctAnswer: 1,
      explanation: 'SAF-T D406 devine obligatoriu pentru toate firmele de la 1 ianuarie 2026.',
    },
    {
      id: 'q4',
      question: 'Care este noul impozit pe dividende din 2026?',
      options: ['8%', '10%', '16%', '19%'],
      correctAnswer: 2,
      explanation: 'Impozitul pe dividende crește de la 8% la 16% începând cu 1 ianuarie 2026.',
    },
    {
      id: 'q5',
      question: 'Ce sistem este obligatoriu pentru facturare B2B?',
      options: ['e-Factura', 'SAF-T', 'SPV', 'e-Transport'],
      correctAnswer: 0,
      explanation: 'e-Factura este obligatoriu pentru toate tranzacțiile B2B din România.',
    },
  ],
};

const getLevelLabel = (level: string) => {
  switch (level) {
    case 'beginner': return 'Începător';
    case 'intermediate': return 'Intermediar';
    case 'advanced': return 'Avansat';
    default: return level;
  }
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'beginner': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'intermediate': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'advanced': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    default: return 'bg-gray-100 text-gray-700';
  }
};

// Course Detail Modal
function CourseDetailModal({
  course,
  onClose,
  onStartQuiz,
}: {
  course: Course;
  onClose: () => void;
  onStartQuiz: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews'>('overview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header with Cover */}
        <div className="relative h-48 bg-gradient-to-br from-blue-600 to-purple-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs rounded ${getLevelColor(course.level)}`}>
                {getLevelLabel(course.level)}
              </span>
              {course.isNew && (
                <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded">NOU</span>
              )}
              {course.isPremium && (
                <span className="px-2 py-0.5 text-xs bg-yellow-500 text-white rounded flex items-center gap-1">
                  <Star className="w-3 h-3" /> Premium
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{course.title}</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700">
          {[
            { id: 'overview', label: 'Prezentare' },
            { id: 'curriculum', label: 'Curriculum' },
            { id: 'reviews', label: `Recenzii (${course.reviews})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <p className="text-gray-600 dark:text-gray-400">{course.description}</p>

                {/* Instructor */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {course.instructor.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold">{course.instructor.name}</h4>
                    <p className="text-sm text-gray-500">{course.instructor.role}</p>
                    <p className="text-sm text-gray-400 mt-1">{course.instructor.bio}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="font-semibold">{course.duration}</p>
                    <p className="text-xs text-gray-500">Durată</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <FileText className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="font-semibold">{course.lessons.length}</p>
                    <p className="text-xs text-gray-500">Lecții</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Users className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <p className="font-semibold">{course.students.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Studenți</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                    <p className="font-semibold">{course.rating}</p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </div>

                {/* What you'll learn */}
                <div>
                  <h4 className="font-semibold mb-3">Ce vei învăța</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {course.outcomes.map((outcome, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <h4 className="font-semibold mb-3">Cerințe</h4>
                  <ul className="space-y-2">
                    {course.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <ChevronRight className="w-4 h-4" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === 'curriculum' && (
              <motion.div
                key="curriculum"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {course.curriculum.map((module, idx) => (
                  <div key={module.id} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800">
                      <div>
                        <h4 className="font-semibold">Modulul {idx + 1}: {module.title}</h4>
                        <p className="text-sm text-gray-500">{module.lessons.length} lecții • {module.duration}</p>
                      </div>
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="divide-y dark:divide-gray-700">
                      {module.lessons.map((lesson, lidx) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          {lesson.type === 'video' && <Video className="w-4 h-4 text-blue-500" />}
                          {lesson.type === 'quiz' && <Target className="w-4 h-4 text-purple-500" />}
                          {lesson.type === 'exercise' && <FileText className="w-4 h-4 text-green-500" />}
                          {lesson.type === 'reading' && <BookOpen className="w-4 h-4 text-orange-500" />}
                          <span className="flex-1 text-sm">{lesson.title}</span>
                          <span className="text-xs text-gray-500">{lesson.duration}</span>
                          {lesson.locked && <Lock className="w-4 h-4 text-gray-400" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Quiz Button */}
                <button
                  onClick={onStartQuiz}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 flex items-center justify-center gap-2"
                >
                  <Target className="w-5 h-5" />
                  Începe Quiz de Verificare
                </button>
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Rating Summary */}
                <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-500">{course.rating}</div>
                    <div className="flex items-center gap-1 justify-center mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(course.rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{course.reviews} recenzii</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="text-sm w-3">{stars}</span>
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${stars === 5 ? 75 : stars === 4 ? 20 : 5}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample Reviews */}
                {[
                  { name: 'Maria P.', rating: 5, text: 'Excelent curs! M-a ajutat enorm cu pregătirea pentru 2026.', date: '2 zile' },
                  { name: 'Andrei I.', rating: 5, text: 'Foarte bine structurat, instructorul explică clar.', date: '1 săptămână' },
                  { name: 'Elena D.', rating: 4, text: 'Bun, dar ar putea avea mai multe exemple practice.', date: '2 săptămâni' },
                ].map((review, idx) => (
                  <div key={idx} className="p-4 border dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {review.name[0]}
                        </div>
                        <span className="font-medium">{review.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{review.text}</p>
                    <p className="text-xs text-gray-400 mt-2">Acum {review.date}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="border-t dark:border-gray-700 p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <div>
            {course.progress !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${course.progress}%` }} />
                </div>
                <span className="text-sm font-medium">{course.progress}% completat</span>
              </div>
            )}
          </div>
          <button
            className={`px-6 py-2 rounded-lg font-medium ${
              course.progress !== undefined
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : course.isPremium
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {course.progress !== undefined
              ? course.progress === 100 ? 'Revizuiește' : 'Continuă'
              : course.isPremium ? 'Upgrade pentru acces' : 'Începe gratuit'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Quiz Modal
function QuizModal({
  quiz,
  onClose,
  onComplete,
}: {
  quiz: Quiz;
  onClose: () => void;
  onComplete: (score: number) => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);

  useEffect(() => {
    if (showResult) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showResult]);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) correct++;
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const score = calculateScore();
  const passed = score >= quiz.passingScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-10"
      >
        {!showResult ? (
          <>
            {/* Quiz Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div>
                <h3 className="font-semibold">{quiz.title}</h3>
                <p className="text-sm text-gray-500">
                  Întrebarea {currentQuestion + 1} din {quiz.questions.length}
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Progress */}
            <div className="h-1 bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <div className="p-6">
              <h4 className="text-lg font-medium mb-6">
                {quiz.questions[currentQuestion].question}
              </h4>

              <div className="space-y-3">
                {quiz.questions[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      selectedAnswers[currentQuestion] === idx
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="font-medium mr-3">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Anulează
              </button>
              <button
                onClick={handleNext}
                disabled={selectedAnswers[currentQuestion] === undefined}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestion === quiz.questions.length - 1 ? 'Finalizează' : 'Următoarea'}
              </button>
            </div>
          </>
        ) : (
          /* Results */
          <div className="p-8 text-center">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
              passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              {passed ? (
                <Trophy className="w-10 h-10 text-green-600" />
              ) : (
                <X className="w-10 h-10 text-red-600" />
              )}
            </div>

            <h3 className="text-2xl font-bold mb-2">
              {passed ? 'Felicitări!' : 'Mai încearcă!'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {passed
                ? 'Ai trecut quiz-ul cu succes!'
                : `Ai nevoie de minim ${quiz.passingScore}% pentru a trece.`}
            </p>

            <div className="text-5xl font-bold mb-6">
              <span className={passed ? 'text-green-600' : 'text-red-600'}>{score}%</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {selectedAnswers.filter((a, i) => a === quiz.questions[i].correctAnswer).length}
                </p>
                <p className="text-xs text-gray-500">Corecte</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {selectedAnswers.filter((a, i) => a !== quiz.questions[i].correctAnswer).length}
                </p>
                <p className="text-xs text-gray-500">Greșite</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold">{quiz.questions.length - selectedAnswers.length}</p>
                <p className="text-xs text-gray-500">Necompletate</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Închide
              </button>
              {passed ? (
                <button
                  onClick={() => onComplete(score)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Obține Certificat
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCurrentQuestion(0);
                    setSelectedAnswers([]);
                    setShowResult(false);
                    setTimeLeft(quiz.timeLimit * 60);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Încearcă din nou
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Become Instructor Modal
function BecomeInstructorModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    expertise: '',
    experience: '',
    portfolio: '',
    courseIdea: '',
    bio: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Devino Instructor</h2>
              <p className="text-white/80">Împărtășește-ți cunoștințele cu mii de profesioniști</p>
            </div>
          </div>
        </div>

        {!submitted ? (
          <div className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nume complet *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Ion Popescu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="ion@exemplu.ro"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Domeniu de expertiză *</label>
              <select
                value={formData.expertise}
                onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Selectează domeniul</option>
                <option value="contabilitate">Contabilitate</option>
                <option value="fiscalitate">Fiscalitate</option>
                <option value="software">Software & Digitalizare</option>
                <option value="hr">HR & Management</option>
                <option value="business">Business & Finanțe</option>
                <option value="eu-funds">Fonduri Europene</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ani de experiență *</label>
              <select
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Selectează</option>
                <option value="3-5">3-5 ani</option>
                <option value="5-10">5-10 ani</option>
                <option value="10+">Peste 10 ani</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Portfolio / LinkedIn</label>
              <input
                type="url"
                value={formData.portfolio}
                onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ideea pentru primul curs *</label>
              <textarea
                value={formData.courseIdea}
                onChange={(e) => setFormData({ ...formData, courseIdea: e.target.value })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                rows={3}
                placeholder="Descrie pe scurt ideea de curs..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bio scurt</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                rows={2}
                placeholder="Câteva propoziții despre tine..."
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">De ce să devii instructor?</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Venituri pasive din cursuri
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Vizibilitate în comunitatea profesională
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Suport tehnic și editorial complet
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Revenue share de până la 70%
                </li>
              </ul>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name || !formData.email || !formData.expertise || !formData.courseIdea}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Se trimite...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Trimite Aplicația
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Aplicație trimisă!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Echipa noastră va reveni cu un răspuns în maxim 48 de ore. Verifică-ți email-ul!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Închide
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEnrolled, setShowEnrolled] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showInstructorForm, setShowInstructorForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const filteredCourses = courses
    .filter(course =>
      (selectedCategory === 'all' || course.category === selectedCategory) &&
      (searchQuery === '' ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (!showEnrolled || course.progress !== undefined)
    );

  const enrolledCourses = courses.filter(c => c.progress !== undefined);
  const completedCourses = courses.filter(c => c.progress === 100);

  // Load more courses
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newCourses = generateMockCourses(page + 1);
    setCourses(prev => [...prev, ...newCourses]);
    setPage(prev => prev + 1);
    if (page >= 5) setHasMore(false);
    setIsLoading(false);
  }, [isLoading, hasMore, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cursuri</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Învață contabilitate și fiscalitate pas cu pas
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEnrolled(!showEnrolled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showEnrolled
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Cursurile Mele
          </button>
          <button
            onClick={() => setShowInstructorForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700"
          >
            <Sparkles className="w-4 h-4" />
            Devino Instructor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enrolledCourses.length}</p>
              <p className="text-sm text-gray-500">Înscris</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCourses.length}</p>
              <p className="text-sm text-gray-500">Finalizate</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCourses.length}</p>
              <p className="text-sm text-gray-500">Certificate</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">12h</p>
              <p className="text-sm text-gray-500">Timp Învățat</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Continue Learning */}
      {enrolledCourses.filter(c => c.progress && c.progress < 100).length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-600" />
            Continuă Învățarea
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {enrolledCourses
              .filter(c => c.progress && c.progress < 100)
              .slice(0, 2)
              .map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="flex items-center gap-4 p-3 bg-white dark:bg-gray-950 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{course.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{course.progress}%</span>
                    </div>
                  </div>
                  <button className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                    <PlayCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Caută cursuri..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedCourse(course)}
            className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="relative h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700">
              <div className="absolute inset-0 flex items-center justify-center">
                <GraduationCap className="w-16 h-16 text-gray-400" />
              </div>
              {course.isNew && (
                <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium bg-green-500 text-white rounded">
                  NOU
                </span>
              )}
              {course.isPremium && (
                <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-yellow-500 text-white rounded flex items-center gap-1">
                  <Star className="w-3 h-3" /> Premium
                </span>
              )}
              {course.progress !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-600">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              )}
              <button className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-12 h-12 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-xs rounded ${getLevelColor(course.level)}`}>
                  {getLevelLabel(course.level)}
                </span>
                {course.progress === 100 && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completat
                  </span>
                )}
              </div>

              <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {course.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {course.description}
              </p>

              <p className="text-xs text-gray-400 mb-3">{course.instructor.name}</p>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {course.duration}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {course.lessons.length} lecții
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{course.rating}</span>
                  </div>
                  <span className="text-sm text-gray-400">({course.reviews})</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Users className="w-4 h-4" />
                  {course.students.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="px-4 pb-4">
              <button className={`w-full py-2 rounded-lg font-medium transition-colors ${
                course.progress !== undefined
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : course.isPremium
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                  : 'border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
              }`}>
                {course.progress !== undefined
                  ? course.progress === 100
                    ? 'Revizuiește'
                    : 'Continuă'
                  : course.isPremium
                  ? 'Upgrade pentru acces'
                  : 'Începe gratuit'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && filteredCourses.length > 0 && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Se încarcă...
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5" />
                Încarcă mai multe
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-medium mb-2">Nu am găsit cursuri</h3>
          <p className="text-sm text-gray-500">Încearcă să modifici filtrele sau căutarea</p>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedCourse && !showQuiz && (
          <CourseDetailModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
            onStartQuiz={() => setShowQuiz(true)}
          />
        )}

        {showQuiz && (
          <QuizModal
            quiz={sampleQuiz}
            onClose={() => {
              setShowQuiz(false);
              setSelectedCourse(null);
            }}
            onComplete={(score) => {
              console.log('Quiz completed with score:', score);
              setShowQuiz(false);
              setSelectedCourse(null);
            }}
          />
        )}

        {showInstructorForm && (
          <BecomeInstructorModal onClose={() => setShowInstructorForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
