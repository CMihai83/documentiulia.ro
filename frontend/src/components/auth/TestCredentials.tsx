import React, { useState } from 'react';
import { FlaskConical, Copy, Check, User, Shield, Briefcase, GraduationCap, Building2 } from 'lucide-react';

interface TestAccount {
  role: string;
  icon: React.ReactNode;
  email: string;
  password: string;
  description: string;
  features: string[];
}

const testAccounts: TestAccount[] = [
  {
    role: 'Admin',
    icon: <Shield className="w-4 h-4" />,
    email: 'test_admin@documentiulia.ro',
    password: 'Admin2025!Demo',
    description: 'Acces complet la toate funcționalitățile',
    features: ['Dashboard complet', 'Gestionare utilizatori', 'Configurare SAGA', 'Rapoarte ANAF']
  },
  {
    role: 'Contabil',
    icon: <Briefcase className="w-4 h-4" />,
    email: 'test_accountant@documentiulia.ro',
    password: 'Contabil2025!Demo',
    description: 'Acces contabilitate și facturare',
    features: ['e-Factura SPV', 'SAF-T D406', 'TVA 21%/11%', 'Declarații fiscale']
  },
  {
    role: 'HR Manager',
    icon: <User className="w-4 h-4" />,
    email: 'test_hr@documentiulia.ro',
    password: 'HR2025!Demo',
    description: 'Modul HR complet',
    features: ['ATS Recrutare', 'Payroll/Salarizare', 'LMS Training', 'Wellness angajați']
  },
  {
    role: 'Student/Demo',
    icon: <GraduationCap className="w-4 h-4" />,
    email: 'test_student@documentiulia.ro',
    password: 'Student2025!Demo',
    description: 'Acces la cursuri și tutoriale',
    features: ['Cursuri SAF-T', 'Forum discuții', 'Blog articole', 'Fonduri PNRR']
  },
  {
    role: 'Întreprindere',
    icon: <Building2 className="w-4 h-4" />,
    email: 'test_enterprise@documentiulia.ro',
    password: 'Enterprise2025!Demo',
    description: 'Funcții enterprise complete',
    features: ['Multi-companii', 'API SAGA v3.2', 'Integrare ANAF', 'Rapoarte avansate']
  }
];

interface TestCredentialsProps {
  onSelectAccount?: (email: string, password: string) => void;
  compact?: boolean;
  locale?: 'ro' | 'en';
}

const translations = {
  ro: {
    title: 'Conturi de Test',
    subtitle: 'Selectează un cont pentru a testa funcționalitățile',
    copyEmail: 'Copiază email',
    copyPassword: 'Copiază parolă',
    copied: 'Copiat!',
    useAccount: 'Folosește acest cont',
    features: 'Funcționalități:',
    note: 'Aceste conturi sunt doar pentru demonstrație. Datele se resetează zilnic.'
  },
  en: {
    title: 'Test Accounts',
    subtitle: 'Select an account to test the features',
    copyEmail: 'Copy email',
    copyPassword: 'Copy password',
    copied: 'Copied!',
    useAccount: 'Use this account',
    features: 'Features:',
    note: 'These accounts are for demonstration only. Data resets daily.'
  }
};

const TestCredentials: React.FC<TestCredentialsProps> = ({
  onSelectAccount,
  compact = false,
  locale = 'ro'
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('Admin');
  const t = translations[locale];

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const selectedAccount = testAccounts.find(acc => acc.role === selectedRole) || testAccounts[0];

  if (compact) {
    return (
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-blue-900">{t.title}</span>
        </div>

        {/* Role Tabs */}
        <div className="flex flex-wrap gap-1 mb-3">
          {testAccounts.map((account) => (
            <button
              key={account.role}
              onClick={() => setSelectedRole(account.role)}
              className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 transition-all ${
                selectedRole === account.role
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              {account.icon}
              {account.role}
            </button>
          ))}
        </div>

        {/* Selected Account Details */}
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-600 mb-2">{selectedAccount.description}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Email:</span>
              <div className="flex items-center gap-1">
                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{selectedAccount.email}</code>
                <button
                  onClick={() => copyToClipboard(selectedAccount.email, `email-${selectedAccount.role}`)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title={t.copyEmail}
                >
                  {copiedField === `email-${selectedAccount.role}` ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Parolă:</span>
              <div className="flex items-center gap-1">
                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{selectedAccount.password}</code>
                <button
                  onClick={() => copyToClipboard(selectedAccount.password, `pwd-${selectedAccount.role}`)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title={t.copyPassword}
                >
                  {copiedField === `pwd-${selectedAccount.role}` ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {onSelectAccount && (
            <button
              onClick={() => onSelectAccount(selectedAccount.email, selectedAccount.password)}
              className="mt-3 w-full py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t.useAccount}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center italic">{t.note}</p>
      </div>
    );
  }

  // Full version
  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-600 rounded-lg">
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-lg">{t.title}</h3>
          <p className="text-sm text-blue-700">{t.subtitle}</p>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {testAccounts.map((account) => (
          <div
            key={account.role}
            className={`p-4 bg-white rounded-xl border-2 transition-all cursor-pointer ${
              selectedRole === account.role
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setSelectedRole(account.role)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${
                selectedRole === account.role ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                {account.icon}
              </div>
              <span className="font-semibold text-gray-900">{account.role}</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">{account.description}</p>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-12">Email:</span>
                <code className="flex-1 bg-gray-100 px-1.5 py-0.5 rounded truncate">{account.email}</code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(account.email, `email-${account.role}`);
                  }}
                  className="p-0.5 hover:bg-gray-100 rounded"
                >
                  {copiedField === `email-${account.role}` ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 w-12">Parolă:</span>
                <code className="flex-1 bg-gray-100 px-1.5 py-0.5 rounded">{account.password}</code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(account.password, `pwd-${account.role}`);
                  }}
                  className="p-0.5 hover:bg-gray-100 rounded"
                >
                  {copiedField === `pwd-${account.role}` ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{t.features}</p>
              <div className="flex flex-wrap gap-1">
                {account.features.slice(0, 3).map((feature, idx) => (
                  <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    {feature}
                  </span>
                ))}
                {account.features.length > 3 && (
                  <span className="text-xs text-gray-400">+{account.features.length - 3}</span>
                )}
              </div>
            </div>

            {onSelectAccount && selectedRole === account.role && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAccount(account.email, account.password);
                }}
                className="mt-3 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t.useAccount}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center italic">{t.note}</p>
    </div>
  );
};

export default TestCredentials;
