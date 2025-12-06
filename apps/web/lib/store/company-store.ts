/**
 * Company Store
 * Zustand store for managing the currently selected company
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Company {
  id: string;
  name: string;
  cui: string;
  regCom?: string;
  registrationNumber?: string;
  vatPayer: boolean;
}

interface CompanyStore {
  selectedCompanyId: string | null;
  selectedCompany: Company | null;
  companies: Company[];
  setSelectedCompanyId: (id: string | null) => void;
  setSelectedCompany: (company: Company | null) => void;
  setCompanies: (companies: Company[]) => void;
  reset: () => void;
}

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      selectedCompany: null,
      companies: [],
      setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
      setSelectedCompany: (company) =>
        set({
          selectedCompany: company,
          selectedCompanyId: company?.id || null,
        }),
      setCompanies: (companies) => set({ companies }),
      reset: () =>
        set({
          selectedCompanyId: null,
          selectedCompany: null,
          companies: [],
        }),
    }),
    {
      name: 'documentiulia-company',
      partialize: (state) => ({
        selectedCompanyId: state.selectedCompanyId,
      }),
    }
  )
);
