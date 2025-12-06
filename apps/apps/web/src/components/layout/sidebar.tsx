"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Receipt,
  GraduationCap,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  Bell,
  Search,
  Sparkles,
  CreditCard,
  Wallet,
  X,
  Truck,
  FileSpreadsheet,
  Trophy,
  Bot,
  User,
  Calculator,
  Calendar,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: { href: string; label: string }[];
}

const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Panou Principal", icon: LayoutDashboard },
  { href: "/efactura", label: "E-Factura", icon: Receipt, badge: 3 },
  { href: "/invoices", label: "Facturi", icon: FileText },
  { href: "/expenses", label: "Cheltuieli", icon: Wallet },
  { href: "/clients", label: "Clienți", icon: Users },
  { href: "/reports", label: "Rapoarte", icon: BarChart3 },
  { href: "/saft", label: "SAF-T D406", icon: FileSpreadsheet },
  { href: "/etransport", label: "e-Transport", icon: Truck },
  { href: "/calculator", label: "Calculator TVA", icon: Calculator },
];

const secondaryNavItems: NavItem[] = [
  { href: "/calendar", label: "Calendar Fiscal", icon: Calendar },
  { href: "/courses", label: "Cursuri", icon: GraduationCap },
  { href: "/forum", label: "Comunitate", icon: MessageSquare },
  { href: "/leaderboard", label: "Clasament", icon: Trophy },
  { href: "/assistant", label: "Asistent AI", icon: Bot },
];

const bottomNavItems: NavItem[] = [
  { href: "/profile", label: "Profilul Meu", icon: User },
  { href: "/settings", label: "Setări", icon: Settings },
  { href: "/help", label: "Ajutor", icon: HelpCircle },
];

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export function Sidebar({ className = "", onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
          ${active
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }
          ${isCollapsed ? "justify-center" : ""}
        `}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : ""}`} />
        {!isCollapsed && (
          <>
            <span className="flex-1 font-medium">{item.label}</span>
            {item.badge && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"
              }`}>
                {item.badge}
              </span>
            )}
          </>
        )}
        {isCollapsed && item.badge && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  // When onClose is provided, we're in mobile drawer mode - use relative positioning
  // When no onClose, we're in desktop mode - use fixed positioning
  const isMobileDrawer = !!onClose;

  return (
    <aside
      className={`
        ${isMobileDrawer ? "relative" : "fixed left-0 top-0"} h-screen bg-white border-r border-slate-200
        flex flex-col z-40 transition-all duration-300
        ${isCollapsed && !isMobileDrawer ? "w-20" : "w-64"}
        ${className}
      `}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-slate-900">DocumentIulia</h1>
                <p className="text-xs text-slate-500">Contabilitate AI</p>
              </div>
            )}
          </Link>
          {/* Mobile close button */}
          {onClose && !isCollapsed && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Company Selector */}
      <div className="p-3 border-b border-slate-100">
        <button
          onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
          className={`
            w-full flex items-center gap-3 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition
            ${isCollapsed ? "justify-center" : ""}
          `}
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900 truncate">SC Demo SRL</p>
                <p className="text-xs text-slate-500">RO12345678</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition ${showCompanyDropdown ? "rotate-90" : ""}`} />
            </>
          )}
        </button>

        {showCompanyDropdown && !isCollapsed && (
          <div className="mt-2 p-2 bg-slate-50 rounded-xl space-y-1">
            <button className="w-full flex items-center gap-2 p-2 text-left text-sm rounded-lg hover:bg-white transition">
              <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center">
                <Building2 className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-slate-700">SC Alt Client SRL</span>
            </button>
            <button className="w-full flex items-center gap-2 p-2 text-left text-sm text-blue-600 rounded-lg hover:bg-blue-50 transition">
              <span className="w-6 h-6 flex items-center justify-center">+</span>
              <span>Adaugă companie</span>
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Caută..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-slate-400 bg-white rounded border border-slate-200">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Secondary Section */}
        <div className="pt-4 mt-4 border-t border-slate-100">
          {!isCollapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resurse
            </p>
          )}
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-slate-100">
        <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer ${isCollapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
            IP
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Ion Popescu</p>
              <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Button - only show on desktop */}
      {!isMobileDrawer && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          )}
        </button>
      )}
    </aside>
  );
}
