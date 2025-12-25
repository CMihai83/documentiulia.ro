'use client';

/**
 * Example component demonstrating custom keyboard shortcut usage
 * This file is for reference and documentation purposes
 */

import { useKeyboardShortcut } from '../useKeyboardShortcut';
import { useState } from 'react';

export function CustomShortcutExample() {
  const [count, setCount] = useState(0);
  const [saved, setSaved] = useState(false);

  // Example 1: Simple shortcut - Ctrl+S to save
  const handleSave = () => {
    setSaved(true);
    console.log('Document saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  useKeyboardShortcut(handleSave, {
    key: 's',
    ctrl: true,
    description: 'Save document',
    category: 'actions',
  });

  // Example 2: Increment counter - Ctrl+Shift+I
  const handleIncrement = () => {
    setCount((prev) => prev + 1);
  };

  useKeyboardShortcut(handleIncrement, {
    key: 'i',
    ctrl: true,
    shift: true,
    description: 'Increment counter',
    category: 'actions',
  });

  // Example 3: Decrement counter - Ctrl+Shift+D
  const handleDecrement = () => {
    setCount((prev) => Math.max(0, prev - 1));
  };

  useKeyboardShortcut(handleDecrement, {
    key: 'd',
    ctrl: true,
    shift: true,
    description: 'Decrement counter',
    category: 'actions',
  });

  // Example 4: Reset - Ctrl+R (with enabled flag)
  const handleReset = () => {
    setCount(0);
  };

  useKeyboardShortcut(handleReset, {
    key: 'r',
    ctrl: true,
    description: 'Reset counter',
    category: 'actions',
    enabled: count > 0, // Only enabled when count > 0
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Custom Keyboard Shortcuts Example</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* Status */}
        {saved && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-300">
            ✓ Document saved!
          </div>
        )}

        {/* Counter */}
        <div className="text-center">
          <div className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            {count}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleDecrement}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Decrement
            </button>
            <button
              onClick={handleIncrement}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Increment
            </button>
            <button
              onClick={handleReset}
              disabled={count === 0}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Shortcuts Guide */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Available Shortcuts:
          </h3>
          <div className="space-y-2 text-sm">
            <ShortcutItem
              keys={['Ctrl', 'S']}
              description="Save document"
            />
            <ShortcutItem
              keys={['Ctrl', 'Shift', 'I']}
              description="Increment counter"
            />
            <ShortcutItem
              keys={['Ctrl', 'Shift', 'D']}
              description="Decrement counter"
            />
            <ShortcutItem
              keys={['Ctrl', 'R']}
              description="Reset counter"
              disabled={count === 0}
            />
          </div>
        </div>

        {/* Code Example */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Code Example:
          </h3>
          <pre className="bg-gray-100 dark:bg-gray-900 rounded p-4 overflow-x-auto text-xs">
            <code>{`import { useKeyboardShortcut } from '@/components/shortcuts';

function MyComponent() {
  const handleSave = () => {
    console.log('Saved!');
  };

  useKeyboardShortcut(handleSave, {
    key: 's',
    ctrl: true,
    description: 'Save document',
    category: 'actions',
  });

  return <div>My Component</div>;
}`}</code>
          </pre>
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Press Shift+? to see all shortcuts, or Ctrl+K to open the command palette
      </p>
    </div>
  );
}

function ShortcutItem({
  keys,
  description,
  disabled = false,
}: {
  keys: string[];
  description: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <span className="text-gray-600 dark:text-gray-400">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export default CustomShortcutExample;
