'use client';

import * as React from 'react';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Search,
  Settings,
  Users,
  Star,
  StarOff,
  MoreVertical,
  ExternalLink,
  Trash2,
  Edit,
  Copy,
  Archive,
  LogOut,
  Briefcase,
  Building,
  Store,
  Factory,
  Landmark,
  Home,
  Globe,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Shield,
  Crown,
  User,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';

// Types
export type CompanyType = 'srl' | 'sa' | 'pfa' | 'ii' | 'ong' | 'other';
export type CompanyRole = 'owner' | 'admin' | 'accountant' | 'viewer';
export type CompanyPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface Company {
  id: string;
  name: string;
  cui?: string;
  type: CompanyType;
  role: CompanyRole;
  plan: CompanyPlan;
  logo?: string;
  color?: string;
  favorite?: boolean;
  archived?: boolean;
  lastAccessed?: string;
  membersCount?: number;
  address?: string;
  email?: string;
  phone?: string;
}

export interface CompanySwitcherProps {
  companies: Company[];
  currentCompany: Company;
  onCompanyChange: (company: Company) => void;
  onCreateCompany?: () => void;
  onManageCompanies?: () => void;
  onCompanySettings?: (company: Company) => void;
  onToggleFavorite?: (company: Company) => void;
  variant?: 'default' | 'compact' | 'minimal' | 'sidebar';
  showSearch?: boolean;
  showFavorites?: boolean;
  showCreateButton?: boolean;
  className?: string;
}

