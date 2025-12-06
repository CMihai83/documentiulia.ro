'use client';

import { forwardRef, TextareaHTMLAttributes, useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

// Basic Textarea
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  showCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error,
      success,
      resize = 'vertical',
      showCount = false,
      maxLength,
      autoResize = false,
      minRows = 3,
      maxRows = 10,
      disabled,
      className = '',
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = useState(0);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    useEffect(() => {
      if (typeof value === 'string') {
        setCharCount(value.length);
      }
    }, [value]);

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 24;
        const minHeight = lineHeight * minRows;
        const maxHeight = lineHeight * maxRows;
        const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value, autoResize, minRows, maxRows, textareaRef]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const baseStyles = `
      w-full px-4 py-3 text-sm
      bg-white dark:bg-gray-900
      border rounded-lg
      transition-all duration-200
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800
    `;

    const stateStyles = error
      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20'
      : success
        ? 'border-green-300 dark:border-green-600 focus:border-green-500 focus:ring-green-500/20'
        : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20';

    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          maxLength={maxLength}
          rows={autoResize ? minRows : props.rows || 4}
          className={`
            ${baseStyles}
            ${stateStyles}
            ${autoResize ? 'resize-none overflow-hidden' : resizeClasses[resize]}
            ${className}
          `}
          {...props}
        />
        {error && (
          <AlertCircle className="absolute top-3 right-3 w-5 h-5 text-red-500" />
        )}
        {success && !error && (
          <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-green-500" />
        )}
        {showCount && maxLength && (
          <div className="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-gray-500">
            <span className={charCount > maxLength ? 'text-red-500' : ''}>
              {charCount}
            </span>
            /{maxLength}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Rich Textarea with formatting toolbar
interface RichTextareaProps extends Omit<TextareaProps, 'onChange'> {
  onChange?: (value: string) => void;
  toolbarPosition?: 'top' | 'bottom';
}

export function RichTextarea({
  value = '',
  onChange,
  toolbarPosition = 'top',
  ...props
}: RichTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    onChange?.(newText);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const toolbar = (
    <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => insertText('**', '**')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Bold"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => insertText('*', '*')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Italic"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => insertText('~~', '~~')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Strikethrough"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
        </svg>
      </button>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
      <button
        type="button"
        onClick={() => insertText('`', '`')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Code"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => insertText('[', '](url)')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
      <button
        type="button"
        onClick={() => insertText('- ')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Lista"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => insertText('> ')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Quote"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {toolbarPosition === 'top' && toolbar}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="border-0 rounded-none focus:ring-0"
        {...props}
      />
      {toolbarPosition === 'bottom' && toolbar}
    </div>
  );
}

// Mention Textarea (for @mentions)
interface MentionTextareaProps extends Omit<TextareaProps, 'onChange'> {
  onChange?: (value: string) => void;
  onMention?: (search: string) => Promise<Array<{ id: string; name: string; avatar?: string }>>;
}

export function MentionTextarea({
  value = '',
  onChange,
  onMention,
  ...props
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);

    // Check for @ mention
    const textarea = textareaRef.current;
    if (textarea && onMention) {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionSearch(mentionMatch[1]);
        const results = await onMention(mentionMatch[1]);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const insertMention = (user: { id: string; name: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = (value as string).substring(0, cursorPos);
    const textAfterCursor = (value as string).substring(cursorPos);
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.substring(0, mentionStart) + `@${user.name} ` + textAfterCursor;

    onChange?.(newText);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        {...props}
      />
      {showSuggestions && (
        <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
          {suggestions.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {user.name[0]}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Comment Textarea (with submit button)
interface CommentTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  submitLabel?: string;
  loading?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
}

export function CommentTextarea({
  value = '',
  onChange,
  onSubmit,
  placeholder = 'Scrie un comentariu...',
  submitLabel = 'Trimite',
  loading = false,
  minLength = 1,
  maxLength,
  className = '',
}: CommentTextareaProps) {
  const isValid = value.length >= minLength && (!maxLength || value.length <= maxLength);

  return (
    <div className={`space-y-3 ${className}`}>
      <Textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        showCount={!!maxLength}
        autoResize
        minRows={2}
        maxRows={6}
      />
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Se trimite...
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </div>
  );
}

// Code Textarea (monospace, with line numbers)
interface CodeTextareaProps extends Omit<TextareaProps, 'onChange'> {
  language?: string;
  onChange?: (value: string) => void;
  showLineNumbers?: boolean;
}

export function CodeTextarea({
  value = '',
  onChange,
  language,
  showLineNumbers = true,
  ...props
}: CodeTextareaProps) {
  const lines = (value as string).split('\n');
  const lineCount = lines.length;

  return (
    <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {language && (
        <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{language}</span>
        </div>
      )}
      <div className="flex">
        {showLineNumbers && (
          <div className="flex-shrink-0 py-3 px-3 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className="text-xs font-mono text-gray-400 dark:text-gray-500 text-right leading-6"
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          spellCheck={false}
          className="flex-1 p-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none resize-none leading-6"
          style={{ minHeight: `${Math.max(lineCount * 24 + 24, 120)}px` }}
          {...props}
        />
      </div>
    </div>
  );
}
