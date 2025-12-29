/**
 * SAF-T D406 Mock Data
 * Monthly SAF-T reporting data per Order 1783/2021
 */

import type {
  SaftD406GenerationResult,
  SaftD406SubmissionResult,
  SaftD406ComplianceStatus,
  SaftD406Checklist,
  SaftD406Report,
  SaftD406Dashboard,
  DeadlineInfo,
  Alert,
} from '../types';

export const mockSaftD406GenerationResult: SaftD406GenerationResult = {
  success: true,
  xml: '<?xml version="1.0" encoding="UTF-8"?>\n<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:RO_2.0">\n  <Header>\n    <AuditFileVersion>2.0</AuditFileVersion>\n    <CompanyID>12345678</CompanyID>\n    <TaxRegistrationNumber>12345678</TaxRegistrationNumber>\n    <TaxAccountingBasis>F</TaxAccountingBasis>\n    <CompanyName>SC Demo Company SRL</CompanyName>\n  </Header>\n  <!-- ... more SAF-T XML content ... -->\n</AuditFile>',
  validation: {
    valid: true,
    errors: [],
    warnings: [],
  },
  fileSize: {
    bytes: 524288,
    mb: 0.5,
    valid: true,
  },
};

export const mockSaftD406GenerationError: SaftD406GenerationResult = {
  success: false,
  validation: {
    valid: false,
    errors: [
      'Lipsă facturi pentru perioada selectată',
      'CUI furnizor invalid: trebuie să fie 8 cifre',
      'Data facturii în afara perioadei selectate',
    ],
    warnings: [
      'Curs valutar lipsă pentru EUR - se va folosi cursul BNR',
    ],
  },
};

export const mockSaftD406SubmissionResult: SaftD406SubmissionResult = {
  success: true,
  reference: 'SAFT-2025-01-001',
  submissionId: 'sub_001',
  status: 'SUBMITTED',
  submittedAt: new Date('2025-01-20T14:30:00Z'),
};

export const mockSaftD406ComplianceStatus: SaftD406ComplianceStatus = {
  period: '2025-01',
  periodStatus: 'pending',
  daysUntilDeadline: 5,
  gracePeriodActive: false,
  complianceScore: 85,
};

export const mockSaftD406ComplianceOverdue: SaftD406ComplianceStatus = {
  period: '2024-12',
  periodStatus: 'overdue',
  daysUntilDeadline: -10,
  gracePeriodActive: false,
  complianceScore: 45,
};

export const mockSaftD406ComplianceAccepted: SaftD406ComplianceStatus = {
  period: '2024-11',
  periodStatus: 'accepted',
  daysUntilDeadline: 0,
  gracePeriodActive: false,
  submissionDate: new Date('2024-12-20T10:15:00Z'),
  reference: 'SAFT-2024-11-001',
  complianceScore: 100,
};

export const mockSaftD406Checklist: SaftD406Checklist = {
  ready: true,
  score: 90,
  checklist: [
    {
      item: 'Date furnizor complete (CUI, denumire, adresă)',
      status: 'ok',
      message: 'Toate datele furnizorului sunt complete',
      required: true,
    },
    {
      item: 'Facturi pentru perioada selectată',
      status: 'ok',
      message: '24 facturi găsite pentru Ianuarie 2025',
      required: true,
    },
    {
      item: 'Cursuri valutare complete',
      status: 'warning',
      message: 'Lipsă curs BNR pentru 2 zile - se va folosi ultima valoare disponibilă',
      required: false,
    },
    {
      item: 'TVA calculat corect',
      status: 'ok',
      message: 'Toate facturile au TVA calculat conform Legea 141/2025',
      required: true,
    },
    {
      item: 'Dimensiune fișier XML < 500MB',
      status: 'ok',
      message: 'Dimensiune estimată: 0.5 MB',
      required: true,
    },
  ],
};

export const mockSaftD406ChecklistNotReady: SaftD406Checklist = {
  ready: false,
  score: 40,
  checklist: [
    {
      item: 'Date furnizor complete (CUI, denumire, adresă)',
      status: 'error',
      message: 'CUI lipsă în setările companiei',
      required: true,
    },
    {
      item: 'Facturi pentru perioada selectată',
      status: 'ok',
      message: '15 facturi găsite pentru Decembrie 2024',
      required: true,
    },
    {
      item: 'TVA calculat corect',
      status: 'error',
      message: '3 facturi cu TVA incorect - verificați cotele (19% sau 21%)',
      required: true,
    },
  ],
};

export const mockSaftD406Reports: SaftD406Report[] = [
  {
    id: 'rep_001',
    period: '2025-01',
    status: 'SUBMITTED',
    generatedAt: new Date('2025-01-20T14:25:00Z'),
    submittedAt: new Date('2025-01-20T14:30:00Z'),
    reference: 'SAFT-2025-01-001',
    fileSize: 524288,
  },
  {
    id: 'rep_002',
    period: '2024-12',
    status: 'ACCEPTED',
    generatedAt: new Date('2024-12-20T10:10:00Z'),
    submittedAt: new Date('2024-12-20T10:15:00Z'),
    reference: 'SAFT-2024-12-001',
    fileSize: 612000,
  },
  {
    id: 'rep_003',
    period: '2024-11',
    status: 'ACCEPTED',
    generatedAt: new Date('2024-11-22T09:00:00Z'),
    submittedAt: new Date('2024-11-22T09:05:00Z'),
    reference: 'SAFT-2024-11-001',
    fileSize: 489000,
  },
  {
    id: 'rep_004',
    period: '2024-10',
    status: 'REJECTED',
    generatedAt: new Date('2024-10-25T15:30:00Z'),
    submittedAt: new Date('2024-10-25T15:35:00Z'),
    reference: 'SAFT-2024-10-001',
    fileSize: 550000,
  },
  {
    id: 'rep_005',
    period: '2024-09',
    status: 'DRAFT',
    generatedAt: new Date('2024-09-20T12:00:00Z'),
    fileSize: 470000,
  },
];

const mockDeadlineInfo: DeadlineInfo = {
  currentPeriod: '2025-01',
  nextDeadline: new Date('2025-02-25T23:59:59Z'),
  daysRemaining: 33,
  isOverdue: false,
  gracePeriod: {
    active: false,
    start: new Date('2025-09-01'),
    end: new Date('2026-08-31'),
    description: 'Perioada pilot Sept 2025 - Aug 2026 cu 6 luni grație',
  },
};

const mockAlerts: Alert[] = [
  {
    type: 'warning',
    message: 'Termen limită în 5 zile pentru SAF-T D406 Ianuarie 2025',
    details: 'Depuneți până pe 25 februarie 2025',
  },
  {
    type: 'info',
    message: 'Perioada pilot activă din septembrie 2025',
    details: 'Fără penalități pentru întârzieri în perioada sept 2025 - aug 2026',
  },
];

export const mockSaftD406Dashboard: SaftD406Dashboard = {
  currentPeriod: {
    period: '2025-01',
    compliance: mockSaftD406ComplianceStatus,
  },
  previousPeriod: {
    period: '2024-12',
    compliance: mockSaftD406ComplianceAccepted,
    checklist: mockSaftD406Checklist,
  },
  submissionStats: {
    draft: 1,
    submitted: 1,
    accepted: 2,
    rejected: 1,
  },
  recentReports: mockSaftD406Reports.slice(0, 5),
  deadlines: mockDeadlineInfo,
  alerts: mockAlerts,
};
