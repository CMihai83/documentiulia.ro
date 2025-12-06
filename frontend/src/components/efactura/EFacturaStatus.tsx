import React from 'react';

export type EFacturaStatusType =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'accepted'
  | 'rejected'
  | 'error'
  | 'not_configured';

interface EFacturaStatusProps {
  status: EFacturaStatusType;
  message?: string;
  uploadIndex?: number;
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-gray-100 text-gray-800',
    icon: '⏳'
  },
  uploading: {
    label: 'Uploading...',
    color: 'bg-blue-100 text-blue-800',
    icon: '📤'
  },
  uploaded: {
    label: 'Uploaded',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '✓'
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-green-100 text-green-800',
    icon: '✓✓'
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800',
    icon: '✗'
  },
  error: {
    label: 'Error',
    color: 'bg-red-100 text-red-800',
    icon: '⚠'
  },
  not_configured: {
    label: 'Not Configured',
    color: 'bg-gray-100 text-gray-600',
    icon: '⚙'
  }
};

export const EFacturaStatus: React.FC<EFacturaStatusProps> = ({
  status,
  message,
  uploadIndex,
  className = ''
}) => {
  const config = STATUS_CONFIG[status];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
        title={message}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
      {uploadIndex && (
        <span className="text-xs text-gray-500">
          #{uploadIndex}
        </span>
      )}
    </div>
  );
};

export default EFacturaStatus;
