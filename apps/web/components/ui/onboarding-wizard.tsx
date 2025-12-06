'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Building2,
  User,
  CreditCard,
  FileText,
  Settings,
  Sparkles,
  ArrowRight,
  Upload,
  Download,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  Users,
  Calendar,
  Receipt,
  Banknote,
  Shield,
  Loader2,
  X,
  HelpCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  Info,
  ExternalLink,
  Play,
  SkipForward,
  Target,
  TrendingUp,
  PiggyBank,
  Calculator,
  BookOpen,
} from 'lucide-react';

// Types
export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  required?: boolean;
  completed?: boolean;
  skippable?: boolean;
};

export interface OnboardingWizardProps {
  steps: OnboardingStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSkip?: () => void;
  companyName?: string;
  userName?: string;
  variant?: 'default' | 'compact' | 'fullscreen';
  className?: string;
  children?: React.ReactNode;
}

export interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  variant?: 'dots' | 'bar' | 'steps' | 'numbered';
  className?: string;
}

export interface OnboardingStepCardProps {
  step: OnboardingStep;
  stepNumber: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick?: () => void;
  className?: string;
}

export interface WelcomeScreenProps {
  companyName?: string;
  userName?: string;
  onStart: () => void;
  onSkip?: () => void;
  className?: string;
}

export interface CompletionScreenProps {
  companyName?: string;
  userName?: string;
  onFinish: () => void;
  onExplore?: () => void;
  completedSteps: number;
  totalSteps: number;
  className?: string;
}

// Default Romanian onboarding steps
export const defaultOnboardingSteps: OnboardingStep[] = [
  {
    id: 'company',
    title: 'Date companie',
    description: 'Configurați informațiile despre compania dumneavoastră',
    icon: Building2,
    required: true,
  },
  {
    id: 'profile',
    title: 'Profil utilizator',
    description: 'Completați datele personale și preferințele',
    icon: User,
    required: true,
  },
  {
    id: 'banking',
    title: 'Conturi bancare',
    description: 'Adăugați conturile bancare ale companiei',
    icon: CreditCard,
    skippable: true,
  },
  {
    id: 'documents',
    title: 'Șabloane documente',
    description: 'Personalizați facturile și alte documente',
    icon: FileText,
    skippable: true,
  },
  {
    id: 'settings',
    title: 'Setări finale',
    description: 'Configurați TVA, monede și alte opțiuni',
    icon: Settings,
    required: true,
  },
];

// Helper function to get step icon color
const getStepIconColor = (isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return 'text-green-500 bg-green-50 dark:bg-green-950/30';
  if (isActive) return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30';
  return 'text-slate-400 bg-slate-100 dark:bg-slate-800';
};

