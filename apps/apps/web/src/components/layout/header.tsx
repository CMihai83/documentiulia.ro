"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  Menu,
  X,
  Settings,
  LogOut,
  User,
  HelpCircle,
  ChevronDown,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  MessageSquare,
  Plus,
} from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "error";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "E-Factura acceptată",
    message: "Factura DF-2024-001234 a fost acceptată de ANAF",
    time: "Acum 5 min",
    read: false,
  },
  {
    id: "2",
    type: "warning",
    title: "Termen fiscal apropiat",
    message: "Declarația D300 trebuie depusă în 3 zile",
    time: "Acum 1 oră",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "Document nou primit",
    message: "Factură nouă de la SC Furnizor SRL",
    time: "Acum 2 ore",
    read: true,
  },
  {
    id: "4",
    type: "error",
    title: "E-Factura respinsă",
    message: "Factura DF-2024-001230 a fost respinsă - CUI invalid",
    time: "Ieri",
    read: true,
  },
];

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  className?: string;
}

export function Header({ onMenuClick, showMenuButton = false, className = "" }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <header className={`bg-white border-b border-slate-200 sticky top-0 z-30 ${className}`}>
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Breadcrumb or Page Title could go here */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-slate-500">Bun venit,</span>
            <span className="font-medium text-slate-900">Ion Popescu</span>
          </div>
        </div>

        {/* Center - Search (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Caută facturi, clienți, documente..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-slate-400 bg-white rounded border border-slate-200">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Quick Add Button */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">Factură nouă</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Notificări</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Marchează toate ca citite
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition ${
                        !notification.read ? "bg-blue-50/50" : ""
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? "font-semibold" : "font-medium"} text-slate-900`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-500 truncate">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
                <Link
                  href="/notifications"
                  className="block text-center py-3 text-sm text-blue-600 hover:bg-slate-50 border-t border-slate-100"
                >
                  Vezi toate notificările
                </Link>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                IP
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-medium text-slate-900">Ion Popescu</p>
                  <p className="text-sm text-slate-500">ion.popescu@example.com</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <User className="w-4 h-4" />
                    Profilul meu
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <Settings className="w-4 h-4" />
                    Setări
                  </Link>
                  <Link
                    href="/billing"
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <CreditCard className="w-4 h-4" />
                    Facturare
                  </Link>
                  <Link
                    href="/help"
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Ajutor & Suport
                  </Link>
                </div>
                <div className="p-2 border-t border-slate-100">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                    <LogOut className="w-4 h-4" />
                    Deconectare
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && (
        <div className="p-4 border-t border-slate-100 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Caută..."
              autoFocus
              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setShowSearch(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
