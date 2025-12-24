'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Upload,
  Calculator,
  Users,
  Receipt,
  Send,
  Download,
  Settings,
  ChevronRight,
  Zap,
  Clock,
  FileSpreadsheet,
  Building,
  Truck,
  Shield,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  category: 'finance' | 'hr' | 'compliance' | 'documents' | 'operations';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-invoice',
    label: 'Factura Noua',
    description: 'Creeaza o factura noua',
    icon: <FileText className="w-5 h-5" />,
    href: '/dashboard/invoices/new',
    color: 'bg-blue-500',
    category: 'finance',
  },
  {
    id: 'upload-doc',
    label: 'Incarca Document',
    description: 'OCR automat cu AI',
    icon: <Upload className="w-5 h-5" />,
    href: '/dashboard/ocr',
    color: 'bg-green-500',
    category: 'documents',
  },
  {
    id: 'calculate-vat',
    label: 'Calculeaza TVA',
    description: 'Calculator TVA 21%/11%',
    icon: <Calculator className="w-5 h-5" />,
    href: '/dashboard/vat',
    color: 'bg-purple-500',
    category: 'finance',
  },
  {
    id: 'submit-efactura',
    label: 'Trimite e-Factura',
    description: 'SPV ANAF direct',
    icon: <Send className="w-5 h-5" />,
    href: '/dashboard/efactura',
    color: 'bg-orange-500',
    category: 'compliance',
  },
  {
    id: 'generate-saft',
    label: 'Genereaza SAF-T',
    description: 'D406 XML export',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    href: '/dashboard/saft',
    color: 'bg-red-500',
    category: 'compliance',
  },
  {
    id: 'add-employee',
    label: 'Adauga Angajat',
    description: 'Contract nou',
    icon: <Users className="w-5 h-5" />,
    href: '/dashboard/hr',
    color: 'bg-teal-500',
    category: 'hr',
  },
  {
    id: 'reconciliation',
    label: 'Reconciliere',
    description: 'Potriveste plati',
    icon: <Receipt className="w-5 h-5" />,
    href: '/dashboard/finance',
    color: 'bg-indigo-500',
    category: 'finance',
  },
  {
    id: 'reports',
    label: 'Rapoarte',
    description: 'Genereaza rapoarte',
    icon: <Download className="w-5 h-5" />,
    href: '/dashboard/reports',
    color: 'bg-gray-600',
    category: 'documents',
  },
  {
    id: 'fleet',
    label: 'Flota Auto',
    description: 'Gestionare vehicule',
    icon: <Truck className="w-5 h-5" />,
    href: '/dashboard/fleet',
    color: 'bg-amber-500',
    category: 'operations',
  },
  {
    id: 'hse',
    label: 'SSM',
    description: 'Sanatate si securitate',
    icon: <Shield className="w-5 h-5" />,
    href: '/dashboard/hse',
    color: 'bg-emerald-500',
    category: 'operations',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Toate' },
  { id: 'finance', label: 'Finante' },
  { id: 'compliance', label: 'Conformitate' },
  { id: 'hr', label: 'HR' },
  { id: 'documents', label: 'Documente' },
  { id: 'operations', label: 'Operatiuni' },
];

export function QuickActionsPanel() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expanded, setExpanded] = useState(false);

  const filteredActions = selectedCategory === 'all'
    ? QUICK_ACTIONS
    : QUICK_ACTIONS.filter(a => a.category === selectedCategory);

  const displayActions = expanded ? filteredActions : filteredActions.slice(0, 6);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          Actiuni Rapide
        </h2>
        <Link
          href="/dashboard/settings"
          className="p-1.5 text-gray-400 hover:text-gray-600 transition"
          title="Personalizeaza"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition ${
              selectedCategory === cat.id
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {displayActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="group p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${action.color} text-white shrink-0`}>
                {action.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-gray-900 group-hover:text-primary-600 truncate">
                  {action.label}
                </h4>
                <p className="text-xs text-gray-500 truncate">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredActions.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1"
        >
          {expanded ? 'Arata mai putin' : `Mai multe actiuni (${filteredActions.length - 6})`}
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      )}

      {/* Recent Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Recente
        </h4>
        <div className="flex flex-wrap gap-2">
          {['Factura Noua', 'e-Factura', 'Calculeaza TVA'].map((item) => (
            <span
              key={item}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 cursor-pointer transition"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
