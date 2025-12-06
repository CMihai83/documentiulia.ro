'use client';

import { useState, ReactNode, createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// Tab Context
interface TabContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabContext = createContext<TabContextType | null>(null);

function useTabContext() {
  const context = useContext(TabContext);
  if (!context) throw new Error('Tab components must be used within Tabs');
  return context;
}

// Main Tabs component - supports both defaultTab and defaultValue for shadcn compatibility
interface TabsProps {
  defaultTab?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ defaultTab, defaultValue, value, onValueChange, children, onChange, className = '' }: TabsProps) {
  const initialTab = value || defaultValue || defaultTab || '';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (id: string) => {
    if (!value) setActiveTab(id); // Only update internal state if not controlled
    onChange?.(id);
    onValueChange?.(id);
  };

  const currentTab = value || activeTab;

  return (
    <TabContext.Provider value={{ activeTab: currentTab, setActiveTab: handleTabChange }}>
      <div className={className}>{children}</div>
    </TabContext.Provider>
  );
}

// Shadcn-compatible aliases
export const TabsList = TabList;

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({ value, children, className = '', disabled = false }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={`
        relative px-4 py-2 text-sm font-medium rounded-md transition-all
        ${isActive
          ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { activeTab } = useTabContext();

  if (activeTab !== value) return null;

  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Tab List (container for tab triggers)
interface TabListProps {
  children: ReactNode;
  variant?: 'default' | 'pills' | 'underline' | 'bordered';
  fullWidth?: boolean;
  className?: string;
}

const listVariants = {
  default: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
  pills: 'gap-2',
  underline: 'border-b border-gray-200 dark:border-gray-700 gap-4',
  bordered: 'border border-gray-200 dark:border-gray-700 rounded-lg p-1',
};

export function TabList({ children, variant = 'default', fullWidth = false, className = '' }: TabListProps) {
  return (
    <div
      className={`
        flex ${fullWidth ? 'w-full' : 'inline-flex'}
        ${listVariants[variant]}
        ${className}
      `}
      role="tablist"
    >
      {children}
    </div>
  );
}

// Individual Tab Trigger
interface TabTriggerProps {
  id: string;
  children: ReactNode;
  icon?: LucideIcon;
  badge?: number | string;
  disabled?: boolean;
  variant?: 'default' | 'pills' | 'underline' | 'bordered';
  className?: string;
}

export function TabTrigger({
  id,
  children,
  icon: Icon,
  badge,
  disabled = false,
  variant = 'default',
  className = '',
}: TabTriggerProps) {
  const { activeTab, setActiveTab } = useTabContext();
  const isActive = activeTab === id;

  const baseStyles = 'relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all focus:outline-none';

  const variantStyles = {
    default: `
      rounded-md
      ${isActive
        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }
    `,
    pills: `
      rounded-full
      ${isActive
        ? 'bg-primary text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }
    `,
    underline: `
      pb-3 border-b-2 -mb-px
      ${isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
      }
    `,
    bordered: `
      rounded-md
      ${isActive
        ? 'bg-primary/10 text-primary border border-primary/20'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
      }
    `,
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(id)}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
      {badge !== undefined && (
        <span className={`
          ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full
          ${isActive
            ? variant === 'pills' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }
        `}>
          {badge}
        </span>
      )}
      {variant === 'default' && isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-white dark:bg-gray-900 rounded-md shadow-sm -z-10"
          transition={{ type: 'spring', duration: 0.3 }}
        />
      )}
    </button>
  );
}

// Tab Panels container
interface TabPanelsProps {
  children: ReactNode;
  className?: string;
}

export function TabPanels({ children, className = '' }: TabPanelsProps) {
  return <div className={className}>{children}</div>;
}

// Individual Tab Panel
interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className = '' }: TabPanelProps) {
  const { activeTab } = useTabContext();

  if (activeTab !== id) return null;

  return (
    <motion.div
      role="tabpanel"
      id={`panel-${id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Vertical Tabs
interface VerticalTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    badge?: number | string;
    content: ReactNode;
  }>;
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function VerticalTabs({ tabs, defaultTab, onChange, className = '' }: VerticalTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleChange = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  return (
    <div className={`flex gap-6 ${className}`}>
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleChange(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`
                    px-1.5 py-0.5 text-xs font-medium rounded-full
                    ${isActive ? 'bg-primary/20' : 'bg-gray-200 dark:bg-gray-700'}
                  `}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex-1">
        {tabs.map((tab) => (
          activeTab === tab.id && (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tab.content}
            </motion.div>
          )
        ))}
      </div>
    </div>
  );
}

// Simple Tabs (all-in-one component)
interface SimpleTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    content: ReactNode;
  }>;
  defaultTab?: string;
  variant?: 'default' | 'pills' | 'underline';
  onChange?: (tabId: string) => void;
  className?: string;
}

export function SimpleTabs({ tabs, defaultTab, variant = 'default', onChange, className = '' }: SimpleTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleChange = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  const listVariantStyles = {
    default: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
    pills: 'gap-2',
    underline: 'border-b border-gray-200 dark:border-gray-700 gap-4 pb-0',
  };

  const tabVariantStyles = {
    default: (isActive: boolean) => `
      px-4 py-2 rounded-md text-sm font-medium transition-all
      ${isActive
        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }
    `,
    pills: (isActive: boolean) => `
      px-4 py-2 rounded-full text-sm font-medium transition-all
      ${isActive
        ? 'bg-primary text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }
    `,
    underline: (isActive: boolean) => `
      px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-all
      ${isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }
    `,
  };

  return (
    <div className={className}>
      <div className={`flex ${listVariantStyles[variant]}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleChange(tab.id)}
              className={`flex items-center gap-2 ${tabVariantStyles[variant](isActive)}`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {tabs.map((tab) => (
          activeTab === tab.id && (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tab.content}
            </motion.div>
          )
        ))}
      </div>
    </div>
  );
}
