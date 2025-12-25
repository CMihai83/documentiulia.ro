'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const languages = [
  { code: 'ro', label: 'RO', name: 'Romana' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
] as const;

interface LanguageSelectorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function LanguageSelector({ variant = 'default', className = '' }: LanguageSelectorProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  const switchLocale = (newLocale: string) => {
    // Handle paths with and without locale prefix
    let newPath = pathname;

    // Check if current path starts with a locale
    const localePattern = /^\/(ro|en|de)(\/|$)/;
    if (localePattern.test(pathname)) {
      newPath = pathname.replace(localePattern, `/${newLocale}$2`);
    } else {
      // Path doesn't have locale prefix, add the new one
      newPath = `/${newLocale}${pathname}`;
    }

    // Clean up double slashes and trailing slashes
    newPath = newPath.replace(/\/+/g, '/').replace(/\/$/, '') || `/${newLocale}`;

    router.push(newPath);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase font-medium">{currentLanguage.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          role="listbox"
          aria-label="Available languages"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                lang.code === locale
                  ? 'text-primary-600 bg-primary-50 font-medium'
                  : 'text-gray-700'
              }`}
              role="option"
              aria-selected={lang.code === locale}
            >
              <span className="uppercase font-medium w-6">{lang.label}</span>
              <span className="text-gray-500">{lang.name}</span>
              {lang.code === locale && (
                <svg
                  className="w-4 h-4 ml-auto text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
