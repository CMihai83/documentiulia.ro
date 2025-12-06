'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, Clock, AlertCircle, X } from 'lucide-react';

// Basic Timeline
interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  icon?: ReactNode;
  status?: 'completed' | 'active' | 'pending' | 'error';
  content?: ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
  alternating?: boolean;
  animated?: boolean;
  className?: string;
}

const statusIcons = {
  completed: <Check className="w-4 h-4" />,
  active: <Circle className="w-4 h-4 fill-current" />,
  pending: <Clock className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
};

const statusColors = {
  completed: 'bg-green-500 text-white border-green-500',
  active: 'bg-primary text-white border-primary',
  pending: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600',
  error: 'bg-red-500 text-white border-red-500',
};

const lineColors = {
  completed: 'bg-green-500',
  active: 'bg-primary',
  pending: 'bg-gray-200 dark:bg-gray-700',
  error: 'bg-red-500',
};

export function Timeline({
  items,
  orientation = 'vertical',
  alternating = false,
  animated = true,
  className = '',
}: TimelineProps) {
  if (orientation === 'horizontal') {
    return (
      <div className={`flex items-start overflow-x-auto pb-4 ${className}`}>
        {items.map((item, index) => {
          const status = item.status || 'pending';
          const isLast = index === items.length - 1;

          const content = (
            <div key={item.id} className="flex items-start flex-shrink-0">
              <div className="flex flex-col items-center">
                {/* Icon */}
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${statusColors[status]}
                  `}
                >
                  {item.icon || statusIcons[status]}
                </div>

                {/* Content */}
                <div className="mt-3 text-center max-w-[150px]">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {item.title}
                  </h4>
                  {item.date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.date}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector */}
              {!isLast && (
                <div
                  className={`
                    w-20 h-0.5 mt-5 mx-2
                    ${lineColors[status]}
                  `}
                />
              )}
            </div>
          );

          return animated ? (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {content}
            </motion.div>
          ) : (
            content
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {items.map((item, index) => {
        const status = item.status || 'pending';
        const isLast = index === items.length - 1;
        const isLeft = alternating && index % 2 === 0;

        const content = (
          <div
            key={item.id}
            className={`
              relative flex items-start gap-4 pb-8
              ${alternating ? 'justify-center' : ''}
            `}
          >
            {/* Left content for alternating */}
            {alternating && (
              <div className={`flex-1 ${isLeft ? 'text-right pr-8' : 'opacity-0'}`}>
                {isLeft && (
                  <>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                    {item.date && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.date}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.content}
                  </>
                )}
              </div>
            )}

            {/* Icon and line */}
            <div className="relative flex flex-col items-center">
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 z-10
                  ${statusColors[status]}
                `}
              >
                {item.icon || statusIcons[status]}
              </div>
              {!isLast && (
                <div
                  className={`
                    absolute top-10 w-0.5 h-[calc(100%-2rem)]
                    ${lineColors[status]}
                  `}
                />
              )}
            </div>

            {/* Right content for alternating, or main content */}
            <div className={`flex-1 ${alternating && isLeft ? 'opacity-0' : alternating ? 'pl-8' : ''}`}>
              {(!alternating || !isLeft) && (
                <>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </h4>
                  {item.date && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.date}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {item.description}
                    </p>
                  )}
                  {item.content}
                </>
              )}
            </div>
          </div>
        );

        return animated ? (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {content}
          </motion.div>
        ) : (
          content
        );
      })}
    </div>
  );
}

// Simple Timeline (minimal design)
interface SimpleTimelineItem {
  id: string;
  title: string;
  date?: string;
  completed?: boolean;
}

interface SimpleTimelineProps {
  items: SimpleTimelineItem[];
  className?: string;
}

