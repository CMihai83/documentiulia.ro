'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';

interface ComplianceDeadline {
  id: string;
  type: 'saft' | 'efactura' | 'vat' | 'gdpr';
  name: string;
  deadline: Date;
  daysUntil: number;
  url?: string;
}

export function useComplianceAlerts() {
  const { compliance, warning } = useToast();
  const hasShownAlerts = useRef(false);

  const checkDeadlines = useCallback((): ComplianceDeadline[] => {
    const now = new Date();
    const deadlines: ComplianceDeadline[] = [];

    // SAF-T D406 - Due by 25th of next month
    const saftDeadline = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    const saftDaysUntil = Math.ceil((saftDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    deadlines.push({
      id: 'saft-d406',
      type: 'saft',
      name: 'SAF-T D406',
      deadline: saftDeadline,
      daysUntil: saftDaysUntil,
      url: '/ro/dashboard/saft',
    });

    // VAT Declaration - Due by 25th of next month
    const vatDeadline = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    const vatDaysUntil = Math.ceil((vatDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    deadlines.push({
      id: 'vat-declaration',
      type: 'vat',
      name: 'Declaratie TVA',
      deadline: vatDeadline,
      daysUntil: vatDaysUntil,
      url: '/ro/dashboard/vat',
    });

    // e-Factura - Rolling 5-day deadline after issue
    deadlines.push({
      id: 'efactura-submission',
      type: 'efactura',
      name: 'e-Factura SPV',
      deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      daysUntil: 5,
      url: '/ro/dashboard/efactura',
    });

    return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
  }, []);

  const showComplianceAlerts = useCallback(() => {
    if (hasShownAlerts.current) return;

    const deadlines = checkDeadlines();

    deadlines.forEach((deadline) => {
      if (deadline.daysUntil <= 7 && deadline.daysUntil > 3) {
        compliance(
          `${deadline.name} - ${deadline.daysUntil} zile`,
          `Termen limita: ${deadline.deadline.toLocaleDateString('ro-RO')}`
        );
      } else if (deadline.daysUntil <= 3 && deadline.daysUntil > 0) {
        warning(
          `Urgent: ${deadline.name}`,
          `Mai sunt doar ${deadline.daysUntil} zile pana la termenul limita!`
        );
      }
    });

    hasShownAlerts.current = true;
  }, [checkDeadlines, compliance, warning]);

  const getUpcomingDeadlines = useCallback(() => {
    return checkDeadlines().filter((d) => d.daysUntil <= 30);
  }, [checkDeadlines]);

  // Show alerts on initial render (once per session)
  useEffect(() => {
    const timer = setTimeout(() => {
      showComplianceAlerts();
    }, 2000); // Delay to avoid overwhelming user on page load

    return () => clearTimeout(timer);
  }, [showComplianceAlerts]);

  return {
    checkDeadlines,
    getUpcomingDeadlines,
    showComplianceAlerts,
  };
}
