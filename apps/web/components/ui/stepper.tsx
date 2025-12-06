'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  optional?: boolean;
  disabled?: boolean;
}

export type StepStatus = 'pending' | 'current' | 'completed' | 'error';
export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperSize = 'sm' | 'md' | 'lg';

// ============================================================================
// Stepper Context
// ============================================================================

interface StepperContextValue {
  steps: StepItem[];
  currentStep: number;
  orientation: StepperOrientation;
  size: StepperSize;
  clickable: boolean;
  showStepNumbers: boolean;
  variant: 'default' | 'outline' | 'ghost';
  setCurrentStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  getStepStatus: (index: number) => StepStatus;
  isFirstStep: boolean;
  isLastStep: boolean;
  completedSteps: Set<number>;
  errorSteps: Set<number>;
}

const StepperContext = React.createContext<StepperContextValue | undefined>(undefined);

function useStepper() {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error('useStepper must be used within a StepperProvider');
  }
  return context;
}

// ============================================================================
// Stepper Root
// ============================================================================

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: StepItem[];
  currentStep?: number;
  onStepChange?: (step: number) => void;
  orientation?: StepperOrientation;
  size?: StepperSize;
  clickable?: boolean;
  showStepNumbers?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  completedSteps?: number[];
  errorSteps?: number[];
}

export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      className,
      steps,
      currentStep: controlledStep,
      onStepChange,
      orientation = 'horizontal',
      size = 'md',
      clickable = true,
      showStepNumbers = true,
      variant = 'default',
      completedSteps: completedStepsProp = [],
      errorSteps: errorStepsProp = [],
      children,
      ...props
    },
    ref
  ) => {
    const [internalStep, setInternalStep] = React.useState(0);
    const currentStep = controlledStep ?? internalStep;

    const completedSteps = React.useMemo(
      () => new Set(completedStepsProp),
      [completedStepsProp]
    );

    const errorSteps = React.useMemo(
      () => new Set(errorStepsProp),
      [errorStepsProp]
    );

    const setCurrentStep = (step: number) => {
      if (step >= 0 && step < steps.length) {
        setInternalStep(step);
        onStepChange?.(step);
      }
    };

    const goToNextStep = () => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    };

    const goToPreviousStep = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    };

    const getStepStatus = (index: number): StepStatus => {
      if (errorSteps.has(index)) return 'error';
      if (completedSteps.has(index) || index < currentStep) return 'completed';
      if (index === currentStep) return 'current';
      return 'pending';
    };

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;

    return (
      <StepperContext.Provider
        value={{
          steps,
          currentStep,
          orientation,
          size,
          clickable,
          showStepNumbers,
          variant,
          setCurrentStep,
          goToNextStep,
          goToPreviousStep,
          getStepStatus,
          isFirstStep,
          isLastStep,
          completedSteps,
          errorSteps,
        }}
      >
        <div
          ref={ref}
          className={cn(
            'flex',
            orientation === 'horizontal' ? 'flex-row items-start' : 'flex-col',
            className
          )}
          {...props}
        >
          {children || <StepperItems />}
        </div>
      </StepperContext.Provider>
    );
  }
);
Stepper.displayName = 'Stepper';

// ============================================================================
// Stepper Items
// ============================================================================

function StepperItems() {
  const { steps, orientation } = useStepper();

  return (
    <>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <StepperItem step={step} index={index} />
          {index < steps.length - 1 && <StepperConnector index={index} />}
        </React.Fragment>
      ))}
    </>
  );
}

// ============================================================================
// Stepper Item
// ============================================================================

interface StepperItemProps {
  step: StepItem;
  index: number;
}

