import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward } from 'lucide-react';

interface VideoPlayerProps {
  lessonId: number;
  videoUrl: string;
  lessonTitle: string;
  onProgress?: (progress: ProgressData) => void;
  onComplete?: () => void;
  onNext?: () => void;
  hasNextLesson?: boolean;
}

interface ProgressData {
  lesson_id: number;
  progress_percentage: number;
  last_position: number;
  time_spent_seconds: number;
  video_watch_percentage: number;
  completed: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  lessonId,
  videoUrl,
  lessonTitle,
  onProgress,
  onComplete,
  onNext,
  hasNextLesson = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [watchedSegments, setWatchedSegments] = useState<Set<number>>(new Set());
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [showCompleteMessage, setShowCompleteMessage] = useState(false);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const companyId = localStorage.getItem('selectedCompanyId');

        const response = await fetch(
          `/api/v1/courses/get-progress.php?course_id=${lessonId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Company-ID': companyId || ''
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const lessonProgress = data.data.lessons.find((l: any) => l.lesson_id === lessonId);

          if (lessonProgress && lessonProgress.last_position) {
            if (videoRef.current) {
              videoRef.current.currentTime = lessonProgress.last_position;
            }
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    };

    loadProgress();
    setSessionStartTime(Date.now());
  }, [lessonId]);

  // Track watched segments for completion calculation
  useEffect(() => {
    if (videoRef.current && duration > 0) {
      const segmentSize = 5; // 5-second segments
      const currentSegment = Math.floor(currentTime / segmentSize);

      if (!watchedSegments.has(currentSegment)) {
        setWatchedSegments(new Set([...watchedSegments, currentSegment]));
      }
    }
  }, [currentTime, duration]);

  // Calculate watch percentage based on unique segments watched
  const calculateWatchPercentage = (): number => {
    if (duration === 0) return 0;

    const segmentSize = 5;
    const totalSegments = Math.ceil(duration / segmentSize);
    const watchedPercentage = (watchedSegments.size / totalSegments) * 100;

    return Math.min(100, Math.round(watchedPercentage * 10) / 10);
  };

  // Save progress periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (isPlaying && videoRef.current) {
        saveProgress(false);
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(saveInterval);
  }, [isPlaying, currentTime, watchedSegments]);

  // Save progress function
  const saveProgress = async (completed: boolean = false) => {
    const watchPercentage = calculateWatchPercentage();
    const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);

    const progressData: ProgressData = {
      lesson_id: lessonId,
      progress_percentage: progress,
      last_position: Math.floor(currentTime),
      time_spent_seconds: timeSpent,
      video_watch_percentage: watchPercentage,
      completed: completed || watchPercentage >= 90
    };

    if (onProgress) {
      onProgress(progressData);
    }

    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('selectedCompanyId');

      const response = await fetch('/api/v1/courses/update-progress.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ''
        },
        body: JSON.stringify(progressData)
      });

      if (response.ok) {
        const result = await response.json();

        // Check if lesson was auto-completed (90%+ watched)
        if (result.success && !completed && watchPercentage >= 90) {
          setShowCompleteMessage(true);
          if (onComplete) {
            onComplete();
          }

          setTimeout(() => {
            setShowCompleteMessage(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  // Video control handlers
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    saveProgress(true);
    setShowCompleteMessage(true);

    if (onComplete) {
      onComplete();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const watchPercentage = calculateWatchPercentage();

  return (
    <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Complete Message Overlay */}
      {showCompleteMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">Lecția completată!</span>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #4b5563 ${progress}%, #4b5563 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Watch Percentage */}
            <div className="text-sm text-gray-300">
              Progres: <span className="text-blue-400 font-semibold">{watchPercentage}%</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Next Lesson Button */}
            {hasNextLesson && onNext && (
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <span>Lecția următoare</span>
                <SkipForward size={16} />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Lesson Title Overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
        <h3 className="text-white text-lg font-semibold">{lessonTitle}</h3>
      </div>
    </div>
  );
};

export default VideoPlayer;
