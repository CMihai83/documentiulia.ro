'use client';

import { useState, memo } from 'react';
import Image, { ImageProps } from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Optimized Image Component - DocumentIulia.ro
 * next/image wrapper with lazy loading, blur placeholder, and error handling
 */

interface OptimizedImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  fallbackSrc?: string;
  showLoadingIndicator?: boolean;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9' | 'auto';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const aspectRatioClasses = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  '21:9': 'aspect-[21/9]',
  'auto': '',
};

const roundedClasses = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/images/placeholder.png',
  showLoadingIndicator = true,
  aspectRatio = 'auto',
  rounded = 'none',
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden
        ${aspectRatioClasses[aspectRatio]}
        ${roundedClasses[rounded]}
        ${className}
      `}
    >
      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && showLoadingIndicator && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center"
          >
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image */}
      <Image
        src={imgSrc}
        alt={alt || 'Imagine'}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        quality={80}
        className={`
          object-cover transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${roundedClasses[rounded]}
        `}
        {...props}
      />

      {/* Error state */}
      {hasError && imgSrc === fallbackSrc && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-sm text-gray-500">Imagine indisponibila</span>
        </div>
      )}
    </div>
  );
});

// Avatar image component with specific optimizations
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackInitials?: string;
}

const sizeMap = {
  xs: { pixels: 24, class: 'w-6 h-6 text-xs' },
  sm: { pixels: 32, class: 'w-8 h-8 text-sm' },
  md: { pixels: 40, class: 'w-10 h-10 text-base' },
  lg: { pixels: 48, class: 'w-12 h-12 text-lg' },
  xl: { pixels: 64, class: 'w-16 h-16 text-xl' },
};

export const AvatarImage = memo(function AvatarImage({
  src,
  alt,
  size = 'md',
  fallbackInitials,
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  const { pixels, class: sizeClass } = sizeMap[size];

  const initials = fallbackInitials || alt
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!src || hasError) {
    return (
      <div
        className={`
          ${sizeClass}
          rounded-full bg-blue-600 text-white
          flex items-center justify-center font-medium
        `}
        aria-label={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={pixels}
      height={pixels}
      onError={() => setHasError(true)}
      className={`${sizeClass} rounded-full object-cover`}
      loading="lazy"
      quality={90}
    />
  );
});

// Logo image with priority loading
interface LogoImageProps {
  variant?: 'full' | 'icon';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export const LogoImage = memo(function LogoImage({
  variant = 'full',
  theme = 'auto',
  className = '',
}: LogoImageProps) {
  const logoSrc = variant === 'full'
    ? theme === 'dark'
      ? '/images/logo-dark.png'
      : '/images/logo-light.png'
    : '/images/logo-icon.png';

  const dimensions = variant === 'full'
    ? { width: 180, height: 40 }
    : { width: 40, height: 40 };

  return (
    <Image
      src={logoSrc}
      alt="DocumentIulia.ro"
      width={dimensions.width}
      height={dimensions.height}
      priority // Load logo immediately
      className={className}
    />
  );
});

// Thumbnail with hover zoom effect
interface ThumbnailProps {
  src: string;
  alt: string;
  onClick?: () => void;
}

export const Thumbnail = memo(function Thumbnail({
  src,
  alt,
  onClick,
}: ThumbnailProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative w-24 h-24 cursor-pointer overflow-hidden rounded-lg"
      onClick={onClick}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="96px"
        className="object-cover"
        loading="lazy"
        quality={70}
      />
    </motion.div>
  );
});

// Document preview image
interface DocumentPreviewProps {
  src: string;
  alt: string;
  type?: 'invoice' | 'contract' | 'receipt' | 'other';
}

export const DocumentPreview = memo(function DocumentPreview({
  src,
  alt,
  type = 'other',
}: DocumentPreviewProps) {
  const typeColors = {
    invoice: 'border-blue-500',
    contract: 'border-purple-500',
    receipt: 'border-green-500',
    other: 'border-gray-300',
  };

  return (
    <div className={`relative border-2 ${typeColors[type]} rounded-lg overflow-hidden shadow-sm`}>
      <div className="aspect-[3/4] relative">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-contain bg-white"
          loading="lazy"
          quality={85}
        />
      </div>
      <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
        {type.toUpperCase()}
      </div>
    </div>
  );
});

export default OptimizedImage;
