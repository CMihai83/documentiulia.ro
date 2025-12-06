import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, FileText } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axios from 'axios';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_account_id: string | null;
  balance: number;
  is_active: boolean;
  children?: Account[];
}

const ChartOfAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [, setLoading] = useState(true);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.get('/api/v1/accounting/chart-of-accounts.php', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-ID': companyId,
        },
      });

      if (response.data.success) {
        setAccounts(response.data.data.accounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const renderAccount = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);

    return (
      <React.Fragment key={account.id}>
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap" style={{ paddingLeft: `${level * 2 + 1.5}rem` }}>
            <div className="flex items-center space-x-2">
              {hasChildren && (
                <button onClick={() => toggleExpand(account.id)} className="focus:outline-none">
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              )}
              <span className="font-medium text-gray-900">{account.account_code}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <span className="text-gray-900">{account.account_name}</span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {account.account_type}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
            ${Number(account.balance).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {account.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <div className="flex items-center space-x-2">
              <button className="text-indigo-600 hover:text-indigo-800">
                <Edit2 className="w-4 h-4" />
              </button>
              <button className="text-red-600 hover:text-red-800">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && account.children!.map(child => renderAccount(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
            <p className="text-gray-600 mt-1">Manage your account structure</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => (window.location.href = '/accounting/reports')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <FileText className="w-5 h-5" />
              <span>Reports</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus className="w-5 h-5" />
              <span>New Account</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Account Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map(account => renderAccount(account))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChartOfAccountsPage;
