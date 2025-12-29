/**
 * Deadline Reminders Mock Data
 * ANAF compliance deadlines and reminders
 */

import type {
  DeadlineReminder,
  DeadlineSummary,
  DeadlineConfig,
  DeadlineType,
} from '../types';

export const mockDeadlineConfigs: DeadlineConfig[] = [
  {
    type: 'SAFT_D406',
    name: 'SAF-T D406 Monthly',
    nameRo: 'SAF-T D406 Lunar',
    frequency: 'monthly',
    reminderDays: [7, 3, 1],
    description: 'Monthly SAF-T D406 submission - due 25th of following month',
    law: 'Order 1783/2021',
  },
  {
    type: 'EFACTURA_B2B',
    name: 'e-Factura B2B',
    nameRo: 'e-Factura B2B',
    frequency: 'custom',
    reminderDays: [5, 1],
    description: 'e-Factura B2B submission within 5 working days',
    law: 'OUG 120/2021',
  },
  {
    type: 'EFACTURA_B2C',
    name: 'e-Factura B2C',
    nameRo: 'e-Factura B2C',
    frequency: 'custom',
    reminderDays: [5, 1],
    description: 'e-Factura B2C submission - mandatory from Jan 2025',
    law: 'Legea 296/2023',
  },
  {
    type: 'VAT_RETURN',
    name: 'VAT Return',
    nameRo: 'Declarație TVA',
    frequency: 'monthly',
    reminderDays: [10, 5, 2],
    description: 'Monthly VAT return - due 25th of following month',
    law: 'Cod Fiscal',
  },
  {
    type: 'E_TRANSPORT',
    name: 'e-Transport Declaration',
    nameRo: 'Declarație e-Transport',
    frequency: 'custom',
    reminderDays: [1],
    description: 'e-Transport declaration before transport start',
    law: 'OUG 41/2022',
  },
];

const now = new Date();
const addDays = (days: number) => {
  const result = new Date(now);
  result.setDate(result.getDate() + days);
  return result;
};

export const mockDeadlineReminders: DeadlineReminder[] = [
  {
    id: 'deadline_001',
    type: 'SAFT_D406',
    description: 'SAF-T D406 pentru Ianuarie 2025',
    dueDate: addDays(5),
    reminderDays: [7, 3, 1],
    status: 'due_soon',
    completed: false,
    userId: 'user_001',
  },
  {
    id: 'deadline_002',
    type: 'VAT_RETURN',
    description: 'Declarație TVA pentru Ianuarie 2025',
    dueDate: addDays(6),
    reminderDays: [10, 5, 2],
    status: 'upcoming',
    completed: false,
    userId: 'user_001',
  },
  {
    id: 'deadline_003',
    type: 'EFACTURA_B2B',
    description: 'Transmitere e-Factura FAC-2025-003',
    dueDate: addDays(2),
    reminderDays: [5, 1],
    status: 'due_soon',
    completed: false,
    userId: 'user_001',
  },
  {
    id: 'deadline_004',
    type: 'E_TRANSPORT',
    description: 'Declarație e-Transport pentru transport București-Brașov',
    dueDate: addDays(1),
    reminderDays: [1],
    status: 'due_soon',
    completed: false,
    userId: 'user_001',
  },
  {
    id: 'deadline_005',
    type: 'SAFT_D406',
    description: 'SAF-T D406 pentru Decembrie 2024',
    dueDate: addDays(-5),
    reminderDays: [7, 3, 1],
    status: 'overdue',
    completed: false,
    userId: 'user_001',
  },
  {
    id: 'deadline_006',
    type: 'VAT_RETURN',
    description: 'Declarație TVA pentru Decembrie 2024',
    dueDate: addDays(-10),
    reminderDays: [10, 5, 2],
    status: 'overdue',
    completed: false,
    userId: 'user_001',
  },
  {
    id: 'deadline_007',
    type: 'SAFT_D406',
    description: 'SAF-T D406 pentru Noiembrie 2024',
    dueDate: addDays(-35),
    reminderDays: [7, 3, 1],
    status: 'completed',
    completed: true,
    completedAt: addDays(-32),
    userId: 'user_001',
  },
  {
    id: 'deadline_008',
    type: 'VAT_RETURN',
    description: 'Declarație TVA pentru Noiembrie 2024',
    dueDate: addDays(-35),
    reminderDays: [10, 5, 2],
    status: 'completed',
    completed: true,
    completedAt: addDays(-33),
    userId: 'user_001',
  },
  {
    id: 'deadline_009',
    type: 'EFACTURA_B2C',
    description: 'Transmitere e-Factura B2C FACB2C-2025-001',
    dueDate: addDays(15),
    reminderDays: [5, 1],
    status: 'upcoming',
    completed: false,
    userId: 'user_001',
  },
  {
    id: 'deadline_010',
    type: 'CUSTOM',
    description: 'Audit intern - verificare conformitate ANAF',
    dueDate: addDays(20),
    reminderDays: [7, 3],
    status: 'upcoming',
    completed: false,
    userId: 'user_001',
  },
];

export const mockDeadlineSummary: DeadlineSummary = {
  upcoming: mockDeadlineReminders.filter((d) => d.status === 'upcoming'),
  dueSoon: mockDeadlineReminders.filter((d) => d.status === 'due_soon'),
  overdue: mockDeadlineReminders.filter((d) => d.status === 'overdue'),
  completed: mockDeadlineReminders.filter((d) => d.status === 'completed'),
  counts: {
    total: mockDeadlineReminders.length,
    upcoming: mockDeadlineReminders.filter((d) => d.status === 'upcoming').length,
    dueSoon: mockDeadlineReminders.filter((d) => d.status === 'due_soon').length,
    overdue: mockDeadlineReminders.filter((d) => d.status === 'overdue').length,
    completed: mockDeadlineReminders.filter((d) => d.status === 'completed').length,
  },
};

// Helper function to get deadlines by status
export const getDeadlinesByStatus = (status: 'upcoming' | 'due_soon' | 'overdue' | 'completed') => {
  return mockDeadlineReminders.filter((d) => d.status === status);
};

// Helper function to get deadlines by type
export const getDeadlinesByType = (type: DeadlineType) => {
  return mockDeadlineReminders.filter((d) => d.type === type);
};

// Helper function to get urgent deadlines (overdue + due_soon)
export const getUrgentDeadlines = () => {
  return mockDeadlineReminders.filter((d) => d.status === 'overdue' || d.status === 'due_soon');
};
