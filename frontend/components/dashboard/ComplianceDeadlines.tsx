'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, InlineHelp } from '@/components/ui/Tooltip';

interface ComplianceDeadline {
  id: string;
  type: 'saft' | 'efactura' | 'vat' | 'gdpr';
  name: string;
  deadline: Date;
  daysUntil: number;
  url: string;
  description: string;
  helpText: string;
}

export function ComplianceDeadlines() {
  const t = useTranslations('compliance');
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>([]);

  useEffect(() => {
    const now = new Date();

    // Calculate next SAF-T D406 deadline (25th of next month)
    const saftDeadline = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    const saftDaysUntil = Math.ceil((saftDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate next VAT declaration deadline (25th of next month)
    const vatDeadline = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    const vatDaysUntil = Math.ceil((vatDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    setDeadlines([
      {
        id: 'saft-d406',
        type: 'saft',
        name: 'SAF-T D406',
        deadline: saftDeadline,
        daysUntil: saftDaysUntil,
        url: '/dashboard/saft',
        description: 'Ordin 1783/2021',
        helpText: 'Declarația lunară SAF-T D406 conform Ordinului 1783/2021. Trebuie transmisă până pe 25 ale lunii următoare.',
      },
      {
        id: 'vat-declaration',
        type: 'vat',
        name: 'Declaratie TVA',
        deadline: vatDeadline,
        daysUntil: vatDaysUntil,
        url: '/dashboard/vat',
        description: 'Legea 141/2025',
        helpText: 'Declarația D300 pentru TVA conform Legea 141/2025. Cotele noi: 21% standard, 11% redus.',
      },
      {
        id: 'efactura',
        type: 'efactura',
        name: 'e-Factura SPV',
        deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        daysUntil: 5,
        url: '/dashboard/efactura',
        description: 'UBL 2.1 B2B',
        helpText: 'Transmiterea facturilor electronice în sistemul SPV ANAF. Obligatoriu pentru B2B din 2024.',
      },
    ]);
  }, []);

  const getStatusColor = (daysUntil: number) => {
    if (daysUntil <= 3) return 'text-red-500 bg-red-50';
    if (daysUntil <= 7) return 'text-amber-500 bg-amber-50';
    return 'text-green-500 bg-green-50';
  };

  const getStatusIcon = (daysUntil: number) => {
    if (daysUntil <= 3) return AlertTriangle;
    if (daysUntil <= 7) return Clock;
    return CheckCircle;
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
        Termene Conformitate ANAF
        <InlineHelp
          content="Calendar cu termenele legale pentru declarațiile fiscale. Click pe un termen pentru a accesa modulul respectiv."
          title="Termene ANAF"
          size="sm"
        />
      </h2>

      <div className="space-y-2 sm:space-y-3">
        {deadlines.map((deadline) => {
          const StatusIcon = getStatusIcon(deadline.daysUntil);
          const statusColors = getStatusColor(deadline.daysUntil);

          return (
            <Tooltip key={deadline.id} content={deadline.helpText} position="left">
              <Link
                href={deadline.url}
                className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group w-full"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${statusColors}`}>
                    <StatusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base text-gray-900 group-hover:text-purple-600 transition">
                      {deadline.name}
                    </p>
                    <p className="text-xs text-gray-500">{deadline.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {deadline.deadline.toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <p className={`text-xs font-medium ${deadline.daysUntil <= 3 ? 'text-red-600' : deadline.daysUntil <= 7 ? 'text-amber-600' : 'text-green-600'}`}>
                    {deadline.daysUntil === 1
                      ? 'Maine'
                      : deadline.daysUntil === 0
                        ? 'Astazi!'
                        : `${deadline.daysUntil} zile`}
                  </p>
                </div>
              </Link>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t text-xs text-gray-500">
        <p className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Conformitate 100% cu reglementarile ANAF in vigoare
        </p>
      </div>
    </div>
  );
}
