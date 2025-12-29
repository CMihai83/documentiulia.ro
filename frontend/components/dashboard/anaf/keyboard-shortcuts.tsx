/**
 * Keyboard Shortcuts Component
 * Provides keyboard navigation hints and accessibility shortcuts
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Keyboard, X } from 'lucide-react';

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts with Shift + ?
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setIsOpen(true);
      }
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const shortcuts = [
    { key: 'Tab', description: 'Navigare între elemente' },
    { key: 'Enter / Space', description: 'Activare butoane și link-uri' },
    { key: 'Esc', description: 'Închidere ferestre modale' },
    { key: 'Shift + ?', description: 'Afișare comenzi rapide' },
    { key: '←/→', description: 'Navigare între tab-uri' },
    { key: 'Home', description: 'Salt la început de pagină' },
    { key: 'End', description: 'Salt la final de pagină' },
  ];

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
        aria-label="Afișare comenzi rapide tastatură"
        title="Afișare comenzi rapide (Shift + ?)"
      >
        <Keyboard className="h-5 w-5" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <Card
        className="max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="keyboard-shortcuts-title" className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            Comenzi rapide tastatură
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label="Închide fereastra de comenzi rapide"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
              >
                <span className="text-sm text-gray-700">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
            Apăsați <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Esc</kbd> pentru a închide această fereastră.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
