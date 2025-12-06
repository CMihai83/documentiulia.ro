'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Loader2,
} from 'lucide-react';
import { useCompanyStore } from '@/lib/store/company-store';
import { useUserCompanies } from '@/lib/api/hooks';

interface Company {
  id: string;
  name: string;
  cui: string;
  regCom?: string;
  registrationNumber?: string;
  vatPayer: boolean;
}

export function CompanySelector() {
  const t = useTranslations('company');
  const {
    selectedCompanyId,
    selectedCompany,
    setSelectedCompany,
    setCompanies,
  } = useCompanyStore();

  // Fetch user's companies
  const { data: companiesData, isLoading, error } = useUserCompanies();

  // Update store when companies are loaded
  useEffect(() => {
    if (companiesData?.data) {
      const companies = companiesData.data as Company[];
      setCompanies(companies);

      // Auto-select first company if none selected
      if (!selectedCompanyId && companies.length > 0) {
        setSelectedCompany(companies[0]);
      }
    }
  }, [companiesData, selectedCompanyId, setCompanies, setSelectedCompany]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Se încarcă...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600">
        <Building2 className="w-4 h-4" />
        <span className="text-sm">Eroare la încărcare</span>
      </div>
    );
  }

  const companies = (companiesData?.data as Company[]) || [];

  // Show create company prompt if no companies
  if (companies.length === 0) {
    return (
      <a
        href="/companies/new"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Adaugă firmă</span>
      </a>
    );
  }

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[200px]"
        aria-label={t('selectCompany')}
      >
        <Building2 className="w-4 h-4 text-gray-500" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium truncate">
            {selectedCompany?.name || 'Selectează firma'}
          </p>
          {selectedCompany?.cui && (
            <p className="text-xs text-gray-500 truncate">
              CUI: {selectedCompany.cui}
            </p>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {/* Dropdown menu */}
      <div className="absolute top-full left-0 mt-1 w-full min-w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Firmele mele
          </p>
          <div className="space-y-1 mt-1">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedCompanyId === company.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{company.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    CUI: {company.cui} {company.regCom && `• ${company.regCom}`}
                  </p>
                </div>
                {selectedCompanyId === company.id && (
                  <Check className="w-4 h-4 flex-shrink-0 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-2">
          <a
            href="/companies/new"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Adaugă firmă nouă</span>
          </a>
        </div>
      </div>
    </div>
  );
}
