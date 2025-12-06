'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Minus } from 'lucide-react';

// Context for Accordion
interface AccordionContextType {
  openItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
}

// Main Accordion
interface AccordionProps {
  children: ReactNode;
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
}

export function Accordion({
  children,
  type = 'single',
  defaultValue,
  className = '',
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const toggleItem = (value: string) => {
    if (type === 'single') {
      setOpenItems((prev) => (prev.includes(value) ? [] : [value]));
    } else {
      setOpenItems((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      );
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={`divide-y divide-gray-200 dark:divide-gray-800 ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

// Accordion Item
interface AccordionItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

const AccordionItemContext = createContext<{ value: string; isOpen: boolean } | null>(null);

export function AccordionItem({ value, children, className = '' }: AccordionItemProps) {
  const { openItems } = useAccordion();
  const isOpen = openItems.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div className={className}>{children}</div>
    </AccordionItemContext.Provider>
  );
}

// Accordion Trigger
interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  iconPosition?: 'left' | 'right';
  iconType?: 'chevron' | 'plus-minus';
}

export function AccordionTrigger({
  children,
  className = '',
  iconPosition = 'right',
  iconType = 'chevron',
}: AccordionTriggerProps) {
  const { toggleItem } = useAccordion();
  const itemContext = useContext(AccordionItemContext);

  if (!itemContext) {
    throw new Error('AccordionTrigger must be used within an AccordionItem');
  }

  const { value, isOpen } = itemContext;

  const Icon = iconType === 'chevron' ? ChevronDown : isOpen ? Minus : Plus;

  return (
    <button
      type="button"
      onClick={() => toggleItem(value)}
      className={`
        flex items-center justify-between w-full py-4 text-left
        font-medium text-gray-900 dark:text-white
        hover:text-primary dark:hover:text-primary
        transition-colors
        ${className}
      `}
    >
      {iconPosition === 'left' && (
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="mr-3 flex-shrink-0"
        >
          <Icon className="w-5 h-5" />
        </motion.span>
      )}
      <span className="flex-1">{children}</span>
      {iconPosition === 'right' && (
        <motion.span
          animate={{ rotate: iconType === 'chevron' ? (isOpen ? 180 : 0) : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-3 flex-shrink-0"
        >
          <Icon className="w-5 h-5" />
        </motion.span>
      )}
    </button>
  );
}

// Accordion Content
interface AccordionContentProps {
  children: ReactNode;
  className?: string;
}

export function AccordionContent({ children, className = '' }: AccordionContentProps) {
  const itemContext = useContext(AccordionItemContext);

  if (!itemContext) {
    throw new Error('AccordionContent must be used within an AccordionItem');
  }

  const { isOpen } = itemContext;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className={`pb-4 text-gray-600 dark:text-gray-400 ${className}`}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple Accordion (all-in-one)
interface SimpleAccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  icon?: ReactNode;
}

interface SimpleAccordionProps {
  items: SimpleAccordionItem[];
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  variant?: 'default' | 'bordered' | 'separated';
  className?: string;
}

export function SimpleAccordion({
  items,
  type = 'single',
  defaultValue,
  variant = 'default',
  className = '',
}: SimpleAccordionProps) {
  const variantStyles = {
    default: 'divide-y divide-gray-200 dark:divide-gray-800',
    bordered: 'border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-800',
    separated: 'space-y-3',
  };

  const itemVariantStyles = {
    default: '',
    bordered: 'px-4',
    separated: 'border border-gray-200 dark:border-gray-800 rounded-lg px-4',
  };

  return (
    <Accordion type={type} defaultValue={defaultValue} className={`${variantStyles[variant]} ${className}`}>
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id} className={itemVariantStyles[variant]}>
          <AccordionTrigger>
            <span className="flex items-center gap-3">
              {item.icon}
              {item.title}
            </span>
          </AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// FAQ Accordion (styled for FAQ sections)
interface FAQItem {
  question: string;
  answer: string | ReactNode;
}

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

export function FAQAccordion({ items, className = '' }: FAQAccordionProps) {
  return (
    <Accordion type="single" className={className}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`faq-${index}`}>
          <AccordionTrigger iconType="plus-minus">
            <span className="text-lg">{item.question}</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="prose dark:prose-invert prose-sm max-w-none">
              {typeof item.answer === 'string' ? <p>{item.answer}</p> : item.answer}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// Collapsible (single item, standalone)
interface CollapsibleProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  className = '',
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 text-left font-medium text-gray-900 dark:text-white"
      >
        {title}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Expandable Card
interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  headerAction?: ReactNode;
  className?: string;
}

export function ExpandableCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
  headerAction,
  className = '',
}: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {headerAction && (
            <span onClick={(e) => e.stopPropagation()}>{headerAction}</span>
          )}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Disclosure Group (for settings/preferences)
interface DisclosureItem {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  badge?: ReactNode;
}

interface DisclosureGroupProps {
  items: DisclosureItem[];
  type?: 'single' | 'multiple';
  className?: string;
}

export function DisclosureGroup({ items, type = 'single', className = '' }: DisclosureGroupProps) {
  return (
    <Accordion type={type} className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className="bg-gray-50 dark:bg-gray-800/50 rounded-lg"
        >
          <div className="px-4">
            <AccordionTrigger className="py-3">
              <div className="flex items-center justify-between flex-1 mr-2">
                <div>
                  <span className="font-medium">{item.title}</span>
                  {item.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.badge}
              </div>
            </AccordionTrigger>
          </div>
          <AccordionContent className="px-4 pb-4">{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
