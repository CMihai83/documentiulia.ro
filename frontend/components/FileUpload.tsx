'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  url?: string;
}

interface FileUploadProps {
  onUpload?: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  uploadUrl?: string;
  className?: string;
}

export default function FileUpload({
  onUpload,
  accept = '.pdf,.jpg,.jpeg,.png,.xml',
  maxFiles = 10,
  maxSize = 50,
  uploadUrl = '/api/documents/upload',
  className = '',
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `Fisierul depaseste limita de ${maxSize}MB`;
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());

    if (!acceptedExtensions.includes(extension)) {
      return `Tipul de fisier nu este acceptat. Acceptate: ${accept}`;
    }

    return null;
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
      const file = fileList[i];
      const error = validateFile(file);

      newFiles.push({
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: error ? 'error' : 'pending',
        progress: 0,
        error: error || undefined,
      });
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Upload files that passed validation
    newFiles
      .filter(f => f.status === 'pending')
      .forEach(f => {
        const originalFile = Array.from(fileList).find(file => file.name === f.name);
        if (originalFile) {
          uploadFile(f.id, originalFile);
        }
      });
  }, [files.length, maxFiles, accept, maxSize]);

  const uploadFile = async (fileId: string, file: File) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'uploading' as const, progress: 0 } : f
    ));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, progress } : f
          ));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setFiles(prev => {
            const updated = prev.map(f =>
              f.id === fileId ? { ...f, status: 'success' as const, progress: 100, url: response.url } : f
            );
            onUpload?.(updated.filter(f => f.status === 'success'));
            return updated;
          });
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: 'error' as const, error: 'Eroare la incarcare' } : f
        ));
      });

      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    } catch (err) {
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'error' as const, error: 'Eroare la incarcare' } : f
      ));
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'uploading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          className="hidden"
        />

        <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />

        <p className="text-lg font-medium text-gray-700">
          {isDragging ? 'Elibereaza pentru a incarca' : 'Trage fisierele aici sau click pentru a selecta'}
        </p>

        <p className="text-sm text-gray-500 mt-2">
          Maxim {maxFiles} fisiere, pana la {maxSize}MB fiecare
        </p>

        <p className="text-xs text-gray-400 mt-1">
          Formate acceptate: {accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')}
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={`
                flex items-center justify-between p-3 rounded-lg border
                ${file.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
              `}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getStatusIcon(file.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                    {file.error && <span className="text-red-500 ml-2">{file.error}</span>}
                  </p>
                </div>
              </div>

              {file.status === 'uploading' && (
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mx-3">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              )}

              <button
                onClick={() => removeFile(file.id)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Sterge"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
