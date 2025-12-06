'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Basic Aspect Ratio
// ============================================================================

interface AspectRatioProps {
  ratio?: number;
  children: React.ReactNode;
  className?: string;
}

export const AspectRatio = forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio = 16 / 9, children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative w-full', className)}
        style={{ paddingBottom: `${(1 / ratio) * 100}%` }}
      >
        <div className="absolute inset-0">
          {children}
        </div>
      </div>
    );
  }
);

AspectRatio.displayName = 'AspectRatio';

// ============================================================================
// Preset Aspect Ratios
// ============================================================================

type PresetRatio = '1:1' | '4:3' | '16:9' | '21:9' | '3:2' | '2:3' | '9:16' | '3:4';

interface PresetAspectRatioProps {
  preset: PresetRatio;
  children: React.ReactNode;
  className?: string;
}

const presetRatios: Record<PresetRatio, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '21:9': 21 / 9,
  '3:2': 3 / 2,
  '2:3': 2 / 3,
  '9:16': 9 / 16,
  '3:4': 3 / 4,
};

export function PresetAspectRatio({
  preset,
  children,
  className,
}: PresetAspectRatioProps) {
  return (
    <AspectRatio ratio={presetRatios[preset]} className={className}>
      {children}
    </AspectRatio>
  );
}

// ============================================================================
// Image Container
// ============================================================================

interface ImageContainerProps {
  src: string;
  alt: string;
  ratio?: number | PresetRatio;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  className?: string;
  imageClassName?: string;
  loading?: 'lazy' | 'eager';
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export function ImageContainer({
  src,
  alt,
  ratio = 16 / 9,
  objectFit = 'cover',
  objectPosition = 'center',
  className,
  imageClassName,
  loading = 'lazy',
  placeholder,
  onLoad,
  onError,
}: ImageContainerProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const numericRatio = typeof ratio === 'string' ? presetRatios[ratio] : ratio;

  const objectFitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  };

  return (
    <AspectRatio ratio={numericRatio} className={className}>
      {isLoading && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          {placeholder}
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => {
            setIsLoading(false);
            onLoad?.();
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
            onError?.();
          }}
          className={cn(
            'absolute inset-0 w-full h-full',
            objectFitClasses[objectFit],
            isLoading && 'opacity-0',
            'transition-opacity duration-300',
            imageClassName
          )}
          style={{ objectPosition }}
        />
      )}
    </AspectRatio>
  );
}

// ============================================================================
// Video Container
// ============================================================================

interface VideoContainerProps {
  src?: string;
  poster?: string;
  ratio?: number | PresetRatio;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  videoClassName?: string;
  children?: React.ReactNode;
}

export function VideoContainer({
  src,
  poster,
  ratio = 16 / 9,
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  className,
  videoClassName,
  children,
}: VideoContainerProps) {
  const numericRatio = typeof ratio === 'string' ? presetRatios[ratio] : ratio;

  return (
    <AspectRatio ratio={numericRatio} className={className}>
      {src ? (
        <video
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline
          className={cn('absolute inset-0 w-full h-full object-cover', videoClassName)}
        />
      ) : (
        children
      )}
    </AspectRatio>
  );
}

// ============================================================================
// Embed Container (for iframes)
// ============================================================================

interface EmbedContainerProps {
  src: string;
  title?: string;
  ratio?: number | PresetRatio;
  allowFullScreen?: boolean;
  className?: string;
  iframeClassName?: string;
}

export function EmbedContainer({
  src,
  title = 'Embedded content',
  ratio = 16 / 9,
  allowFullScreen = true,
  className,
  iframeClassName,
}: EmbedContainerProps) {
  const numericRatio = typeof ratio === 'string' ? presetRatios[ratio] : ratio;

  return (
    <AspectRatio ratio={numericRatio} className={className}>
      <iframe
        src={src}
        title={title}
        allowFullScreen={allowFullScreen}
        className={cn('absolute inset-0 w-full h-full border-0', iframeClassName)}
      />
    </AspectRatio>
  );
}

// ============================================================================
// Card Image
// ============================================================================

interface CardImageProps {
  src: string;
  alt: string;
  ratio?: number | PresetRatio;
  overlay?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function CardImage({
  src,
  alt,
  ratio = 16 / 9,
  overlay,
  badge,
  className,
}: CardImageProps) {
  const numericRatio = typeof ratio === 'string' ? presetRatios[ratio] : ratio;

  return (
    <AspectRatio ratio={numericRatio} className={cn('overflow-hidden rounded-lg', className)}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
          {overlay}
        </div>
      )}
      {badge && (
        <div className="absolute top-2 right-2">
          {badge}
        </div>
      )}
    </AspectRatio>
  );
}

// ============================================================================
// Thumbnail Grid
// ============================================================================

interface ThumbnailGridProps {
  images: Array<{ src: string; alt: string }>;
  columns?: 2 | 3 | 4 | 5 | 6;
  ratio?: number | PresetRatio;
  gap?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onImageClick?: (index: number) => void;
}

export function ThumbnailGrid({
  images,
  columns = 3,
  ratio = 1,
  gap = 'md',
  className,
  onImageClick,
}: ThumbnailGridProps) {
  const numericRatio = typeof ratio === 'string' ? presetRatios[ratio] : ratio;

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4',
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)}>
      {images.map((image, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onImageClick?.(index)}
          className="relative overflow-hidden rounded group"
        >
          <AspectRatio ratio={numericRatio}>
            <img
              src={image.src}
              alt={image.alt}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </AspectRatio>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Responsive Container
// ============================================================================

interface ResponsiveContainerProps {
  children: React.ReactNode;
  mobileRatio?: number | PresetRatio;
  tabletRatio?: number | PresetRatio;
  desktopRatio?: number | PresetRatio;
  className?: string;
}

export function ResponsiveContainer({
  children,
  mobileRatio = 1,
  tabletRatio = 4 / 3,
  desktopRatio = 16 / 9,
  className,
}: ResponsiveContainerProps) {
  const getMobileRatio = typeof mobileRatio === 'string' ? presetRatios[mobileRatio] : mobileRatio;
  const getTabletRatio = typeof tabletRatio === 'string' ? presetRatios[tabletRatio] : tabletRatio;
  const getDesktopRatio = typeof desktopRatio === 'string' ? presetRatios[desktopRatio] : desktopRatio;

  return (
    <div className={cn('relative w-full', className)}>
      {/* Mobile */}
      <div
        className="md:hidden"
        style={{ paddingBottom: `${(1 / getMobileRatio) * 100}%` }}
      />
      {/* Tablet */}
      <div
        className="hidden md:block lg:hidden"
        style={{ paddingBottom: `${(1 / getTabletRatio) * 100}%` }}
      />
      {/* Desktop */}
      <div
        className="hidden lg:block"
        style={{ paddingBottom: `${(1 / getDesktopRatio) * 100}%` }}
      />
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Map Container
// ============================================================================

interface MapContainerProps {
  children: React.ReactNode;
  ratio?: number | PresetRatio;
  className?: string;
}

export function MapContainer({
  children,
  ratio = 16 / 9,
  className,
}: MapContainerProps) {
  const numericRatio = typeof ratio === 'string' ? presetRatios[ratio] : ratio;

  return (
    <AspectRatio
      ratio={numericRatio}
      className={cn('rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800', className)}
    >
      {children}
    </AspectRatio>
  );
}

export default AspectRatio;
