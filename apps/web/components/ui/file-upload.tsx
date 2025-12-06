'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, Image, FileText, FileSpreadsheet, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf')) return FileText;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onUpload: (file: File) => Promise<string>;
  onChange?: (url: string | null) => void;
  value?: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  accept = 'image/*,.pdf',
  maxSize = 10,
  onUpload,
  onChange,
  value,
  label,
  hint,
  error,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      setUploadError(`Fisierul este prea mare. Maxim ${maxSize}MB.`);
      return;
    }

    setUploadError(null);
    setUploading(true);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }

    try {
      const url = await onUpload(file);
      setPreview(url);
      onChange?.(url);
    } catch (err) {
      setUploadError('Eroare la incarcare. Incearca din nou.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, uploading]);

  const handleClear = () => {
    setPreview(null);
    onChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isDisabled = disabled;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !isDisabled && !uploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl transition-all cursor-pointer
          ${isDisabled ? 'bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          ${error || uploadError ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}
          ${preview ? 'p-3' : 'p-6'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          disabled={isDisabled || uploading}
          className="hidden"
        />

        {preview ? (
          <div className="flex items-center gap-3">
            {preview.startsWith('data:image') || preview.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
            ) : (
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                Fisier incarcat
              </p>
              <p className="text-xs text-gray-500">Apasa pentru a schimba</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Trash2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            {uploading ? (
              <div className="animate-pulse">
                <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-primary animate-bounce" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Se incarca...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Trage si lasa fisierul aici
                </p>
                <p className="text-xs text-gray-500 mt-1">sau apasa pentru a selecta</p>
              </>
            )}
          </div>
        )}
      </div>

      {(error || uploadError) && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error || uploadError}</p>
      )}

      {hint && !error && !uploadError && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

interface MultiFileUploadProps {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  onUpload: (file: File) => Promise<string>;
  onChange?: (files: UploadedFile[]) => void;
  value?: UploadedFile[];
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiFileUpload({
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  maxSize = 10,
  maxFiles = 10,
  onUpload,
  onChange,
  value = [],
  label,
  hint,
  error,
  disabled = false,
  className = '',
}: MultiFileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (newFiles: FileList) => {
    const filesToAdd = Array.from(newFiles).slice(0, maxFiles - files.length);

    for (const file of filesToAdd) {
      if (file.size > maxSize * 1024 * 1024) continue;

      const id = Math.random().toString(36).substring(7);
      const uploadedFile: UploadedFile = {
        id,
        file,
        progress: 0,
        status: 'uploading',
      };

      setFiles((prev) => {
        const updated = [...prev, uploadedFile];
        onChange?.(updated);
        return updated;
      });

      try {
        const url = await onUpload(file);
        setFiles((prev) => {
          const updated = prev.map((f) =>
            f.id === id ? { ...f, status: 'success' as const, progress: 100, url } : f
          );
          onChange?.(updated);
          return updated;
        });
      } catch (err) {
        setFiles((prev) => {
          const updated = prev.map((f) =>
            f.id === id ? { ...f, status: 'error' as const, error: 'Eroare la incarcare' } : f
          );
          onChange?.(updated);
          return updated;
        });
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      onChange?.(updated);
      return updated;
    });
  };

  const isDisabled = disabled;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      <div
        onDrop={(e) => { e.preventDefault(); !isDisabled && addFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !isDisabled && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${isDisabled ? 'bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          ${error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          disabled={isDisabled}
          className="hidden"
        />
        <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
          <Upload className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Trage si lasa fisierele aici
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Maxim {maxFiles} fisiere, {maxSize}MB fiecare
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <AnimatePresence>
            {files.map((f) => {
              const FileIcon = getFileIcon(f.file.type);
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {f.file.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(f.file.size)}</p>
                  </div>
                  {f.status === 'uploading' && (
                    <div className="w-20">
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-pulse" style={{ width: '50%' }} />
                      </div>
                    </div>
                  )}
                  {f.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {f.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <button
                    onClick={() => removeFile(f.id)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

interface ImageUploadProps {
  onUpload: (file: File) => Promise<string>;
  onChange?: (url: string | null) => void;
  value?: string;
  label?: string;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const imageSizes = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
};

export function ImageUpload({
  onUpload,
  onChange,
  value,
  label,
  shape = 'square',
  size = 'md',
  disabled = false,
  className = '',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const url = await onUpload(file);
      setPreview(url);
      onChange?.(url);
    } catch (err) {
      setPreview(value || null);
    } finally {
      setUploading(false);
    }
  };

  const isDisabled = disabled;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative inline-block">
        <div
          onClick={() => !isDisabled && !uploading && inputRef.current?.click()}
          className={`
            ${imageSizes[size]} ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'}
            border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden
            flex items-center justify-center cursor-pointer transition-all
            ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary'}
            ${preview ? 'border-solid' : ''}
          `}
        >
          {preview ? (
            <img src={preview} alt="Upload" className="w-full h-full object-cover" />
          ) : uploading ? (
            <div className="animate-pulse">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
          ) : (
            <div className="text-center p-2">
              <Image className="w-8 h-8 text-gray-400 mx-auto mb-1" />
              <span className="text-xs text-gray-500">Incarca</span>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          disabled={isDisabled || uploading}
          className="hidden"
        />
        {preview && !isDisabled && (
          <button
            onClick={() => { setPreview(null); onChange?.(null); }}
            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
