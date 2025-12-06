import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  TrendingUp,
  Lightbulb,
  Brain,
  Scale,
  UserCircle,
  Settings,
  LogOut,
  X,
  GitBranch,
  Shield,
  Package,
  Target,
  ShoppingCart,
  Calculator,
  CreditCard,
  BookOpen,
  Clock,
  Briefcase,
  BarChart3,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Calendar,
  UserCheck,
  Warehouse,
  FileSpreadsheet,
  PieChart,
  TrendingDown,
  Repeat,
  Zap,
  Building2,
  FileCheck,
  Upload,
  Landmark,
  ArrowDownUp,
  Tags,
  GraduationCap,
  MessageSquare,
  Coins,
  ReceiptText,
  ScanLine,
  FileInput,
  Layers,
  ListTodo,
  GitBranchPlus,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ProjectSwitcher from '../project/ProjectSwitcher';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { name: 'Panou Control', path: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Contabilitate',
    path: '/accounting',
    icon: Calculator,
    children: [
      { name: 'Facturi', path: '/invoices', icon: FileText },
      { name: 'Facturi Recurente', path: '/recurring-invoices', icon: Repeat },
      { name: 'Chitanțe', path: '/bills', icon: CreditCard },
      { name: 'Cheltuieli', path: '/expenses', icon: Receipt },
      { name: 'Plăți', path: '/payments', icon: DollarSign },
      { name: 'Jurnal Contabil', path: '/accounting/journal-entries', icon: BookOpen },
      { name: 'Registru General', path: '/accounting/general-ledger', icon: FileSpreadsheet },
      { name: 'Plan Conturi', path: '/accounting/chart-of-accounts', icon: GitBranch },
      { name: 'Active Fixe', path: '/accounting/fixed-assets', icon: Building2 },
    ]
  },
  {
    name: 'e-Factura',
    path: '/efactura',
    icon: Zap,
    children: [
      { name: 'Facturi Primite', path: '/efactura/received', icon: FileInput },
      { name: 'Încărcare în Lot', path: '/efactura/batch-upload', icon: Upload },
      { name: 'Analize e-Factura', path: '/efactura/analytics', icon: BarChart3 },
      { name: 'Setări e-Factura', path: '/efactura/settings', icon: Settings },
    ]
  },
  {
    name: 'Rapoarte Financiare',
    path: '/reports',
    icon: TrendingUp,
    children: [
      { name: 'Panou Rapoarte', path: '/reports', icon: LayoutDashboard },
      { name: 'Profit & Pierdere', path: '/reports/profit-loss', icon: PieChart },
      { name: 'Cash Flow', path: '/reports/cash-flow', icon: TrendingDown },
      { name: 'Buget vs Realizat', path: '/reports/budget-vs-actual', icon: FileCheck },
    ]
  },
  {
    name: 'Chitanțe OCR',
    path: '/receipts',
    icon: ScanLine,
    children: [
      { name: 'Încărcare Chitanțe', path: '/receipts/upload', icon: Upload },
      { name: 'Lista Chitanțe', path: '/receipts/list', icon: Receipt },
      { name: 'Șabloane OCR', path: '/receipts/templates', icon: Layers },
    ]
  },
  {
    name: 'Banking',
    path: '/bank',
    icon: Landmark,
    children: [
      { name: 'Conturi Bancare', path: '/bank/connections', icon: Building2 },
      { name: 'Tranzacții', path: '/bank/transactions', icon: ArrowDownUp },
    ]
  },
  {
    name: 'Inventar',
    path: '/inventory',
    icon: Package,
    children: [
      { name: 'Panou Inventar', path: '/inventory', icon: LayoutDashboard },
      { name: 'Produse', path: '/inventory/products', icon: Package },
      { name: 'Depozite', path: '/inventory/warehouses', icon: Warehouse },
      { name: 'Niveluri Stoc', path: '/inventory/stock-levels', icon: BarChart3 },
      { name: 'Mișcări Stoc', path: '/inventory/movements', icon: ArrowDownUp },
      { name: 'Ajustări Stoc', path: '/inventory/adjustments', icon: FileCheck },
      { name: 'Transferuri Stoc', path: '/inventory/transfers', icon: Repeat },
      { name: 'Alerte Stoc Scăzut', path: '/inventory/low-stock', icon: Zap },
      { name: 'Comenzi Achiziție', path: '/purchase-orders', icon: ShoppingCart },
    ]
  },
  {
    name: 'Vânzări & CRM',
    path: '/sales',
    icon: Target,
    children: [
      { name: 'Panou CRM', path: '/crm', icon: LayoutDashboard },
      { name: 'Contacte', path: '/contacts', icon: Users },
      { name: 'Oportunități', path: '/crm/opportunities', icon: Target },
      { name: 'Oferte', path: '/crm/quotations', icon: FileText },
    ]
  },
  {
    name: 'Management Proiecte',
    path: '/management',
    icon: Briefcase,
    children: [
      { name: 'Panou Proiecte', path: '/projects', icon: Briefcase },
      { name: 'Sprint-uri', path: '/sprints', icon: ListTodo },
      { name: 'Planificare Sprint', path: '/sprints/planning', icon: GitBranchPlus },
      { name: 'Vizualizare Gantt', path: '/gantt', icon: Activity },
      { name: 'Pontaj Timp', path: '/time-tracking', icon: Clock },
      { name: 'Intrări Timp', path: '/time/entries', icon: Clock },
    ]
  },
  {
    name: 'Resurse Umane',
    path: '/hr',
    icon: Users,
    children: [
      { name: 'Angajați', path: '/hr/employees', icon: UserCheck },
      { name: 'Stat de Plată', path: '/dashboard/payroll', icon: DollarSign },
      { name: 'Calendar Fiscal', path: '/dashboard/fiscal-calendar', icon: Calendar },
    ]
  },
  {
    name: 'Analize & BI',
    path: '/analysis',
    icon: BarChart3,
    children: [
      { name: 'Panou Analize', path: '/analytics', icon: BarChart3 },
      { name: 'Insight-uri AI', path: '/insights', icon: Lightbulb },
    ]
  },
  {
    name: 'Asistență AI',
    path: '/ai-assistance',
    icon: Brain,
    children: [
      { name: 'Consultant Business', path: '/business-consultant', icon: Brain },
      { name: 'Consultant Fiscal', path: '/fiscal-law', icon: Scale },
      { name: 'Arbori de Decizie', path: '/decision-trees', icon: GitBranch },
    ]
  },
  {
    name: 'Educație',
    path: '/education',
    icon: GraduationCap,
    children: [
      { name: 'Cursuri Disponibile', path: '/courses', icon: BookOpen },
      { name: 'Cursurile Mele', path: '/my-courses', icon: GraduationCap },
      { name: 'Tutoriale & Ghiduri', path: '/tutorials', icon: BookOpen },
    ]
  },
  {
    name: 'Comunitate',
    path: '/community',
    icon: MessageSquare,
    children: [
      { name: 'Forum', path: '/forum', icon: MessageSquare },
    ]
  },
  {
    name: 'Abonament',
    path: '/subscription',
    icon: Coins,
    children: [
      { name: 'Panou Abonament', path: '/subscription', icon: LayoutDashboard },
      { name: 'Planuri & Prețuri', path: '/subscription/plans', icon: Tags },
      { name: 'Istoric Facturare', path: '/subscription/billing', icon: ReceiptText },
    ]
  },
  {
    name: 'Setări',
    path: '/settings',
    icon: Settings,
    children: [
      { name: 'Setări Generale', path: '/settings', icon: Settings },
      { name: 'Categorii Cheltuieli', path: '/settings/categories', icon: GitBranch },
      { name: 'Coduri TVA', path: '/settings/tax-codes', icon: Tags },
      { name: 'Context Personal', path: '/personal-context', icon: UserCircle },
    ]
  },
];

