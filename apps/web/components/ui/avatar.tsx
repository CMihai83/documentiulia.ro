'use client';

import { ReactNode } from 'react';
import { User } from 'lucide-react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  rounded?: 'full' | 'lg' | 'md';
  status?: 'online' | 'offline' | 'busy' | 'away';
  badge?: ReactNode;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', status: 'w-2 h-2' },
  sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2.5 h-2.5' },
  md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-3 h-3' },
  lg: { container: 'w-12 h-12', text: 'text-base', status: 'w-3.5 h-3.5' },
  xl: { container: 'w-16 h-16', text: 'text-lg', status: 'w-4 h-4' },
  '2xl': { container: 'w-20 h-20', text: 'text-xl', status: 'w-5 h-5' },
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
};

const roundedStyles = {
  full: 'rounded-full',
  lg: 'rounded-lg',
  md: 'rounded-md',
};

// Generate initials from name
function getInitials(name: string): string {
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Generate consistent color from name
function getColorFromName(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  rounded = 'full',
  status,
  badge,
  className = '',
}: AvatarProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`relative inline-block ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={`${styles.container} ${roundedStyles[rounded]} object-cover`}
        />
      ) : name ? (
        <div
          className={`
            ${styles.container} ${roundedStyles[rounded]}
            ${getColorFromName(name)}
            flex items-center justify-center text-white font-medium ${styles.text}
          `}
        >
          {getInitials(name)}
        </div>
      ) : (
        <div
          className={`
            ${styles.container} ${roundedStyles[rounded]}
            bg-gray-200 dark:bg-gray-700 flex items-center justify-center
          `}
        >
          <User className={`${styles.text} text-gray-400`} />
        </div>
      )}

      {status && (
        <span
          className={`
            absolute bottom-0 right-0 ${styles.status}
            ${statusColors[status]}
            rounded-full ring-2 ring-white dark:ring-gray-900
          `}
        />
      )}

      {badge && (
        <span className="absolute -top-1 -right-1">
          {badge}
        </span>
      )}
    </div>
  );
}

// Avatar Group
interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    name?: string;
    alt?: string;
  }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = 'md', className = '' }: AvatarGroupProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;
  const styles = sizeStyles[size];

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {displayed.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          alt={avatar.alt}
          size={size}
          className="ring-2 ring-white dark:ring-gray-900"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`
            ${styles.container} rounded-full
            bg-gray-200 dark:bg-gray-700
            flex items-center justify-center
            ring-2 ring-white dark:ring-gray-900
            text-gray-600 dark:text-gray-300 font-medium ${styles.text}
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

// Avatar with name and details
interface AvatarWithNameProps {
  src?: string | null;
  name: string;
  subtitle?: string;
  size?: AvatarSize;
  status?: 'online' | 'offline' | 'busy' | 'away';
  action?: ReactNode;
  className?: string;
}

export function AvatarWithName({
  src,
  name,
  subtitle,
  size = 'md',
  status,
  action,
  className = '',
}: AvatarWithNameProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Avatar src={src} name={name} size={size} status={status} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{name}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// Company/Brand Avatar
interface CompanyAvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
}

export function CompanyAvatar({ src, name, size = 'md', className = '' }: CompanyAvatarProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={`
        ${styles.container} rounded-lg
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        flex items-center justify-center overflow-hidden
        ${className}
      `}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-contain p-1" />
      ) : (
        <span className={`font-bold text-gray-500 ${styles.text}`}>
          {name.substring(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// Editable Avatar (with upload overlay)
interface EditableAvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  onEdit?: () => void;
  className?: string;
}

export function EditableAvatar({ src, name, size = 'xl', onEdit, className = '' }: EditableAvatarProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`relative group ${className}`}>
      <Avatar src={src} name={name} size={size} />
      {onEdit && (
        <button
          onClick={onEdit}
          className={`
            absolute inset-0 ${roundedStyles.full}
            bg-black/50 opacity-0 group-hover:opacity-100
            flex items-center justify-center
            transition-opacity cursor-pointer
          `}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