function StepperItem({ step, index }: StepperItemProps) {
  const {
    currentStep,
    size,
    clickable,
    showStepNumbers,
    variant,
    setCurrentStep,
    getStepStatus,
  } = useStepper();

  const status = getStepStatus(index);
  const isClickable = clickable && !step.disabled;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const getIndicatorClasses = () => {
    const baseClasses = cn(
      'flex items-center justify-center rounded-full font-medium transition-all',
      sizeClasses[size]
    );

    switch (status) {
      case 'completed':
        return cn(baseClasses, 'bg-primary text-primary-foreground');
      case 'current':
        return cn(
          baseClasses,
          variant === 'default'
            ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
            : variant === 'outline'
            ? 'border-2 border-primary text-primary'
            : 'bg-primary/10 text-primary'
        );
      case 'error':
        return cn(baseClasses, 'bg-destructive text-destructive-foreground');
      default:
        return cn(
          baseClasses,
          variant === 'default'
            ? 'bg-muted text-muted-foreground'
            : variant === 'outline'
            ? 'border-2 border-muted text-muted-foreground'
            : 'bg-muted/50 text-muted-foreground'
        );
    }
  };

  const handleClick = () => {
    if (isClickable) {
      setCurrentStep(index);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2',
        isClickable && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      <motion.div
        className={getIndicatorClasses()}
        animate={status === 'current' ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: status === 'current' ? Infinity : 0, duration: 2 }}
      >
        {status === 'completed' ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : status === 'error' ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : step.icon ? (
          step.icon
        ) : showStepNumbers ? (
          index + 1
        ) : (
          <div className="w-2 h-2 rounded-full bg-current" />
        )}
      </motion.div>

      <div className="text-center max-w-[120px]">
        <p
          className={cn(
            'text-sm font-medium',
            status === 'current'
              ? 'text-foreground'
              : status === 'completed'
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {step.title}
        </p>
        {step.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        )}
        {step.optional && (
          <span className="text-xs text-muted-foreground">(Optional)</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Stepper Connector
// ============================================================================

interface StepperConnectorProps {
  index: number;
}

function StepperConnector({ index }: StepperConnectorProps) {
  const { orientation, getStepStatus, size } = useStepper();
  const status = getStepStatus(index);
  const isCompleted = status === 'completed';

  const heightClasses = {
    sm: 'h-0.5',
    md: 'h-0.5',
    lg: 'h-1',
  };

  if (orientation === 'vertical') {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="w-0.5 h-8 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: isCompleted ? '100%' : 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-primary"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center px-2 mt-4">
      <div className={cn('w-full rounded-full bg-muted overflow-hidden', heightClasses[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isCompleted ? '100%' : 0 }}
          transition={{ duration: 0.3 }}
          className="h-full bg-primary"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Stepper Content
// ============================================================================

interface StepperContentProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number;
}

export const StepperContent = React.forwardRef<HTMLDivElement, StepperContentProps>(
  ({ className, step, children }, ref) => {
    const { currentStep } = useStepper();

    return (
      <AnimatePresence mode="wait">
        {currentStep === step && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={cn('mt-6', className)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
StepperContent.displayName = 'StepperContent';

// ============================================================================
// Stepper Actions
// ============================================================================

interface StepperActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  showPrevious?: boolean;
  showNext?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  disableNext?: boolean;
}

export const StepperActions = React.forwardRef<HTMLDivElement, StepperActionsProps>(
  (
    {
      className,
      showPrevious = true,
      showNext = true,
      previousLabel = 'Inapoi',
      nextLabel = 'Continua',
      finishLabel = 'Finalizeaza',
      onPrevious,
      onNext,
      onFinish,
      disableNext = false,
      ...props
    },
    ref
  ) => {
    const { goToPreviousStep, goToNextStep, isFirstStep, isLastStep } = useStepper();

    const handlePrevious = () => {
      onPrevious?.();
      goToPreviousStep();
    };

    const handleNext = () => {
      if (isLastStep) {
        onFinish?.();
      } else {
        onNext?.();
        goToNextStep();
      }
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between mt-6', className)}
        {...props}
      >
        {showPrevious && !isFirstStep ? (
          <button
            type="button"
            onClick={handlePrevious}
            className="px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent transition-colors"
          >
            {previousLabel}
          </button>
        ) : (
          <div />
        )}

        {showNext && (
          <button
            type="button"
            onClick={handleNext}
            disabled={disableNext}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              disableNext && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLastStep ? finishLabel : nextLabel}
          </button>
        )}
      </div>
    );
  }
);
StepperActions.displayName = 'StepperActions';

// ============================================================================
// Vertical Stepper
// ============================================================================

interface VerticalStepperProps extends Omit<StepperProps, 'orientation'> {
  expandContent?: boolean;
}

export function VerticalStepper({
  steps,
  expandContent = true,
  children,
  ...props
}: VerticalStepperProps) {
  return (
    <Stepper steps={steps} orientation="vertical" {...props}>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <VerticalStepItem key={step.id} step={step} index={index} expandContent={expandContent}>
            {React.Children.toArray(children).find(
              (child) =>
                React.isValidElement(child) &&
                (child.props as StepperContentProps).step === index
            )}
          </VerticalStepItem>
        ))}
      </div>
    </Stepper>
  );
}

interface VerticalStepItemProps {
  step: StepItem;
  index: number;
  expandContent?: boolean;
  children?: React.ReactNode;
}

function VerticalStepItem({ step, index, expandContent, children }: VerticalStepItemProps) {
  const { currentStep, getStepStatus, setCurrentStep, clickable, size, showStepNumbers } = useStepper();
  const status = getStepStatus(index);
  const isActive = currentStep === index;
  const isClickable = clickable && !step.disabled;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const getIndicatorClasses = () => {
    const baseClasses = cn(
      'flex items-center justify-center rounded-full font-medium transition-all shrink-0',
      sizeClasses[size]
    );

    switch (status) {
      case 'completed':
        return cn(baseClasses, 'bg-primary text-primary-foreground');
      case 'current':
        return cn(baseClasses, 'bg-primary text-primary-foreground ring-4 ring-primary/20');
      case 'error':
        return cn(baseClasses, 'bg-destructive text-destructive-foreground');
      default:
        return cn(baseClasses, 'bg-muted text-muted-foreground');
    }
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(getIndicatorClasses(), isClickable && 'cursor-pointer')}
          onClick={() => isClickable && setCurrentStep(index)}
        >
          {status === 'completed' ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : status === 'error' ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : step.icon ? (
            step.icon
          ) : showStepNumbers ? (
            index + 1
          ) : (
            <div className="w-2 h-2 rounded-full bg-current" />
          )}
        </div>
        {index < 4 && ( // Show connector unless last item
          <div className="w-0.5 flex-1 bg-muted mt-2 min-h-[24px]">
            {status === 'completed' && <div className="w-full h-full bg-primary" />}
          </div>
        )}
      </div>

      <div className="flex-1 pb-4">
        <div
          className={cn('mb-2', isClickable && 'cursor-pointer')}
          onClick={() => isClickable && setCurrentStep(index)}
        >
          <h3
            className={cn(
              'text-sm font-medium',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {step.title}
          </h3>
          {step.description && (
            <p className="text-xs text-muted-foreground">{step.description}</p>
          )}
        </div>

        {expandContent && (
          <AnimatePresence>
            {isActive && children && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Simple Stepper (pre-built)
// ============================================================================

interface SimpleStepperProps {
  steps: Array<{ title: string; description?: string }>;
  currentStep?: number;
  onStepChange?: (step: number) => void;
  className?: string;
}

export function SimpleStepper({
  steps: simpleSteps,
  currentStep,
  onStepChange,
  className,
}: SimpleStepperProps) {
  const steps: StepItem[] = simpleSteps.map((step, index) => ({
    id: `step-${index}`,
    title: step.title,
    description: step.description,
  }));

  return (
    <Stepper
      steps={steps}
      currentStep={currentStep}
      onStepChange={onStepChange}
      className={className}
    />
  );
}

// ============================================================================
// Progress Stepper
// ============================================================================

interface ProgressStepperProps {
  steps: string[];
  currentStep?: number;
  showProgress?: boolean;
  className?: string;
}

export function ProgressStepper({
  steps: stepLabels,
  currentStep = 0,
  showProgress = true,
  className,
}: ProgressStepperProps) {
  const progress = ((currentStep + 1) / stepLabels.length) * 100;

  return (
    <div className={cn('space-y-4', className)}>
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Pasul {currentStep + 1} din {stepLabels.length}
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        {stepLabels.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div
              key={index}
              className={cn(
                'text-xs',
                isCurrent
                  ? 'text-primary font-medium'
                  : isCompleted
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Checkout Stepper (E-commerce specific)
// ============================================================================

interface CheckoutStepperProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
  className?: string;
}

export function CheckoutStepper({
  currentStep = 0,
  onStepChange,
  className,
}: CheckoutStepperProps) {
  const steps: StepItem[] = [
    { id: 'cart', title: 'Cos', icon: <CartIcon /> },
    { id: 'shipping', title: 'Livrare', icon: <TruckIcon /> },
    { id: 'payment', title: 'Plata', icon: <CreditCardIcon /> },
    { id: 'confirm', title: 'Confirmare', icon: <CheckIcon /> },
  ];

  return (
    <Stepper
      steps={steps}
      currentStep={currentStep}
      onStepChange={onStepChange}
      showStepNumbers={false}
      className={className}
    />
  );
}

// Icons for checkout stepper
function CartIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ============================================================================
// Form Wizard Stepper
// ============================================================================

interface FormWizardProps {
  steps: Array<{
    title: string;
    description?: string;
    content: React.ReactNode;
    validate?: () => boolean | Promise<boolean>;
  }>;
  onComplete?: () => void;
  className?: string;
}

export function FormWizard({ steps, onComplete, className }: FormWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
  const [errorSteps, setErrorSteps] = React.useState<number[]>([]);

  const stepItems: StepItem[] = steps.map((step, index) => ({
    id: `step-${index}`,
    title: step.title,
    description: step.description,
  }));

  const handleNext = async () => {
    const currentStepData = steps[currentStep];

    if (currentStepData.validate) {
      const isValid = await currentStepData.validate();
      if (!isValid) {
        setErrorSteps((prev) => [...prev, currentStep]);
        return;
      }
    }

    // Remove from errors and add to completed
    setErrorSteps((prev) => prev.filter((s) => s !== currentStep));
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Stepper
        steps={stepItems}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        completedSteps={completedSteps}
        errorSteps={errorSteps}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {steps[currentStep].content}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className={cn(
            'px-4 py-2 text-sm font-medium border border-input rounded-md transition-colors',
            currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'
          )}
        >
          Inapoi
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {currentStep === steps.length - 1 ? 'Finalizeaza' : 'Continua'}
        </button>
      </div>
    </div>
  );
}

export { useStepper };
