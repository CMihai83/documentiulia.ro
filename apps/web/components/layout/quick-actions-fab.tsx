'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Plus,
  X,
  FileText,
  Receipt,
  Users,
  Upload,
  Calculator,
  Package,
} from 'lucide-react';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  { icon: FileText, label: 'Factură nouă', href: '/invoices?action=new', color: 'bg-blue-500' },
  { icon: Receipt, label: 'Cheltuială', href: '/expenses?action=new', color: 'bg-green-500' },
  { icon: Users, label: 'Client nou', href: '/contacts?action=new', color: 'bg-purple-500' },
  { icon: Upload, label: 'Scanează bon', href: '/receipts?action=scan', color: 'bg-orange-500' },
  { icon: Package, label: 'Produs nou', href: '/products?action=new', color: 'bg-pink-500' },
  { icon: Calculator, label: 'Consultant AI', href: '/ai-consultant', color: 'bg-indigo-500' },
];

export function QuickActionsFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 lg:hidden">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            />

            {/* Actions menu */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-0 w-56"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-2">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Acțiuni rapide
                  </p>
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={action.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${action.color}`}>
                          <action.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {action.label}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isOpen
            ? 'bg-gray-900 dark:bg-white'
            : 'bg-primary hover:bg-primary/90'
        }`}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? 'Închide' : 'Acțiuni rapide'}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white dark:text-gray-900" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
