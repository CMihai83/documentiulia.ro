import React, { useRef, useState, useEffect, type ReactNode } from 'react';

interface ScrollableTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * ScrollableTable - A wrapper component that adds scroll indicators for horizontal overflow
 * Shows a gradient fade on the right side when there's more content to scroll
 */
const ScrollableTable: React.FC<ScrollableTableProps> = ({ children, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Left scroll indicator */}
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      )}

      {/* Right scroll indicator */}
      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        onScroll={checkScroll}
        tabIndex={0}
        role="region"
        aria-label="Tabel cu derulare orizontală"
      >
        {children}
      </div>

      {/* Scroll hint for screen readers */}
      {canScrollRight && (
        <span className="sr-only">
          Derulați spre dreapta pentru a vedea mai multe coloane
        </span>
      )}
    </div>
  );
};

export default ScrollableTable;
