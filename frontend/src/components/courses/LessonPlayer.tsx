import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from './VideoPlayer';
import { CheckCircle, Circle, ChevronRight, ChevronDown } from 'lucide-react';

interface Lesson {
  lesson_id: number;
  lesson_name: string;
  lesson_type: string;
  video_duration_seconds: number;
  module_id: number;
  module_name: string;
  module_number: number;
  progress_percentage: number | null;
  last_position: number | null;
  is_completed: boolean;
}

interface Module {
  module_id: number;
  module_name: string;
  module_number: number;
  lessons: Lesson[];
}

interface CourseData {
  course: any;
  modules: any[];
}

const LessonPlayer: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const [, setCourseData] = useState<CourseData | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  // Fetch course data and progress
  useEffect(() => {
    fetchCourseData();
    fetchProgress();
  }, [courseId]);

  // Update current lesson when lessonId changes
  useEffect(() => {
    if (progress && lessonId) {
      const lesson = progress.lessons.find((l: Lesson) => l.lesson_id === parseInt(lessonId));
      setCurrentLesson(lesson);
    }
  }, [lessonId, progress]);

  const fetchCourseData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('selectedCompanyId');

      const response = await fetch(`/api/v1/courses/get.php?id=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourseData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch course data:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('selectedCompanyId');

      const response = await fetch(`/api/v1/courses/get-progress.php?course_id=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data.data);

        // Auto-expand module containing current lesson
        if (lessonId) {
          const lesson = data.data.lessons.find((l: Lesson) => l.lesson_id === parseInt(lessonId));
          if (lesson) {
            setExpandedModules(new Set([lesson.module_id]));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async () => {
    // Progress is auto-saved by VideoPlayer component
    // Just refresh our local progress state
    fetchProgress();
  };

  const handleLessonComplete = () => {
    fetchProgress();
  };

  const handleNextLesson = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('selectedCompanyId');

      const response = await fetch(
        `/api/v1/courses/next-lesson.php?course_id=${courseId}&current_lesson_id=${lessonId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Company-ID': companyId || ''
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          navigate(`/courses/${courseId}/lesson/${data.data.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to get next lesson:', error);
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

  const goToLesson = (lessonIdToGo: number) => {
    navigate(`/courses/${courseId}/lesson/${lessonIdToGo}`);
  };

  // Group lessons by module
  const groupedLessons = progress?.lessons.reduce((acc: any, lesson: Lesson) => {
    if (!acc[lesson.module_id]) {
      acc[lesson.module_id] = {
        module_id: lesson.module_id,
        module_name: lesson.module_name,
        module_number: lesson.module_number,
        lessons: []
      };
    }
    acc[lesson.module_id].lessons.push(lesson);
    return acc;
  }, {} as Record<number, Module>);

  const modules = groupedLessons ? Object.values(groupedLessons).sort((a: any, b: any) => a.module_number - b.module_number) : [];

  // Check if there's a next lesson
  const hasNextLesson = progress?.lessons.findIndex((l: Lesson) => l.lesson_id === parseInt(lessonId || '0')) <
    (progress?.lessons.length || 0) - 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lecție negăsită</h2>
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="text-blue-600 hover:text-blue-800"
          >
            Înapoi la curs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player - Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <VideoPlayer
                lessonId={currentLesson.lesson_id}
                videoUrl={`/videos/${currentLesson.lesson_id}.mp4`} // Update with actual video URL
                lessonTitle={currentLesson.lesson_name}
                onProgress={handleProgressUpdate}
                onComplete={handleLessonComplete}
                onNext={hasNextLesson ? handleNextLesson : undefined}
                hasNextLesson={hasNextLesson}
              />

              {/* Lesson Description */}
              <div className="mt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentLesson.lesson_name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Modul {currentLesson.module_number}</span>
                  <span>•</span>
                  <span>{Math.floor(currentLesson.video_duration_seconds / 60)} minute</span>
                  {currentLesson.is_completed && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle size={16} />
                        Completată
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Course Curriculum Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Curriculum curs</h3>
                {progress && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.stats.overall_progress}%` }}
                      />
                    </div>
                    <span className="font-semibold">{Math.round(progress.stats.overall_progress)}%</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {progress?.stats.completed_lessons} / {progress?.stats.total_lessons} lecții completate
                </p>
              </div>

              {/* Module List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {(modules as Module[]).map((module) => (
                  <div key={module.module_id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleModule(module.module_id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedModules.has(module.module_id) ? (
                          <ChevronDown size={16} className="text-gray-600" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-600" />
                        )}
                        <span className="font-semibold text-sm text-gray-900">
                          Modul {module.module_number}: {module.module_name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {module.lessons.filter((l: Lesson) => l.is_completed).length}/{module.lessons.length}
                      </span>
                    </button>

                    {expandedModules.has(module.module_id) && (
                      <div className="border-t border-gray-200">
                        {module.lessons.map((lesson: Lesson) => (
                          <button
                            key={lesson.lesson_id}
                            onClick={() => goToLesson(lesson.lesson_id)}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                              lesson.lesson_id === parseInt(lessonId || '0')
                                ? 'bg-blue-50 border-l-4 border-blue-600'
                                : ''
                            }`}
                          >
                            {lesson.is_completed ? (
                              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle size={16} className="text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 text-left">
                              <p className="text-sm text-gray-900">{lesson.lesson_name}</p>
                              <p className="text-xs text-gray-500">
                                {Math.floor(lesson.video_duration_seconds / 60)} min
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;