export function SimpleTimeline({ items, className = '' }: SimpleTimelineProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item, index) => (
        <div key={item.id} className="flex items-start gap-3">
          <div className="relative">
            <div
              className={`
                w-3 h-3 rounded-full mt-1.5
                ${item.completed ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
              `}
            />
            {index !== items.length - 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-200 dark:bg-gray-700" />
            )}
          </div>
          <div>
            <p
              className={`
                font-medium
                ${item.completed ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}
              `}
            >
              {item.title}
            </p>
            {item.date && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{item.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Activity Timeline (for activity feeds)
interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  target?: string;
  timestamp: string;
  icon?: ReactNode;
  iconBg?: string;
}

interface ActivityTimelineProps {
  items: ActivityItem[];
  className?: string;
}

export function ActivityTimeline({ items, className = '' }: ActivityTimelineProps) {
  return (
    <div className={`flow-root ${className}`}>
      <ul className="-mb-8">
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="relative pb-8">
              {index !== items.length - 1 && (
                <span
                  className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-start space-x-3">
                {/* Icon or Avatar */}
                {item.icon ? (
                  <div
                    className={`
                      relative flex h-10 w-10 items-center justify-center rounded-full
                      ${item.iconBg || 'bg-gray-100 dark:bg-gray-800'}
                    `}
                  >
                    {item.icon}
                  </div>
                ) : item.user.avatar ? (
                  <img
                    src={item.user.avatar}
                    alt={item.user.name}
                    className="h-10 w-10 rounded-full bg-gray-100"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {item.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.user.name}
                    </span>{' '}
                    {item.action}
                    {item.target && (
                      <>
                        {' '}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.target}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {item.timestamp}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Stepper (process steps)
interface StepperStep {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (step: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  onStepClick,
  className = '',
}: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={step.id} className="flex gap-4">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onStepClick?.(index)}
                  disabled={!onStepClick}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold
                    transition-all
                    ${isCompleted
                      ? 'bg-primary border-primary text-white'
                      : isActive
                        ? 'bg-white dark:bg-gray-900 border-primary text-primary'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400'
                    }
                    ${onStepClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                </button>
                {index !== steps.length - 1 && (
                  <div
                    className={`
                      w-0.5 h-12 mt-2
                      ${isCompleted ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}
                    `}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="pt-2">
                <h4
                  className={`
                    font-semibold
                    ${isActive ? 'text-primary' : isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}
                  `}
                >
                  {step.title}
                </h4>
                {step.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-start ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex-1 flex items-start">
            <div className="flex flex-col items-center flex-shrink-0">
              <button
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold
                  transition-all
                  ${isCompleted
                    ? 'bg-primary border-primary text-white'
                    : isActive
                      ? 'bg-white dark:bg-gray-900 border-primary text-primary'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400'
                  }
                  ${onStepClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </button>
              <div className="text-center mt-2 max-w-[100px]">
                <p
                  className={`
                    text-sm font-medium
                    ${isActive ? 'text-primary' : isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}
                  `}
                >
                  {step.title}
                </p>
              </div>
            </div>
            {!isLast && (
              <div className="flex-1 flex items-center px-4 pt-5">
                <div
                  className={`
                    h-0.5 w-full
                    ${isCompleted ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}
                  `}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Progress Timeline (for progress tracking)
interface ProgressTimelineItem {
  id: string;
  title: string;
  progress: number;
  status?: 'on-track' | 'at-risk' | 'delayed' | 'completed';
}

interface ProgressTimelineProps {
  items: ProgressTimelineItem[];
  className?: string;
}

const progressStatusColors = {
  'on-track': 'bg-green-500',
  'at-risk': 'bg-yellow-500',
  'delayed': 'bg-red-500',
  'completed': 'bg-primary',
};

export function ProgressTimeline({ items, className = '' }: ProgressTimelineProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item) => {
        const status = item.status || (item.progress >= 100 ? 'completed' : 'on-track');

        return (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.title}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {item.progress}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(item.progress, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full ${progressStatusColors[status]}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// History Timeline (for document/record history)
interface HistoryItem {
  id: string;
  action: string;
  description?: string;
  timestamp: string;
  user?: string;
  changes?: { field: string; from?: string; to?: string }[];
}

interface HistoryTimelineProps {
  items: HistoryItem[];
  className?: string;
}

export function HistoryTimeline({ items, className = '' }: HistoryTimelineProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item, index) => (
        <div key={item.id} className="relative pl-6">
          {/* Connector */}
          {index !== items.length - 1 && (
            <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          )}

          {/* Dot */}
          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900" />

          {/* Content */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {item.action}
                </p>
                {item.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {item.timestamp}
                </p>
                {item.user && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    de {item.user}
                  </p>
                )}
              </div>
            </div>

            {/* Changes */}
            {item.changes && item.changes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Modificări:
                </p>
                <div className="space-y-1">
                  {item.changes.map((change, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {change.field}:
                      </span>
                      {change.from && (
                        <>
                          <span className="text-red-500 line-through">{change.from}</span>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <span className="text-green-500">{change.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Milestone Timeline
interface MilestoneItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  completed?: boolean;
  highlight?: boolean;
}

interface MilestoneTimelineProps {
  items: MilestoneItem[];
  className?: string;
}

export function MilestoneTimeline({ items, className = '' }: MilestoneTimelineProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Central line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />

      {items.map((item, index) => {
        const isLeft = index % 2 === 0;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              relative flex items-center gap-4 mb-8
              ${isLeft ? 'flex-row' : 'flex-row-reverse'}
            `}
          >
            {/* Content */}
            <div className={`flex-1 ${isLeft ? 'text-right pr-8' : 'pl-8'}`}>
              <div
                className={`
                  inline-block p-4 rounded-xl
                  ${item.highlight
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }
                `}
              >
                <h4
                  className={`
                    font-semibold
                    ${item.highlight ? 'text-primary' : 'text-gray-900 dark:text-white'}
                  `}
                >
                  {item.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.date}
                </p>
                {item.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    {item.description}
                  </p>
                )}
              </div>
            </div>

            {/* Center dot */}
            <div
              className={`
                absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-4 border-white dark:border-gray-900
                ${item.completed
                  ? 'bg-green-500'
                  : item.highlight
                    ? 'bg-primary'
                    : 'bg-gray-300 dark:bg-gray-600'
                }
              `}
            />

            {/* Empty space for alignment */}
            <div className="flex-1" />
          </motion.div>
        );
      })}
    </div>
  );
}

// Chat Timeline (for messages)
interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: {
    name: string;
    avatar?: string;
    isMe?: boolean;
  };
}

interface ChatTimelineProps {
  messages: ChatMessage[];
  className?: string;
}

export function ChatTimeline({ messages, className = '' }: ChatTimelineProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`
            flex gap-3
            ${message.sender.isMe ? 'flex-row-reverse' : ''}
          `}
        >
          {/* Avatar */}
          {message.sender.avatar ? (
            <img
              src={message.sender.avatar}
              alt={message.sender.name}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div
              className={`
                w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium
                ${message.sender.isMe
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }
              `}
            >
              {message.sender.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Message bubble */}
          <div className={`max-w-[70%] ${message.sender.isMe ? 'items-end' : ''}`}>
            <div
              className={`
                px-4 py-2 rounded-2xl
                ${message.sender.isMe
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm'
                }
              `}
            >
              <p className="text-sm">{message.content}</p>
            </div>
            <p
              className={`
                text-xs text-gray-400 mt-1
                ${message.sender.isMe ? 'text-right' : ''}
              `}
            >
              {message.timestamp}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
