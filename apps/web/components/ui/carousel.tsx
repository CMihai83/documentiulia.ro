'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Circle, Pause, Play, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface CarouselItem {
  id: string;
  content: React.ReactNode;
  image?: string;
  title?: string;
  description?: string;
}

// ============================================================================
// Carousel Root
// ============================================================================

interface CarouselProps {
  items: CarouselItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  infinite?: boolean;
  className?: string;
  itemClassName?: string;
  onChange?: (index: number) => void;
}

export function Carousel({
  items,
  autoPlay = false,
  autoPlayInterval = 5000,
  showArrows = true,
  showDots = true,
  infinite = true,
  className,
  itemClassName,
  onChange,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(!autoPlay);
  const [direction, setDirection] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = useCallback((index: number) => {
    let newIndex = index;
    if (infinite) {
      if (newIndex < 0) newIndex = items.length - 1;
      if (newIndex >= items.length) newIndex = 0;
    } else {
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= items.length) newIndex = items.length - 1;
    }
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
    onChange?.(newIndex);
  }, [currentIndex, infinite, items.length, onChange]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      goPrev();
    } else if (info.offset.x < -threshold) {
      goNext();
    }
  };

  useEffect(() => {
    if (autoPlay && !isPaused) {
      intervalRef.current = setInterval(goNext, autoPlayInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlay, autoPlayInterval, goNext, isPaused]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  const currentItem = items[currentIndex];

  return (
    <div
      className={cn('relative overflow-hidden rounded-lg', className)}
      onMouseEnter={() => autoPlay && setIsPaused(true)}
      onMouseLeave={() => autoPlay && setIsPaused(false)}
    >
      <div className="relative aspect-video w-full">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn('absolute inset-0', itemClassName)}
          >
            {currentItem.image ? (
              <img
                src={currentItem.image}
                alt={currentItem.title || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              currentItem.content
            )}
            {(currentItem.title || currentItem.description) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                {currentItem.title && (
                  <h3 className="text-white font-semibold text-lg">
                    {currentItem.title}
                  </h3>
                )}
                {currentItem.description && (
                  <p className="text-white/80 text-sm mt-1">
                    {currentItem.description}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            onClick={goPrev}
            disabled={!infinite && currentIndex === 0}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 z-10',
              'w-10 h-10 rounded-full flex items-center justify-center',
              'bg-white/90 dark:bg-gray-800/90 shadow-lg',
              'hover:bg-white dark:hover:bg-gray-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!infinite && currentIndex === items.length - 1}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 z-10',
              'w-10 h-10 rounded-full flex items-center justify-center',
              'bg-white/90 dark:bg-gray-800/90 shadow-lg',
              'hover:bg-white dark:hover:bg-gray-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
            aria-label="Urmator"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {showDots && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(idx)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                idx === currentIndex
                  ? 'w-6 bg-white'
                  : 'bg-white/50 hover:bg-white/75'
              )}
              aria-label={`Slide ${idx + 1}`}
              aria-current={idx === currentIndex}
            />
          ))}
        </div>
      )}

      {autoPlay && (
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          className={cn(
            'absolute top-2 right-2 z-10',
            'w-8 h-8 rounded-full flex items-center justify-center',
            'bg-white/90 dark:bg-gray-800/90',
            'hover:bg-white dark:hover:bg-gray-800',
            'transition-all duration-200'
          )}
          aria-label={isPaused ? 'Reda' : 'Pauza'}
        >
          {isPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Image Gallery
// ============================================================================

interface GalleryImage {
  id: string;
  src: string;
  alt?: string;
  thumbnail?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  className?: string;
  columns?: 2 | 3 | 4;
  onImageClick?: (image: GalleryImage, index: number) => void;
}

export function ImageGallery({
  images,
  className,
  columns = 3,
  onImageClick,
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <>
      <div className={cn('grid gap-4', columnClasses[columns], className)}>
        {images.map((image, idx) => (
          <motion.button
            key={image.id}
            type="button"
            onClick={() => {
              setSelectedIndex(idx);
              onImageClick?.(image, idx);
            }}
            className="relative aspect-square overflow-hidden rounded-lg group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img
              src={image.thumbnail || image.src}
              alt={image.alt || ''}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className={cn(
              'absolute inset-0 bg-black/0 group-hover:bg-black/30',
              'flex items-center justify-center transition-all duration-300'
            )}>
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setSelectedIndex(null)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <motion.img
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={selectedImage.src}
              alt={selectedImage.alt || ''}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {selectedIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// Testimonial Carousel
// ============================================================================

interface Testimonial {
  id: string;
  content: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  className?: string;
  autoPlay?: boolean;
}

export function TestimonialCarousel({
  testimonials,
  className,
  autoPlay = true,
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTestimonial = testimonials[currentIndex];

  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [autoPlay, testimonials.length]);

  return (
    <div className={cn('relative', className)}>
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            {currentTestimonial.rating && (
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Circle
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i < (currentTestimonial.rating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
                    )}
                  />
                ))}
              </div>
            )}
            <blockquote className="text-gray-700 dark:text-gray-300 text-lg italic mb-4">
              &ldquo;{currentTestimonial.content}&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              {currentTestimonial.avatar && (
                <img
                  src={currentTestimonial.avatar}
                  alt={currentTestimonial.author}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {currentTestimonial.author}
                </div>
                {(currentTestimonial.role || currentTestimonial.company) && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {currentTestimonial.role}
                    {currentTestimonial.role && currentTestimonial.company && ' @ '}
                    {currentTestimonial.company}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {testimonials.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-200',
              idx === currentIndex
                ? 'w-6 bg-blue-500'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            )}
            aria-label={`Testimonial ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Card Carousel (Horizontal Scroll)
// ============================================================================

interface CardCarouselProps {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}

export function CardCarousel({
  children,
  className,
  gap = 16,
}: CardCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = containerRef.current.clientWidth * 0.8;
    containerRef.current.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={cn('relative group', className)}>
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
        style={{ gap }}
      >
        {React.Children.map(children, (child) => (
          <div className="flex-shrink-0 snap-start">
            {child}
          </div>
        ))}
      </div>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 z-10',
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-white dark:bg-gray-800 shadow-lg',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200'
          )}
          aria-label="Deruleaza la stanga"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 z-10',
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-white dark:bg-gray-800 shadow-lg',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200'
          )}
          aria-label="Deruleaza la dreapta"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Feature Carousel
// ============================================================================

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color?: string;
}

interface FeatureCarouselProps {
  features: Feature[];
  className?: string;
}

export function FeatureCarousel({
  features,
  className,
}: FeatureCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = features[activeIndex];

  return (
    <div className={cn('grid md:grid-cols-2 gap-8', className)}>
      <div className="space-y-4">
        {features.map((feature, idx) => (
          <motion.button
            key={feature.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={cn(
              'w-full text-left p-4 rounded-lg transition-all duration-200',
              idx === activeIndex
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                idx === activeIndex
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              )}>
                {feature.icon}
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8',
              'text-white min-h-[300px] flex flex-col justify-center'
            )}
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              {activeFeature.icon}
            </div>
            <h3 className="text-2xl font-bold mb-3">
              {activeFeature.title}
            </h3>
            <p className="text-white/80 text-lg">
              {activeFeature.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Carousel;
