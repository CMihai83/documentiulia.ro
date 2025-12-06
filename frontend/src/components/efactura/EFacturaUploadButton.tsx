import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';

interface EFacturaUploadButtonProps {
  invoiceId: string;
  companyId: string;
  currentStatus?: string;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  forceReupload?: boolean;
  className?: string;
}

export const EFacturaUploadButton: React.FC<EFacturaUploadButtonProps> = ({
  invoiceId,
  companyId,
  currentStatus,
  onUploadComplete,
  onUploadError,
  forceReupload = false,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/efactura/upload.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          company_id: companyId,
          force_reupload: forceReupload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      if (data.success) {
        onUploadComplete?.(data);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const isAlreadyUploaded = currentStatus === 'accepted' || currentStatus === 'uploaded';
  const buttonText = isUploading
    ? 'Uploading...'
    : isAlreadyUploaded && !forceReupload
    ? 'Re-upload to ANAF'
    : 'Upload to ANAF';

  return (
    <div className={className}>
      <button
        onClick={handleUpload}
        disabled={isUploading}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm
          transition-colors duration-200
          ${
            isUploading
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }
        `}
      >
        {isUploading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{buttonText}</span>
          </>
        ) : (
          <>
            <span>📤</span>
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default EFacturaUploadButton;