const adminNavItems: NavItem[] = [
  { name: 'Actualizări Arbori', path: '/admin/decision-tree-updates', icon: Shield },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Contabilitate']);

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={handleLinkClick}>
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">DocumentIulia</h1>
              <p className="text-xs text-gray-500">Contabilitate AI</p>
            </div>
          </Link>
        </div>

        {/* Project Switcher */}
        <div className="pt-4">
          <ProjectSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedGroups.includes(item.name);
            const isActive = location.pathname === item.path ||
                             (item.path === '/inventory' && location.pathname.startsWith('/inventory')) ||
                             (item.path === '/crm' && location.pathname.startsWith('/crm')) ||
                             (item.path === '/purchase-orders' && location.pathname.startsWith('/purchase-orders')) ||
                             (item.path === '/projects' && location.pathname.startsWith('/projects')) ||
                             (item.path === '/management' && (location.pathname.startsWith('/projects') || location.pathname.startsWith('/sprints') || location.pathname.startsWith('/gantt'))) ||
                             (item.path === '/time-tracking' && location.pathname.startsWith('/time')) ||
                             (item.path === '/analytics' && location.pathname.startsWith('/analytics')) ||
                             (item.path === '/accounting' && location.pathname.startsWith('/accounting')) ||
                             (item.path === '/hr' && location.pathname.startsWith('/dashboard/payroll')) ||
                             (item.path === '/hr' && location.pathname.startsWith('/dashboard/fiscal-calendar'));

            if (hasChildren) {
              const Chevron = isExpanded ? ChevronDown : ChevronRight;
              return (
                <div key={item.path}>
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary-700' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    <Chevron className="w-4 h-4 text-gray-400" />
                  </button>
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children?.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={handleLinkClick}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                              childActive
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <ChildIcon className={`w-4 h-4 ${childActive ? 'text-primary-700' : 'text-gray-400'}`} />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-700' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Admin Section */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Administrare
                </p>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-orange-700' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="mb-3 px-4 py-2 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>

          <Link
            to="/settings"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors mb-2"
          >
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm">Setări</span>
          </Link>

          <button
            onClick={() => {
              logout();
              handleLinkClick();
            }}
            className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Deconectare</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
