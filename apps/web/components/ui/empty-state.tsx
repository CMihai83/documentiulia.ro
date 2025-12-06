'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FileText,
  Users,
  Package,
  Receipt,
  PiggyBank,
  Search,
  Plus,
  Upload,
  FolderOpen,
  Inbox,
  Calendar,
  MessageSquare,
  BookOpen,
  TrendingUp,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  variant?: 'default' | 'search' | 'filter' | 'error';
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  variant = 'default',
}: EmptyStateProps) {
  const getVariantIcon = () => {
    switch (variant) {
      case 'search':
        return Search;
      case 'filter':
        return FolderOpen;
      case 'error':
        return Inbox;
      default:
        return Icon;
    }
  };

  const VariantIcon = getVariantIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <VariantIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {description}
      </p>

      <div className="flex items-center gap-3">
        {actionLabel && (actionHref || onAction) && (
          actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {actionLabel}
            </button>
          )
        )}

        {secondaryActionLabel && secondaryActionHref && (
          <Link
            href={secondaryActionHref}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {secondaryActionLabel}
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// Pre-built empty states for common scenarios
export function EmptyInvoices() {
  return (
    <EmptyState
      icon={FileText}
      title="Nicio factură încă"
      description="Creează prima ta factură și începe să urmărești veniturile companiei tale."
      actionLabel="Creează factură"
      actionHref="/invoices?action=new"
    />
  );
}

export function EmptyContacts() {
  return (
    <EmptyState
      icon={Users}
      title="Niciun contact încă"
      description="Adaugă clienți și furnizori pentru a gestiona mai ușor relațiile de afaceri."
      actionLabel="Adaugă contact"
      actionHref="/contacts?action=new"
    />
  );
}

export function EmptyProducts() {
  return (
    <EmptyState
      icon={Package}
      title="Niciun produs încă"
      description="Adaugă produse și servicii pentru a le include rapid în facturi."
      actionLabel="Adaugă produs"
      actionHref="/products?action=new"
    />
  );
}

export function EmptyExpenses() {
  return (
    <EmptyState
      icon={Receipt}
      title="Nicio cheltuială înregistrată"
      description="Urmărește cheltuielile companiei pentru a avea o imagine clară a finanțelor."
      actionLabel="Adaugă cheltuială"
      actionHref="/expenses?action=new"
    />
  );
}

export function EmptyReceipts() {
  return (
    <EmptyState
      icon={Upload}
      title="Niciun bon scanat"
      description="Scanează bonuri fiscale cu OCR pentru a extrage automat datele."
      actionLabel="Scanează bon"
      actionHref="/receipts?action=scan"
    />
  );
}

export function EmptyBankAccounts() {
  return (
    <EmptyState
      icon={PiggyBank}
      title="Niciun cont bancar"
      description="Conectează conturile bancare pentru sincronizare automată a tranzacțiilor."
      actionLabel="Conectează cont"
      actionHref="/banking?action=connect"
    />
  );
}

export function EmptySearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      variant="search"
      title="Niciun rezultat găsit"
      description={`Nu am găsit rezultate pentru "${query}". Încearcă cu alți termeni de căutare.`}
    />
  );
}

export function EmptyFilterResults() {
  return (
    <EmptyState
      variant="filter"
      title="Niciun rezultat pentru filtre"
      description="Modifică filtrele selectate pentru a vedea mai multe rezultate."
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={Inbox}
      title="Ești la zi!"
      description="Nu ai notificări noi. Te vom anunța când apare ceva important."
    />
  );
}

export function EmptyCalendarEvents() {
  return (
    <EmptyState
      icon={Calendar}
      title="Niciun eveniment programat"
      description="Nu ai termene fiscale sau evenimente în această perioadă."
    />
  );
}

export function EmptyForumTopics() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="Nicio discuție în această categorie"
      description="Fii primul care începe o conversație pe acest subiect."
      actionLabel="Creează discuție"
      actionHref="/forum?action=new"
    />
  );
}

export function EmptyCourses() {
  return (
    <EmptyState
      icon={BookOpen}
      title="Niciun curs disponibil"
      description="Cursurile noi vor fi adăugate în curând. Revino mai târziu!"
    />
  );
}

export function EmptyReports() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="Date insuficiente pentru rapoarte"
      description="Adaugă mai multe tranzacții pentru a genera rapoarte detaliate."
      actionLabel="Adaugă date"
      actionHref="/invoices?action=new"
    />
  );
}
