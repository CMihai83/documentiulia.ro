'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ActiveUpload {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: string;
  progress: number;
  stage: string;
  estimatedTimeRemaining: number | null;
  elapsedTime: number;
}

interface CompletedUpload {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: string;
  progress: number;
  stage: string;
  confidence: number | null;
  processingTime: number | null;
}

interface UploadProgressData {
  activeUploads: ActiveUpload[];
  recentCompleted: CompletedUpload[];
  summary: {
    pending: number;
    processing: number;
    completedRecently: number;
    failedRecently: number;
  };
}

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

const formatTime = (seconds: number) => {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const stageConfig: Record<string, { label: string; color: string }> = {
  uploading: { label: 'Incarca...', color: 'text-blue-600' },
  queued: { label: 'In asteptare', color: 'text-yellow-600' },
  ocr_processing: { label: 'OCR in curs', color: 'text-purple-600' },
  completed: { label: 'Finalizat', color: 'text-green-600' },
  failed: { label: 'Esuat', color: 'text-red-600' },
};

const ProgressBar = ({ progress, stage }: { progress: number; stage: string }) => {
  const bgColor = stage === 'failed' ? 'bg-red-500' :
                  stage === 'completed' ? 'bg-green-500' :
                  'bg-primary-500';

  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all duration-300 ${bgColor}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

const UploadItem = ({ upload, isActive }: { upload: ActiveUpload | CompletedUpload; isActive: boolean }) => {
  const stageInfo = stageConfig[upload.stage] || stageConfig.uploading;
  const isCompleted = upload.stage === 'completed';
  const isFailed = upload.stage === 'failed';

  return (
    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 truncate">
            {upload.filename}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isActive && (
            <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
          )}
          {isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          )}
          {isFailed && (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
        </div>
      </div>

      <ProgressBar progress={upload.progress} stage={upload.stage} />

      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span className={stageInfo.color}>{stageInfo.label}</span>
        <div className="flex items-center gap-2">
          <span>{formatFileSize(upload.fileSize)}</span>
          {isActive && 'estimatedTimeRemaining' in upload && upload.estimatedTimeRemaining && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{formatTime(upload.estimatedTimeRemaining)}
            </span>
          )}
          {!isActive && 'confidence' in upload && upload.confidence && (
            <span className="text-green-600">
              {Math.round(upload.confidence * 100)}% acuratete
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export function UploadProgressWidget() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<UploadProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get<UploadProgressData>('/documents/upload-progress');
      if (response.data) {
        setData(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching upload progress:', err);
      setError('Nu s-a putut incarca progresul');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll more frequently when there are active uploads
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 bg-gray-200 rounded w-36" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-600" />
            Incarcari documente
          </h3>
          <button
            onClick={() => fetchData(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  const hasActiveUploads = data.activeUploads.length > 0;
  const hasRecentCompleted = data.recentCompleted.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary-600" />
          Incarcari documente
        </h3>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Actualizeaza"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-yellow-50 rounded-lg">
          <p className="text-lg font-bold text-yellow-700">{data.summary.pending}</p>
          <p className="text-xs text-yellow-600">Asteptare</p>
        </div>
        <div className="text-center p-2 bg-purple-50 rounded-lg">
          <p className="text-lg font-bold text-purple-700">{data.summary.processing}</p>
          <p className="text-xs text-purple-600">In proces</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-700">{data.summary.completedRecently}</p>
          <p className="text-xs text-green-600">Finalizate</p>
        </div>
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <p className="text-lg font-bold text-red-700">{data.summary.failedRecently}</p>
          <p className="text-xs text-red-600">Esuate</p>
        </div>
      </div>

      {/* Active Uploads */}
      {hasActiveUploads && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            In curs ({data.activeUploads.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.activeUploads.map((upload) => (
              <UploadItem key={upload.id} upload={upload} isActive={true} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Completed */}
      {hasRecentCompleted && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            Finalizate recent ({data.recentCompleted.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.recentCompleted.slice(0, 3).map((upload) => (
              <UploadItem key={upload.id} upload={upload} isActive={false} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasActiveUploads && !hasRecentCompleted && (
        <div className="text-center py-6">
          <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nu exista incarcari active</p>
          <p className="text-xs text-gray-400 mt-1">
            Incarcati documente pentru a le procesa cu OCR
          </p>
        </div>
      )}

      {/* View All Link */}
      <a
        href="/dashboard/documents"
        className="mt-3 flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-800"
      >
        Vezi toate documentele
        <ChevronRight className="w-4 h-4" />
      </a>
    </div>
  );
}

export default UploadProgressWidget;
