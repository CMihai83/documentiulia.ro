/**
 * Accessible Badge Component
 * Status badges with proper ARIA labels and semantic meaning
 */

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileText, Loader2 } from 'lucide-react';
import type { SubmissionStatus, TransportStatus } from '@/lib/anaf/types';

interface AccessibleBadgeProps {
  status: SubmissionStatus | TransportStatus | string;
  type?: 'submission' | 'transport' | 'deadline';
}

export function AccessibleBadge({ status, type = 'submission' }: AccessibleBadgeProps) {
  const config = getStatusConfig(status, type);
  const Icon = config.icon;

  return (
    <Badge
      className={config.className}
      aria-label={config.ariaLabel}
      role="status"
    >
      <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

function getStatusConfig(status: string, type: string) {
  if (type === 'submission') {
    const submissionConfig: Record<string, any> = {
      DRAFT: {
        icon: FileText,
        label: 'Draft',
        className: 'bg-gray-100 text-gray-800',
        ariaLabel: 'Status: Draft - nu a fost transmis',
      },
      PENDING: {
        icon: Clock,
        label: 'În așteptare',
        className: 'bg-yellow-100 text-yellow-800',
        ariaLabel: 'Status: În așteptare - se procesează',
      },
      SUBMITTED: {
        icon: Loader2,
        label: 'Transmis',
        className: 'bg-blue-100 text-blue-800',
        ariaLabel: 'Status: Transmis - în procesare la ANAF',
      },
      IN_PROGRESS: {
        icon: Loader2,
        label: 'În procesare',
        className: 'bg-purple-100 text-purple-800',
        ariaLabel: 'Status: În procesare - se verifică de ANAF',
      },
      ACCEPTED: {
        icon: CheckCircle2,
        label: 'Acceptat',
        className: 'bg-green-100 text-green-800',
        ariaLabel: 'Status: Acceptat - transmitere reușită',
      },
      REJECTED: {
        icon: XCircle,
        label: 'Respins',
        className: 'bg-red-100 text-red-800',
        ariaLabel: 'Status: Respins - transmitere eșuată, este necesară acțiune',
      },
      ERROR: {
        icon: XCircle,
        label: 'Eroare',
        className: 'bg-red-100 text-red-800',
        ariaLabel: 'Status: Eroare - a apărut o problemă, este necesară acțiune',
      },
      CANCELLED: {
        icon: XCircle,
        label: 'Anulat',
        className: 'bg-gray-100 text-gray-800',
        ariaLabel: 'Status: Anulat',
      },
    };
    return submissionConfig[status] || submissionConfig.DRAFT;
  }

  if (type === 'transport') {
    const transportConfig: Record<string, any> = {
      DRAFT: {
        icon: FileText,
        label: 'Draft',
        className: 'bg-gray-100 text-gray-800',
        ariaLabel: 'Status transport: Draft - nevalidat',
      },
      VALIDATED: {
        icon: CheckCircle2,
        label: 'Validat',
        className: 'bg-blue-100 text-blue-800',
        ariaLabel: 'Status transport: Validat - gata de transmis',
      },
      SUBMITTED: {
        icon: Loader2,
        label: 'Transmis',
        className: 'bg-yellow-100 text-yellow-800',
        ariaLabel: 'Status transport: Transmis - se așteaptă aprobare',
      },
      APPROVED: {
        icon: CheckCircle2,
        label: 'Aprobat',
        className: 'bg-green-100 text-green-800',
        ariaLabel: 'Status transport: Aprobat - UIT primit, gata de pornire',
      },
      REJECTED: {
        icon: XCircle,
        label: 'Respins',
        className: 'bg-red-100 text-red-800',
        ariaLabel: 'Status transport: Respins - necesită modificări',
      },
      IN_TRANSIT: {
        icon: Clock,
        label: 'În tranzit',
        className: 'bg-purple-100 text-purple-800',
        ariaLabel: 'Status transport: În tranzit - transportul este activ',
      },
      COMPLETED: {
        icon: CheckCircle2,
        label: 'Finalizat',
        className: 'bg-green-100 text-green-800',
        ariaLabel: 'Status transport: Finalizat - transportul s-a încheiat',
      },
      CANCELLED: {
        icon: XCircle,
        label: 'Anulat',
        className: 'bg-red-100 text-red-800',
        ariaLabel: 'Status transport: Anulat',
      },
    };
    return transportConfig[status] || transportConfig.DRAFT;
  }

  if (type === 'deadline') {
    const deadlineConfig: Record<string, any> = {
      overdue: {
        icon: AlertTriangle,
        label: 'Depășit',
        className: 'bg-red-100 text-red-800',
        ariaLabel: 'Prioritate: Depășit - acțiune imediată necesară',
      },
      due_soon: {
        icon: Clock,
        label: 'Urgent',
        className: 'bg-orange-100 text-orange-800',
        ariaLabel: 'Prioritate: Urgent - scadență apropiată',
      },
      upcoming: {
        icon: Clock,
        label: 'Viitor',
        className: 'bg-blue-100 text-blue-800',
        ariaLabel: 'Prioritate: Viitor - scadență mai îndepărtată',
      },
      completed: {
        icon: CheckCircle2,
        label: 'Finalizat',
        className: 'bg-green-100 text-green-800',
        ariaLabel: 'Status: Finalizat - termenul a fost îndeplinit',
      },
    };
    return deadlineConfig[status] || deadlineConfig.upcoming;
  }

  // Default fallback
  return {
    icon: FileText,
    label: status,
    className: 'bg-gray-100 text-gray-800',
    ariaLabel: `Status: ${status}`,
  };
}