export interface CompanyCardProps {
  company: Company;
  isSelected?: boolean;
  onClick?: () => void;
  onSettings?: () => void;
  onToggleFavorite?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export interface CompanyListProps {
  companies: Company[];
  currentCompanyId?: string;
  onSelect: (company: Company) => void;
  onSettings?: (company: Company) => void;
  onToggleFavorite?: (company: Company) => void;
  showFavorites?: boolean;
  className?: string;
}

// Helper functions
const getCompanyTypeLabel = (type: CompanyType): string => {
  switch (type) {
    case 'srl':
      return 'S.R.L.';
    case 'sa':
      return 'S.A.';
    case 'pfa':
      return 'P.F.A.';
    case 'ii':
      return 'I.I.';
    case 'ong':
      return 'ONG';
    default:
      return 'Altul';
  }
};

const getCompanyTypeIcon = (type: CompanyType) => {
  switch (type) {
    case 'srl':
      return Building2;
    case 'sa':
      return Landmark;
    case 'pfa':
      return User;
    case 'ii':
      return Briefcase;
    case 'ong':
      return Globe;
    default:
      return Building;
  }
};

const getRoleLabel = (role: CompanyRole): string => {
  switch (role) {
    case 'owner':
      return 'Proprietar';
    case 'admin':
      return 'Administrator';
    case 'accountant':
      return 'Contabil';
    case 'viewer':
      return 'Vizualizare';
    default:
      return 'Membru';
  }
};

const getRoleIcon = (role: CompanyRole) => {
  switch (role) {
    case 'owner':
      return Crown;
    case 'admin':
      return Shield;
    case 'accountant':
      return Building2;
    case 'viewer':
      return User;
    default:
      return User;
  }
};

const getRoleColor = (role: CompanyRole): string => {
  switch (role) {
    case 'owner':
      return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30';
    case 'admin':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
    case 'accountant':
      return 'text-green-600 bg-green-50 dark:bg-green-950/30';
    case 'viewer':
      return 'text-slate-600 bg-slate-50 dark:bg-slate-800';
    default:
      return 'text-slate-600 bg-slate-50 dark:bg-slate-800';
  }
};

const getPlanLabel = (plan: CompanyPlan): string => {
  switch (plan) {
    case 'free':
      return 'Gratuit';
    case 'starter':
      return 'Starter';
    case 'professional':
      return 'Professional';
    case 'enterprise':
      return 'Enterprise';
    default:
      return plan;
  }
};

const getPlanColor = (plan: CompanyPlan): string => {
  switch (plan) {
    case 'free':
      return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
    case 'starter':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-950/30';
    case 'professional':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-950/30';
    case 'enterprise':
      return 'text-amber-600 bg-amber-100 dark:bg-amber-950/30';
    default:
      return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
  }
};

const getCompanyInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const getCompanyColor = (company: Company): string => {
  if (company.color) return company.color;
  // Generate consistent color based on company id
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  const index = company.id.charCodeAt(0) % colors.length;
  return colors[index];
};

// Company Avatar Component
export function CompanyAvatar({
  company,
  size = 'default',
  className,
}: {
  company: Company;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    default: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  if (company.logo) {
    return (
      <img
        src={company.logo}
        alt={company.name}
        className={cn(
          'rounded-lg object-cover',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center font-semibold text-white',
        sizeClasses[size],
        getCompanyColor(company),
        className
      )}
    >
      {getCompanyInitials(company.name)}
    </div>
  );
}

// Company Card Component
export function CompanyCard({
  company,
  isSelected = false,
  onClick,
  onSettings,
  onToggleFavorite,
  variant = 'default',
  className,
}: CompanyCardProps) {
  const TypeIcon = getCompanyTypeIcon(company.type);
  const RoleIcon = getRoleIcon(company.role);

  if (variant === 'compact') {
    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
          isSelected
            ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
          className
        )}
      >
        <CompanyAvatar company={company} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {company.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {getCompanyTypeLabel(company.type)}
          </p>
        </div>
        {isSelected && <Check className="h-4 w-4 text-blue-500" />}
        {company.favorite && !isSelected && (
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
        )}
      </motion.button>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-4 rounded-xl border bg-white dark:bg-slate-900 transition-all',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'hover:border-slate-300 dark:hover:border-slate-600',
          className
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <CompanyAvatar company={company} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {company.name}
                </h3>
                {company.favorite && (
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getPlanColor(company.plan))}>
                  {getPlanLabel(company.plan)}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getRoleColor(company.role))}>
                  {getRoleLabel(company.role)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {company.favorite ? (
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                ) : (
                  <StarOff className="h-4 w-4 text-slate-400" />
                )}
              </button>
            )}
            {onSettings && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSettings();
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {company.cui && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <TypeIcon className="h-4 w-4" />
              <span>CUI: {company.cui}</span>
            </div>
          )}
          {company.address && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{company.address}</span>
            </div>
          )}
          {company.membersCount !== undefined && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Users className="h-4 w-4" />
              <span>{company.membersCount} membri</span>
            </div>
          )}
        </div>

        {onClick && (
          <button
            onClick={onClick}
            className="w-full mt-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
          >
            {isSelected ? 'Companie selectată' : 'Selectează compania'}
          </button>
        )}
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent',
        className
      )}
    >
      <CompanyAvatar company={company} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {company.name}
          </p>
          {company.favorite && (
            <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {getCompanyTypeLabel(company.type)}
          </span>
          {company.cui && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {company.cui}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-xs px-2 py-0.5 rounded-full', getRoleColor(company.role))}>
          {getRoleLabel(company.role)}
        </span>
        {isSelected && <Check className="h-4 w-4 text-blue-500" />}
      </div>
    </motion.button>
  );
}

// Company List Component
export function CompanyList({
  companies,
  currentCompanyId,
  onSelect,
  onSettings,
  onToggleFavorite,
  showFavorites = true,
  className,
}: CompanyListProps) {
  const { favorites, others } = useMemo(() => {
    if (!showFavorites) {
      return { favorites: [], others: companies };
    }
    return {
      favorites: companies.filter((c) => c.favorite && !c.archived),
      others: companies.filter((c) => !c.favorite && !c.archived),
    };
  }, [companies, showFavorites]);

  return (
    <div className={cn('space-y-4', className)}>
      {favorites.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-3 mb-2">
            FAVORITE
          </p>
          <div className="space-y-1">
            {favorites.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                isSelected={company.id === currentCompanyId}
                onClick={() => onSelect(company)}
                onSettings={onSettings ? () => onSettings(company) : undefined}
                onToggleFavorite={
                  onToggleFavorite ? () => onToggleFavorite(company) : undefined
                }
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}
      {others.length > 0 && (
        <div>
          {favorites.length > 0 && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-3 mb-2">
              TOATE COMPANIILE
            </p>
          )}
          <div className="space-y-1">
            {others.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                isSelected={company.id === currentCompanyId}
                onClick={() => onSelect(company)}
                onSettings={onSettings ? () => onSettings(company) : undefined}
                onToggleFavorite={
                  onToggleFavorite ? () => onToggleFavorite(company) : undefined
                }
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Company Switcher Component
export function CompanySwitcher({
  companies,
  currentCompany,
  onCompanyChange,
  onCreateCompany,
  onManageCompanies,
  onCompanySettings,
  onToggleFavorite,
  variant = 'default',
  showSearch = true,
  showFavorites = true,
  showCreateButton = true,
  className,
}: CompanySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.cui?.toLowerCase().includes(query)
    );
  }, [companies, searchQuery]);

  const handleSelect = useCallback(
    (company: Company) => {
      onCompanyChange(company);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onCompanyChange]
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (variant === 'minimal') {
    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <CompanyAvatar company={currentCompany} size="sm" />
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl border shadow-xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Companie curentă
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {currentCompany.name}
                </p>
              </div>
              <div className="max-h-64 overflow-auto p-2">
                <CompanyList
                  companies={filteredCompanies}
                  currentCompanyId={currentCompany.id}
                  onSelect={handleSelect}
                  showFavorites={showFavorites}
                />
              </div>
              {showCreateButton && onCreateCompany && (
                <div className="p-2 border-t">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onCreateCompany();
                    }}
                    className="w-full flex items-center gap-2 p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Adaugă companie nouă</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={cn('space-y-2', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <CompanyAvatar company={currentCompany} />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {currentCompany.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {getCompanyTypeLabel(currentCompany.type)}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {showSearch && companies.length > 3 && (
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Caută companie..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              <div className="max-h-48 overflow-auto">
                <CompanyList
                  companies={filteredCompanies}
                  currentCompanyId={currentCompany.id}
                  onSelect={handleSelect}
                  onToggleFavorite={onToggleFavorite}
                  showFavorites={showFavorites}
                />
              </div>
              <div className="p-2 border-t space-y-1">
                {showCreateButton && onCreateCompany && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onCreateCompany();
                    }}
                    className="w-full flex items-center gap-2 p-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Adaugă companie</span>
                  </button>
                )}
                {onManageCompanies && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onManageCompanies();
                    }}
                    className="w-full flex items-center gap-2 p-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Gestionează companiile</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        >
          <CompanyAvatar company={currentCompany} size="sm" />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[150px] truncate">
            {currentCompany.name}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl border shadow-xl z-50 overflow-hidden"
            >
              {showSearch && companies.length > 5 && (
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Caută companie..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              <div className="max-h-72 overflow-auto p-2">
                <CompanyList
                  companies={filteredCompanies}
                  currentCompanyId={currentCompany.id}
                  onSelect={handleSelect}
                  onSettings={onCompanySettings}
                  onToggleFavorite={onToggleFavorite}
                  showFavorites={showFavorites}
                />
              </div>
              {(showCreateButton || onManageCompanies) && (
                <div className="p-2 border-t flex items-center gap-2">
                  {showCreateButton && onCreateCompany && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onCreateCompany();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Adaugă</span>
                    </button>
                  )}
                  {onManageCompanies && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onManageCompanies();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 p-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Gestionează</span>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Default variant
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors w-full"
      >
        <CompanyAvatar company={currentCompany} />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {currentCompany.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {getCompanyTypeLabel(currentCompany.type)}
            {currentCompany.cui && ` • ${currentCompany.cui}`}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl border shadow-xl z-50 overflow-hidden"
          >
            {showSearch && companies.length > 3 && (
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Caută companie după nume sau CUI..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="max-h-80 overflow-auto p-2">
              {filteredCompanies.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nu s-au găsit companii
                  </p>
                </div>
              ) : (
                <CompanyList
                  companies={filteredCompanies}
                  currentCompanyId={currentCompany.id}
                  onSelect={handleSelect}
                  onSettings={onCompanySettings}
                  onToggleFavorite={onToggleFavorite}
                  showFavorites={showFavorites}
                />
              )}
            </div>

            {(showCreateButton || onManageCompanies) && (
              <div className="p-3 border-t bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                {showCreateButton && onCreateCompany && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onCreateCompany();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Adaugă companie</span>
                  </button>
                )}
                {onManageCompanies && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onManageCompanies();
                    }}
                    className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Company Badge Component
export function CompanyBadge({
  company,
  showType = false,
  className,
}: {
  company: Company;
  showType?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CompanyAvatar company={company} size="sm" />
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {company.name}
        </p>
        {showType && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {getCompanyTypeLabel(company.type)}
          </p>
        )}
      </div>
    </div>
  );
}

// Empty State for No Companies
export function NoCompaniesState({
  onCreateCompany,
  className,
}: {
  onCreateCompany?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl',
        className
      )}
    >
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
        <Building2 className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
        Nicio companie adăugată
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Adăugați prima companie pentru a începe
      </p>
      {onCreateCompany && (
        <button
          onClick={onCreateCompany}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Adaugă companie</span>
        </button>
      )}
    </motion.div>
  );
}

export default CompanySwitcher;
