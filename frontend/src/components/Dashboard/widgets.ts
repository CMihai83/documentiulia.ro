import React from 'react';

/**
 * Widget Registry
 * Maps component names to React components for dynamic loading
 */

// Placeholder widget component for widgets not yet implemented
const PlaceholderWidget: React.FC<{ name?: string }> = ({ name = 'Widget' }) => {
  return React.createElement('div', {
    className: 'flex items-center justify-center h-full text-gray-400'
  }, `${name} coming soon...`);
};

// Sample widgets for demonstration
const RevenueWidget: React.FC = () => {
  return React.createElement('div', { className: 'h-full' },
    React.createElement('div', { className: 'text-3xl font-bold text-green-600' }, '€12,450'),
    React.createElement('div', { className: 'text-sm text-gray-500 mt-1' }, 'Total Revenue'),
    React.createElement('div', { className: 'text-xs text-green-500 mt-2' }, '+12.5% vs last month')
  );
};

const ExpensesWidget: React.FC = () => {
  return React.createElement('div', { className: 'h-full' },
    React.createElement('div', { className: 'text-3xl font-bold text-red-600' }, '€4,230'),
    React.createElement('div', { className: 'text-sm text-gray-500 mt-1' }, 'Total Expenses'),
    React.createElement('div', { className: 'text-xs text-red-500 mt-2' }, '+5.2% vs last month')
  );
};

const InvoicesWidget: React.FC = () => {
  return React.createElement('div', { className: 'h-full' },
    React.createElement('div', { className: 'text-3xl font-bold text-blue-600' }, '24'),
    React.createElement('div', { className: 'text-sm text-gray-500 mt-1' }, 'Pending Invoices'),
    React.createElement('div', { className: 'text-xs text-orange-500 mt-2' }, '€8,750 outstanding')
  );
};

const TasksWidget: React.FC = () => {
  return React.createElement('div', { className: 'h-full space-y-2' },
    React.createElement('div', { className: 'flex items-center gap-2' },
      React.createElement('div', { className: 'w-2 h-2 rounded-full bg-red-500' }),
      React.createElement('span', { className: 'text-sm' }, 'Submit VAT declaration')
    ),
    React.createElement('div', { className: 'flex items-center gap-2' },
      React.createElement('div', { className: 'w-2 h-2 rounded-full bg-yellow-500' }),
      React.createElement('span', { className: 'text-sm' }, 'Review Q3 report')
    ),
    React.createElement('div', { className: 'flex items-center gap-2' },
      React.createElement('div', { className: 'w-2 h-2 rounded-full bg-green-500' }),
      React.createElement('span', { className: 'text-sm' }, 'Send client invoices')
    )
  );
};

const CashFlowWidget: React.FC = () => {
  return React.createElement('div', { className: 'h-full' },
    React.createElement('div', { className: 'text-2xl font-bold text-gray-900' }, '€28,420'),
    React.createElement('div', { className: 'text-sm text-gray-500 mt-1' }, 'Current Balance'),
    React.createElement('div', { className: 'mt-4 space-y-1' },
      React.createElement('div', { className: 'flex justify-between text-sm' },
        React.createElement('span', { className: 'text-gray-500' }, 'Income'),
        React.createElement('span', { className: 'text-green-600' }, '+€15,200')
      ),
      React.createElement('div', { className: 'flex justify-between text-sm' },
        React.createElement('span', { className: 'text-gray-500' }, 'Expenses'),
        React.createElement('span', { className: 'text-red-600' }, '-€8,430')
      )
    )
  );
};

const QuickActionsWidget: React.FC = () => {
  return React.createElement('div', { className: 'h-full grid grid-cols-2 gap-2' },
    React.createElement('button', { className: 'p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 text-sm font-medium' }, '+ Invoice'),
    React.createElement('button', { className: 'p-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 text-sm font-medium' }, '+ Expense'),
    React.createElement('button', { className: 'p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 text-sm font-medium' }, '+ Contact'),
    React.createElement('button', { className: 'p-3 bg-orange-50 hover:bg-orange-100 rounded-lg text-orange-700 text-sm font-medium' }, '+ Project')
  );
};

const RecentActivityWidget: React.FC = () => {
  return React.createElement('div', { className: 'h-full space-y-3 overflow-auto' },
    React.createElement('div', { className: 'flex items-start gap-3' },
      React.createElement('div', { className: 'w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs' }, 'IN'),
      React.createElement('div', null,
        React.createElement('div', { className: 'text-sm font-medium' }, 'Invoice #1234 paid'),
        React.createElement('div', { className: 'text-xs text-gray-500' }, '2 hours ago')
      )
    ),
    React.createElement('div', { className: 'flex items-start gap-3' },
      React.createElement('div', { className: 'w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs' }, 'CT'),
      React.createElement('div', null,
        React.createElement('div', { className: 'text-sm font-medium' }, 'New contact added'),
        React.createElement('div', { className: 'text-xs text-gray-500' }, '5 hours ago')
      )
    ),
    React.createElement('div', { className: 'flex items-start gap-3' },
      React.createElement('div', { className: 'w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs' }, 'EX'),
      React.createElement('div', null,
        React.createElement('div', { className: 'text-sm font-medium' }, 'Expense recorded'),
        React.createElement('div', { className: 'text-xs text-gray-500' }, 'Yesterday')
      )
    )
  );
};

/**
 * Widget component registry
 * Maps component_name from database to React components
 */
export const widgetRegistry: Record<string, React.FC<any>> = {
  // Financial widgets
  'RevenueWidget': RevenueWidget,
  'ExpensesWidget': ExpensesWidget,
  'CashFlowWidget': CashFlowWidget,
  'InvoicesWidget': InvoicesWidget,

  // Task & Activity widgets
  'TasksWidget': TasksWidget,
  'RecentActivityWidget': RecentActivityWidget,
  'QuickActionsWidget': QuickActionsWidget,

  // Placeholder for unimplemented widgets
  'placeholder': PlaceholderWidget
};

/**
 * Get widget component by name
 * Returns placeholder if widget not found
 */
export function getWidgetComponent(componentName: string): React.FC<any> | null {
  return widgetRegistry[componentName] || widgetRegistry['placeholder'];
}

export default widgetRegistry;
