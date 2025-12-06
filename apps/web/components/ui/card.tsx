'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// Base Card
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

// Shadcn-compatible CardTitle (simple title component)
interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`font-semibold text-gray-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
}

export function Card({
  children,
  className = '',
  hover = false,
  onClick,
  padding = 'md',
}: CardProps) {
  const baseClasses = `
    bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800
    ${paddingStyles[padding]}
    ${hover ? 'hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `;

  if (onClick) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={baseClasses}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClasses}>{children}</div>;
}

// Card Header - supports both title prop and children
interface CardHeaderProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  children?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  icon: Icon,
  iconColor = 'text-primary',
  className = '',
  children,
}: CardHeaderProps) {
  // If children are provided, use simpler shadcn-compatible layout
  if (children) {
    return (
      <div className={`pb-2 ${className}`}>
        {children}
      </div>
    );
  }

  // Original layout for title-based usage
  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Card Content
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}

// Card Footer
interface CardFooterProps {
  children: ReactNode;
  className?: string;
  border?: boolean;
}

export function CardFooter({ children, className = '', border = true }: CardFooterProps) {
  return (
    <div
      className={`
        mt-4 pt-4 flex items-center justify-end gap-3
        ${border ? 'border-t border-gray-200 dark:border-gray-800' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Stats Card
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  trend,
  className = '',
}: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    down: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    neutral: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
  };

  const determinedTrend = trend || (change && change.value >= 0 ? 'up' : 'down');

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        {Icon && (
          <div className={`p-3 rounded-xl ${iconBg}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}
        {change && (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              trendColors[determinedTrend || 'neutral']
            }`}
          >
            {change.value >= 0 ? '+' : ''}
            {change.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {title}
          {change?.label && <span className="ml-1">({change.label})</span>}
        </p>
      </div>
    </Card>
  );
}

// Feature Card
interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  action?: ReactNode;
  className?: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  action,
  className = '',
}: FeatureCardProps) {
  return (
    <Card hover className={className}>
      <div className={`inline-flex p-3 rounded-xl ${iconBg} mb-4`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      {action}
    </Card>
  );
}

// Info Card with list
interface InfoCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string | ReactNode;
  }>;
  icon?: LucideIcon;
  className?: string;
}

export function InfoCard({ title, items, icon: Icon, className = '' }: InfoCardProps) {
  return (
    <Card className={className}>
      <CardHeader title={title} icon={Icon} />
      <CardContent>
        <dl className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <dt className="text-sm text-gray-500 dark:text-gray-400">{item.label}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

// Action Card
interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonText: string;
  onClick: () => void;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  className?: string;
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  buttonText,
  onClick,
  variant = 'default',
  className = '',
}: ActionCardProps) {
  const variantStyles = {
    default: {
      bg: 'bg-primary/10',
      icon: 'text-primary',
      button: 'bg-primary text-white hover:bg-primary/90',
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: 'text-yellow-600',
      button: 'bg-yellow-500 text-white hover:bg-yellow-600',
    },
    danger: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      icon: 'text-red-600',
      button: 'bg-red-500 text-white hover:bg-red-600',
    },
    success: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      icon: 'text-green-600',
      button: 'bg-green-500 text-white hover:bg-green-600',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card className={`text-center ${className}`}>
      <div className={`inline-flex p-4 rounded-xl ${styles.bg} mb-4`}>
        <Icon className={`w-8 h-8 ${styles.icon}`} />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      <button
        onClick={onClick}
        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${styles.button}`}
      >
        {buttonText}
      </button>
    </Card>
  );
}

// Pricing Card
interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  buttonText: string;
  onSelect: () => void;
  popular?: boolean;
  className?: string;
}

export function PricingCard({
  name,
  price,
  period = '/lună',
  description,
  features,
  buttonText,
  onSelect,
  popular = false,
  className = '',
}: PricingCardProps) {
  return (
    <Card
      className={`relative ${popular ? 'border-primary ring-2 ring-primary/20' : ''} ${className}`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">
          Popular
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        <div className="mt-4">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{price}</span>
          <span className="text-gray-500 dark:text-gray-400">{period}</span>
        </div>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
          popular
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {buttonText}
      </button>
    </Card>
  );
}
