import React from 'react';
import { useI18n } from '../../../i18n/I18nContext';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
  color: string;
}

const QuickActionsWidget: React.FC = () => {
  const { language } = useI18n();
  const isRo = language === 'ro';

  const actions: QuickAction[] = [
    {
      id: 'new_invoice',
      label: isRo ? 'Factură nouă' : 'New Invoice',
      icon: '📄',
      href: '/invoices/new',
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-700'
    },
    {
      id: 'new_expense',
      label: isRo ? 'Cheltuială nouă' : 'New Expense',
      icon: '🧾',
      href: '/expenses/new',
      color: 'bg-red-50 hover:bg-red-100 text-red-700'
    },
    {
      id: 'new_contact',
      label: isRo ? 'Contact nou' : 'New Contact',
      icon: '👤',
      href: '/contacts/new',
      color: 'bg-green-50 hover:bg-green-100 text-green-700'
    },
    {
      id: 'reports',
      label: isRo ? 'Rapoarte' : 'Reports',
      icon: '📊',
      href: '/reports',
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-700'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {actions.map(action => (
        <a
          key={action.id}
          href={action.href}
          className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${action.color}`}
        >
          <span className="text-xl">{action.icon}</span>
          <span className="text-sm font-medium">{action.label}</span>
        </a>
      ))}
    </div>
  );
};

export default QuickActionsWidget;
