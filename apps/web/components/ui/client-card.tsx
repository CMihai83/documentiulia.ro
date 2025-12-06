'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ClientType = 'company' | 'individual';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  email?: string;
  phone?: string;
  vatNumber?: string;
  registrationNumber?: string;
  address?: {
    street?: string;
    city?: string;
    county?: string;
    postalCode?: string;
    country?: string;
  };
  bankAccount?: string;
  bankName?: string;
  totalInvoiced?: number;
  totalPaid?: number;
  invoiceCount?: number;
  lastInvoiceDate?: string;
  tags?: string[];
  notes?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface ClientCardProps {
  client: Client;
  currency?: string;
  variant?: 'default' | 'compact' | 'detailed';
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onEmail?: () => void;
  onCall?: () => void;
  onInvoice?: () => void;
  className?: string;
}

export interface ClientListProps {
  clients: Client[];
  currency?: string;
  variant?: 'default' | 'compact' | 'detailed';
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onClientClick?: (client: Client) => void;
  emptyMessage?: string;
  className?: string;
}

export interface ClientQuickAddProps {
  onAdd: (client: Partial<Client>) => void;
  onCancel?: () => void;
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// Client Avatar Component
// ============================================================================

export interface ClientAvatarProps {
  name: string;
  type: ClientType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
};

export function ClientAvatar({ name, type, size = 'md', className }: ClientAvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold',
        type === 'company'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        avatarSizes[size],
        className
      )}
    >
      {type === 'company' ? (
        <svg className="w-1/2 h-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

// ============================================================================
// Client Card Component
// ============================================================================

export function ClientCard({
  client,
  currency = 'RON',
  variant = 'default',
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onEmail,
  onCall,
  onInvoice,
  className,
}: ClientCardProps) {
  const balance = (client.totalInvoiced || 0) - (client.totalPaid || 0);

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-all cursor-pointer',
          selected && 'ring-2 ring-primary',
          className
        )}
        onClick={onSelect}
      >
        <ClientAvatar name={client.name} type={client.type} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{client.name}</p>
          {client.email && (
            <p className="text-xs text-muted-foreground truncate">{client.email}</p>
          )}
        </div>
        {balance > 0 && (
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
            {formatCurrency(balance, currency)}
          </span>
        )}
      </motion.div>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-5 rounded-xl border bg-card hover:shadow-md transition-all',
          selected && 'ring-2 ring-primary',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <ClientAvatar name={client.name} type={client.type} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{client.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {client.type === 'company' ? 'Companie' : 'Persoană fizică'}
                </p>
              </div>
              {client.isActive !== undefined && (
                <span
                  className={cn(
                    'px-2 py-1 text-xs rounded-full',
                    client.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {client.isActive ? 'Activ' : 'Inactiv'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {client.email && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{client.phone}</span>
            </div>
          )}
          {client.vatNumber && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>CUI: {client.vatNumber}</span>
            </div>
          )}
          {client.address?.city && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{client.address.city}, {client.address.county || client.address.country}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg mb-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Facturat</p>
            <p className="font-semibold">{formatCurrency(client.totalInvoiced || 0, currency)}</p>
          </div>
          <div className="text-center border-x">
            <p className="text-xs text-muted-foreground">Încasat</p>
            <p className="font-semibold text-green-600">{formatCurrency(client.totalPaid || 0, currency)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Sold</p>
            <p className={cn('font-semibold', balance > 0 ? 'text-orange-600' : 'text-gray-600')}>
              {formatCurrency(balance, currency)}
            </p>
          </div>
        </div>

        {/* Tags */}
        {client.tags && client.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {client.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-muted rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t">
          {onEmail && client.email && (
            <button
              onClick={onEmail}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Trimite email"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          {onCall && client.phone && (
            <button
              onClick={onCall}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Sună"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          )}
          {onInvoice && (
            <button
              onClick={onInvoice}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Creează factură"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
          <div className="flex-1" />
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Editează"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
              title="Șterge"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'p-4 rounded-lg border bg-card hover:shadow-sm transition-all',
        selected && 'ring-2 ring-primary',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <ClientAvatar name={client.name} type={client.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{client.name}</h4>
              <p className="text-sm text-muted-foreground">
                {client.type === 'company' ? client.vatNumber || 'Companie' : 'Persoană fizică'}
              </p>
            </div>
            {balance > 0 && (
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                {formatCurrency(balance, currency)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {client.email && (
              <span className="truncate max-w-[150px]">{client.email}</span>
            )}
            {client.invoiceCount !== undefined && (
              <span>{client.invoiceCount} facturi</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Client List Component
// ============================================================================

export function ClientList({
  clients,
  currency = 'RON',
  variant = 'default',
  selectedIds = [],
  onSelect,
  onClientClick,
  emptyMessage = 'Nu există clienți',
  className,
}: ClientListProps) {
  if (clients.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          currency={currency}
          variant={variant}
          selected={selectedIds.includes(client.id)}
          onSelect={onSelect ? () => onSelect(client.id) : onClientClick ? () => onClientClick(client) : undefined}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Client Quick Add Component
// ============================================================================

export function ClientQuickAdd({ onAdd, onCancel, className }: ClientQuickAddProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    type: 'company' as ClientType,
    email: '',
    phone: '',
    vatNumber: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      id: crypto.randomUUID(),
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit}
      className={cn('p-4 rounded-lg border-2 border-dashed bg-card space-y-4', className)}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Nume *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="Nume client sau companie"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tip</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as ClientType })}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="company">Companie</option>
            <option value="individual">Persoană fizică</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CUI</label>
          <input
            type="text"
            value={formData.vatNumber}
            onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="RO12345678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="email@exemplu.ro"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Telefon</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="+40 XXX XXX XXX"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            Anulează
          </button>
        )}
        <button
          type="submit"
          disabled={!formData.name}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Adaugă client
        </button>
      </div>
    </motion.form>
  );
}

// ============================================================================
// Client Stats Card Component
// ============================================================================

export interface ClientStatsProps {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  averageRevenue: number;
  currency?: string;
  className?: string;
}

export function ClientStats({
  totalClients,
  activeClients,
  totalRevenue,
  averageRevenue,
  currency = 'RON',
  className,
}: ClientStatsProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-4', className)}>
      <div className="p-4 bg-card rounded-lg border">
        <p className="text-sm text-muted-foreground">Total clienți</p>
        <p className="text-2xl font-bold">{totalClients}</p>
      </div>
      <div className="p-4 bg-card rounded-lg border">
        <p className="text-sm text-muted-foreground">Clienți activi</p>
        <p className="text-2xl font-bold text-green-600">{activeClients}</p>
      </div>
      <div className="p-4 bg-card rounded-lg border">
        <p className="text-sm text-muted-foreground">Venituri totale</p>
        <p className="text-2xl font-bold">{formatCurrency(totalRevenue, currency)}</p>
      </div>
      <div className="p-4 bg-card rounded-lg border">
        <p className="text-sm text-muted-foreground">Media per client</p>
        <p className="text-2xl font-bold">{formatCurrency(averageRevenue, currency)}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { getInitials, formatDate as formatClientDate };
