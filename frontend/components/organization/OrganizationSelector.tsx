'use client';

import { useState } from 'react';
import { useOrganization, Organization } from '@/contexts/OrganizationContext';
import { Building2, ChevronDown, Plus, Check, Users, Settings } from 'lucide-react';

interface OrganizationSelectorProps {
  collapsed?: boolean;
  onCreateClick?: () => void;
}

export function OrganizationSelector({
  collapsed = false,
  onCreateClick,
}: OrganizationSelectorProps) {
  const {
    organizations,
    currentOrganization,
    isLoading,
    switchOrganization,
  } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async (org: Organization) => {
    if (org.id === currentOrganization?.id) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    try {
      await switchOrganization(org.id);
      setIsOpen(false);
      // Reload page to refresh all data with new org context
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'ACCOUNTANT':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'MEMBER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      OWNER: 'Proprietar',
      ADMIN: 'Admin',
      ACCOUNTANT: 'Contabil',
      MEMBER: 'Membru',
      VIEWER: 'Vizualizare',
    };
    return labels[role] || role;
  };

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          {!collapsed && (
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <button
        onClick={onCreateClick}
        className="w-full px-3 py-2 flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Plus className="w-4 h-4" />
        </div>
        {!collapsed && <span>Adauga organizatie</span>}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {currentOrganization?.name || 'Selecteaza'}
              </p>
              {currentOrganization && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  CUI: {currentOrganization.cui}
                </p>
              )}
            </div>
          )}
        </div>
        {!collapsed && (
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className={`absolute z-20 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 ${
              collapsed ? 'left-full ml-2 top-0 w-64' : 'left-0 right-0 w-full'
            }`}
          >
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Organizatii
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg shrink-0">
                      <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {org.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {org.cui}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(
                            org.role
                          )}`}
                        >
                          {getRoleLabel(org.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {org.id === currentOrganization?.id && (
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateClick?.();
                }}
                className="w-full px-3 py-2 flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adauga organizatie</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Compact badge showing current org for mobile/header
export function OrganizationBadge() {
  const { currentOrganization, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <div className="animate-pulse h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
    );
  }

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium">
      <Building2 className="w-3 h-3" />
      <span className="truncate max-w-[100px]">{currentOrganization.name}</span>
    </div>
  );
}
