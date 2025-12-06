'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  User,
  Settings,
  HelpCircle,
  LogOut,
  CreditCard,
  Building2,
  Bell,
  Shield,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  Check,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface UserMenuProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    plan?: 'free' | 'pro' | 'business';
  };
}

const defaultUser = {
  name: 'Maria Popescu',
  email: 'maria@exemplu.ro',
  plan: 'pro' as const,
};

const planLabels = {
  free: { label: 'Gratuit', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  pro: { label: 'Pro', color: 'bg-primary/10 text-primary' },
  business: { label: 'Business', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
};

export function UserMenu({ user = defaultUser }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const menuItems = [
    { icon: User, label: 'Profilul Meu', href: '/settings?tab=profile' },
    { icon: Building2, label: 'Compania Mea', href: '/settings?tab=company' },
    { icon: Bell, label: 'Notificări', href: '/settings?tab=notifications' },
    { icon: CreditCard, label: 'Abonament', href: '/settings?tab=billing' },
    { icon: Shield, label: 'Securitate', href: '/settings?tab=security' },
  ];

  const planInfo = planLabels[user.plan || 'free'];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Meniu utilizator"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
        </div>
        <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
          {user.name.split(' ')[0]}
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
          >
            {/* User info header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${planInfo.color}`}>
                  {planInfo.label}
                </span>
                {user.plan !== 'business' && (
                  <Link
                    href="/settings?tab=billing"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Sparkles className="w-3 h-3" />
                    Upgrade
                  </Link>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="p-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <item.icon className="w-4 h-4 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {item.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>

            {/* Theme toggle */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">Temă</span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-1.5 rounded-md transition-colors ${
                      theme === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
                    }`}
                    title="Mod luminos"
                  >
                    <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-yellow-500' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-1.5 rounded-md transition-colors ${
                      theme === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
                    }`}
                    title="Mod întunecat"
                  >
                    <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`p-1.5 rounded-md transition-colors ${
                      theme === 'system' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
                    }`}
                    title="Sistem"
                  >
                    <Settings className={`w-4 h-4 ${theme === 'system' ? 'text-primary' : 'text-gray-400'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-800">
              <Link
                href="/help"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <HelpCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Ajutor & Suport</span>
              </Link>
            </div>

            {/* Logout */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Handle logout
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group w-full text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">Deconectare</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
