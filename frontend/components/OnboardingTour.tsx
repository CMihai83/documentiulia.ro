'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  FileText,
  Upload,
  Calculator,
  BarChart3,
  Keyboard,
  Sparkles,
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bun venit la DocumentIulia!',
    description: 'Platforma ta completă de contabilitate și ERP cu inteligență artificială. Hai să-ți arătăm funcționalitățile principale.',
    icon: <Sparkles className="w-6 h-6" />,
    position: 'center',
  },
  {
    id: 'invoices',
    title: 'Gestionare Facturi',
    description: 'Creează, editează și trimite facturi direct la ANAF prin e-Factura SPV. Conformitate 100% cu cerințele fiscale.',
    icon: <FileText className="w-6 h-6" />,
    target: '[data-tour="invoices"]',
    position: 'right',
  },
  {
    id: 'ocr',
    title: 'OCR Inteligent',
    description: 'Încarcă documente PDF sau imagini și lasă AI-ul să extragă automat datele. Acuratețe de 99.2%!',
    icon: <Upload className="w-6 h-6" />,
    target: '[data-tour="upload"]',
    position: 'bottom',
  },
  {
    id: 'vat',
    title: 'Calculator TVA',
    description: 'Calculează automat TVA conform Legii 141/2025 - 21% standard sau 11% redus. Actualizat pentru august 2025.',
    icon: <Calculator className="w-6 h-6" />,
    target: '[data-tour="vat"]',
    position: 'left',
  },
  {
    id: 'analytics',
    title: 'Analytics & Rapoarte',
    description: 'Vizualizează performanța afacerii în timp real. Grafice interactive, KPI-uri și export în PDF/Excel.',
    icon: <BarChart3 className="w-6 h-6" />,
    target: '[data-tour="analytics"]',
    position: 'right',
  },
  {
    id: 'shortcuts',
    title: 'Scurtături Tastatură',
    description: 'Navighează rapid cu Ctrl+K pentru Command Palette sau Shift+? pentru lista completă de scurtături.',
    icon: <Keyboard className="w-6 h-6" />,
    position: 'center',
  },
  {
    id: 'complete',
    title: 'Gata de Start!',
    description: 'Acum ești pregătit să folosești DocumentIulia. Dacă ai nevoie de ajutor, accesează secțiunea Help sau contactează-ne.',
    icon: <CheckCircle className="w-6 h-6" />,
    position: 'center',
  },
];

interface OnboardingTourProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function OnboardingTour({ onComplete, forceShow = false }: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    if (!hasCompletedOnboarding || forceShow) {
      // Small delay to let the page render
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_at', new Date().toISOString());
    setIsActive(false);
    onComplete?.();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('onboarding_skipped', 'true');
    setIsActive(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return;

      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      }
    },
    [isActive, handleNext, handlePrevious, handleSkip]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isActive || dismissed) return null;

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Spotlight effect - could be enhanced with actual element highlighting */}
      {step.target && (
        <div className="absolute inset-0 pointer-events-none">
          {/* This could highlight the target element */}
        </div>
      )}

      {/* Tour Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
                  {step.icon}
                </div>
                <div>
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                    Pas {currentStep + 1} din {TOUR_STEPS.length}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {step.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Feature Highlights for specific steps */}
          {step.id === 'welcome' && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'e-Factura ANAF', color: 'bg-green-100 text-green-700' },
                  { label: 'SAF-T D406', color: 'bg-blue-100 text-blue-700' },
                  { label: 'TVA 21%/11%', color: 'bg-purple-100 text-purple-700' },
                  { label: 'OCR AI 99.2%', color: 'bg-orange-100 text-orange-700' },
                ].map((feature) => (
                  <span
                    key={feature.label}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${feature.color}`}
                  >
                    {feature.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Sari peste
              </button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Înapoi
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <>
                      Finalizează
                      <CheckCircle className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Continuă
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-1.5 pb-4">
            {TOUR_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-primary-500'
                    : index < currentStep
                    ? 'bg-primary-300'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manually trigger onboarding
export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);

  const startTour = useCallback(() => {
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_skipped');
    setShowTour(true);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_skipped');
  }, []);

  return { showTour, startTour, resetTour, setShowTour };
}

export default OnboardingTour;
