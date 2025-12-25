'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

export type OrgRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';

export interface Organization {
  id: string;
  name: string;
  cui: string;
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  role: OrgRole;
  membershipId?: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (data: CreateOrgData) => Promise<Organization | null>;
  hasRole: (roles: OrgRole | OrgRole[]) => boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
}

interface CreateOrgData {
  name: string;
  cui: string;
  address?: string;
  email?: string;
  phone?: string;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const ORG_STORAGE_KEY = 'current_organization_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated, user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] =
    useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's organizations
  const refreshOrganizations = useCallback(async () => {
    if (!token) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/organizations/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      const orgs: Organization[] = data.organizations || [];
      setOrganizations(orgs);

      // Restore last selected organization
      const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY);
      const savedOrg = orgs.find((o) => o.id === savedOrgId);

      if (savedOrg) {
        setCurrentOrganization(savedOrg);
      } else if (orgs.length > 0) {
        // Select first organization by default
        setCurrentOrganization(orgs[0]);
        localStorage.setItem(ORG_STORAGE_KEY, orgs[0].id);
      } else {
        setCurrentOrganization(null);
        localStorage.removeItem(ORG_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load organizations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrganization(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshOrganizations]);

  // Switch organization
  const switchOrganization = useCallback(
    async (organizationId: string) => {
      const org = organizations.find((o) => o.id === organizationId);
      if (!org) {
        throw new Error('Organization not found');
      }

      try {
        // Notify backend of switch
        await fetch(`${API_URL}/organizations/switch/${organizationId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        setCurrentOrganization(org);
        localStorage.setItem(ORG_STORAGE_KEY, organizationId);
      } catch (err) {
        console.error('Failed to switch organization:', err);
        throw err;
      }
    },
    [organizations, token]
  );

  // Create new organization
  const createOrganization = useCallback(
    async (data: CreateOrgData): Promise<Organization | null> => {
      if (!token) return null;

      try {
        const response = await fetch(`${API_URL}/organizations`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create organization');
        }

        const result = await response.json();
        const newOrg: Organization = {
          ...result.organization,
          role: 'OWNER',
        };

        // Refresh organizations list and switch to new org
        await refreshOrganizations();
        await switchOrganization(newOrg.id);

        return newOrg;
      } catch (err) {
        console.error('Failed to create organization:', err);
        throw err;
      }
    },
    [token, refreshOrganizations, switchOrganization]
  );

  // Role checking helpers
  const hasRole = useCallback(
    (roles: OrgRole | OrgRole[]): boolean => {
      if (!currentOrganization) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(currentOrganization.role);
    },
    [currentOrganization]
  );

  const canManageMembers = hasRole(['OWNER', 'ADMIN']);
  const canManageSettings = hasRole(['OWNER', 'ADMIN']);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        isLoading,
        error,
        switchOrganization,
        refreshOrganizations,
        createOrganization,
        hasRole,
        canManageMembers,
        canManageSettings,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      'useOrganization must be used within an OrganizationProvider'
    );
  }
  return context;
}

// Helper hook to get current organization ID for API calls
export function useCurrentOrgId(): string | null {
  const { currentOrganization } = useOrganization();
  return currentOrganization?.id ?? null;
}