// Onboarding Progress Component
export function OnboardingProgress({
  steps,
  currentStep,
  onStepClick,
  variant = 'steps',
  className,
}: OnboardingProgressProps) {
  const progress = useMemo(() => {
    const completed = steps.filter((s) => s.completed).length;
    return (completed / steps.length) * 100;
  }, [steps]);

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center justify-center gap-2', className)}>
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => onStepClick?.(index)}
            disabled={!onStepClick}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              index === currentStep
                ? 'w-8 bg-blue-500'
                : step.completed
                ? 'bg-green-500'
                : 'bg-slate-300 dark:bg-slate-600',
              onStepClick && 'cursor-pointer hover:scale-110'
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Pasul {currentStep + 1} din {steps.length}
          </span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          />
        </div>
      </div>
    );
  }

  if (variant === 'numbered') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick}
              className={cn(
                'flex flex-col items-center',
                onStepClick && 'cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index === currentStep
                    ? 'bg-blue-500 text-white'
                    : step.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                )}
              >
                {step.completed ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              <span
                className={cn(
                  'text-xs mt-1.5 max-w-[80px] text-center',
                  index === currentStep
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {step.title}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  step.completed
                    ? 'bg-green-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Default 'steps' variant
  return (
    <div className={cn('space-y-2', className)}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = step.completed || false;

        return (
          <button
            key={step.id}
            onClick={() => onStepClick?.(index)}
            disabled={!onStepClick}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
              isActive
                ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
              onStepClick && 'cursor-pointer'
            )}
          >
            <div
              className={cn(
                'p-2 rounded-lg transition-colors',
                getStepIconColor(isActive, isCompleted)
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-medium',
                  isActive
                    ? 'text-blue-700 dark:text-blue-300'
                    : isCompleted
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-slate-700 dark:text-slate-300'
                )}
              >
                {step.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {step.description}
              </p>
            </div>
            {step.required && !isCompleted && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Obligatoriu
              </span>
            )}
            {isCompleted && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Onboarding Step Card Component
export function OnboardingStepCard({
  step,
  stepNumber,
  isActive,
  isCompleted,
  onClick,
  className,
}: OnboardingStepCardProps) {
  const Icon = step.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative p-4 rounded-xl border transition-all cursor-pointer',
        isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg shadow-blue-500/10'
          : isCompleted
          ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
        className
      )}
    >
      {isCompleted && (
        <div className="absolute -top-2 -right-2 p-1 bg-green-500 rounded-full">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-3 rounded-lg',
            getStepIconColor(isActive, isCompleted)
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Pasul {stepNumber}
            </span>
            {step.required && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                Obligatoriu
              </span>
            )}
          </div>
          <h3
            className={cn(
              'font-medium mb-1',
              isActive
                ? 'text-blue-700 dark:text-blue-300'
                : isCompleted
                ? 'text-green-700 dark:text-green-300'
                : 'text-slate-900 dark:text-slate-100'
            )}
          >
            {step.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {step.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Welcome Screen Component
export function WelcomeScreen({
  companyName,
  userName,
  onStart,
  onSkip,
  className,
}: WelcomeScreenProps) {
  const features = [
    { icon: FileText, label: 'Facturi și documente', description: 'Generați facturi profesionale în câteva secunde' },
    { icon: Calculator, label: 'Contabilitate simplă', description: 'Urmăriți veniturile și cheltuielile cu ușurință' },
    { icon: Receipt, label: 'Gestiune bonuri', description: 'Scanați și organizați bonurile automat' },
    { icon: TrendingUp, label: 'Rapoarte inteligente', description: 'Vizualizați performanța financiară' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center text-center p-8 max-w-2xl mx-auto',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6"
      >
        <Sparkles className="h-12 w-12 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2"
      >
        Bine ați venit{userName ? `, ${userName}` : ''}!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-slate-600 dark:text-slate-400 mb-8"
      >
        {companyName ? (
          <>
            Să configurăm <strong>{companyName}</strong> pentru succes
          </>
        ) : (
          'Să configurăm contul dumneavoastră pentru succes'
        )}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 gap-4 mb-8 w-full"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-left"
            >
              <Icon className="h-6 w-6 text-blue-500 mb-2" />
              <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-1">
                {feature.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Play className="h-5 w-5" />
          <span>Începeți configurarea</span>
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <SkipForward className="h-4 w-4" />
            <span>Săriți peste</span>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// Completion Screen Component
export function CompletionScreen({
  companyName,
  userName,
  onFinish,
  onExplore,
  completedSteps,
  totalSteps,
  className,
}: CompletionScreenProps) {
  const suggestions = [
    { icon: FileText, label: 'Creați prima factură', action: 'Factură nouă' },
    { icon: Users, label: 'Adăugați clienți', action: 'Clienți' },
    { icon: BookOpen, label: 'Explorați tutorialele', action: 'Ajutor' },
    { icon: Target, label: 'Setați obiective', action: 'Obiective' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center text-center p-8 max-w-2xl mx-auto',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="relative mb-6"
      >
        <div className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
          <CheckCircle2 className="h-16 w-16 text-white" />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-2 -right-2 p-2 bg-yellow-400 rounded-full"
        >
          <Sparkles className="h-5 w-5 text-yellow-900" />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2"
      >
        Felicitări! 🎉
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-slate-600 dark:text-slate-400 mb-2"
      >
        {companyName
          ? `${companyName} este gata de utilizare!`
          : 'Contul dumneavoastră este gata de utilizare!'}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8"
      >
        <Check className="h-4 w-4 text-green-500" />
        <span>
          {completedSteps} din {totalSteps} pași completați
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full mb-8"
      >
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Ce doriți să faceți în continuare?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {suggestions.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                onClick={onExplore}
                className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.label}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {item.action} →
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onFinish}
        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25"
      >
        <span>Mergeți la Dashboard</span>
        <ArrowRight className="h-5 w-5" />
      </motion.button>
    </motion.div>
  );
}

// Main Onboarding Wizard Component
export function OnboardingWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onSkip,
  companyName,
  userName,
  variant = 'default',
  className,
  children,
}: OnboardingWizardProps) {
  const [showWelcome, setShowWelcome] = useState(currentStep === -1);
  const [showCompletion, setShowCompletion] = useState(false);

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const completedSteps = steps.filter((s) => s.completed).length;
  const canProceed = !currentStepData?.required || currentStepData?.completed;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setShowCompletion(true);
    } else {
      onStepChange(currentStep + 1);
    }
  }, [currentStep, isLastStep, onStepChange]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, isFirstStep, onStepChange]);

  const handleStart = useCallback(() => {
    setShowWelcome(false);
    onStepChange(0);
  }, [onStepChange]);

  const handleFinish = useCallback(() => {
    setShowCompletion(false);
    onComplete();
  }, [onComplete]);

  if (showWelcome) {
    return (
      <WelcomeScreen
        companyName={companyName}
        userName={userName}
        onStart={handleStart}
        onSkip={onSkip}
        className={className}
      />
    );
  }

  if (showCompletion) {
    return (
      <CompletionScreen
        companyName={companyName}
        userName={userName}
        onFinish={handleFinish}
        completedSteps={completedSteps}
        totalSteps={steps.length}
        className={className}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        <OnboardingProgress
          steps={steps}
          currentStep={currentStep}
          variant="bar"
        />
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border">
          {children}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Înapoi</span>
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            <span>{isLastStep ? 'Finalizare' : 'Continuă'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div className={cn('fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50', className)}>
        <div className="h-full flex">
          {/* Sidebar */}
          <div className="hidden md:flex flex-col w-80 bg-white dark:bg-slate-900 border-r p-6">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Configurare cont
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {completedSteps} din {steps.length} pași completați
              </p>
            </div>
            <OnboardingProgress
              steps={steps}
              currentStep={currentStep}
              onStepClick={onStepChange}
              variant="steps"
              className="flex-1"
            />
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <SkipForward className="h-4 w-4" />
                <span>Săriți configurarea</span>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile header */}
            <div className="md:hidden p-4 bg-white dark:bg-slate-900 border-b">
              <OnboardingProgress
                steps={steps}
                currentStep={currentStep}
                variant="dots"
              />
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto p-6 md:p-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto"
                >
                  {currentStepData && (
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={cn(
                            'p-3 rounded-xl',
                            getStepIconColor(true, false)
                          )}
                        >
                          {React.createElement(currentStepData.icon, {
                            className: 'h-6 w-6',
                          })}
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {currentStepData.title}
                          </h1>
                          <p className="text-slate-600 dark:text-slate-400">
                            {currentStepData.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                <button
                  onClick={handleBack}
                  disabled={isFirstStep}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Înapoi</span>
                </button>
                <div className="flex items-center gap-3">
                  {currentStepData?.skippable && !currentStepData?.completed && (
                    <button
                      onClick={handleNext}
                      className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Săriți acest pas
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <span>{isLastStep ? 'Finalizare' : 'Continuă'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl border shadow-lg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Configurare cont
          </h2>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Săriți peste
            </button>
          )}
        </div>
        <OnboardingProgress
          steps={steps}
          currentStep={currentStep}
          variant="numbered"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-6 border-t bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Înapoi</span>
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            <span>{isLastStep ? 'Finalizare' : 'Continuă'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Onboarding Checklist Component (Sidebar variant)
export function OnboardingChecklist({
  steps,
  currentStep,
  onStepClick,
  className,
}: {
  steps: OnboardingStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}) {
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className={cn('bg-white dark:bg-slate-900 rounded-xl border p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">
          Configurare cont
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {completedCount}/{steps.length}
        </span>
      </div>

      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-green-500 rounded-full"
        />
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.completed || false;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick}
              className={cn(
                'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
                index === currentStep
                  ? 'bg-blue-50 dark:bg-blue-950/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                onStepClick && 'cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-sm',
                  isCompleted
                    ? 'text-green-700 dark:text-green-300 line-through'
                    : index === currentStep
                    ? 'text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default OnboardingWizard;
