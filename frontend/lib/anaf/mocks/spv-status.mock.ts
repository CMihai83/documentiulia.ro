/**
 * SPV (Spațiul Privat Virtual) Mock Data
 * Connection status, dashboard, and OAuth data for development
 */

import type {
  SpvConnectionStatus,
  SpvDashboard,
  SpvOAuthUrl,
  SpvSubmission,
} from '../types';

export const mockSpvConnectionStatus: SpvConnectionStatus = {
  connected: true,
  cui: '12345678',
  companyName: 'SC Demo Company SRL',
  connectedAt: new Date('2025-01-15T10:30:00Z'),
  tokenExpiresAt: new Date('2025-12-31T23:59:59Z'),
  features: {
    efactura: true,
    saft: true,
    eTransport: true,
  },
};

export const mockSpvConnectionDisconnected: SpvConnectionStatus = {
  connected: false,
  features: {
    efactura: false,
    saft: false,
    eTransport: false,
  },
};

export const mockSpvOAuthUrl: SpvOAuthUrl = {
  authUrl: 'https://logincert.anaf.ro/anaf-oauth2/v1/authorize?client_id=demo&redirect_uri=http://localhost:3000/api/v1/spv/oauth/callback&response_type=code&scope=openid&state=abc123',
  state: 'abc123',
  redirectUri: 'http://localhost:3000/api/v1/spv/oauth/callback',
};

export const mockSpvSubmissions: SpvSubmission[] = [
  {
    id: 'sub_001',
    type: 'SAFT',
    status: 'ACCEPTED',
    submittedAt: new Date('2025-01-20T14:30:00Z'),
    reference: 'SAFT-2025-01-001',
    retryCount: 0,
    lastCheckedAt: new Date('2025-01-20T14:35:00Z'),
  },
  {
    id: 'sub_002',
    type: 'EFACTURA',
    status: 'SUBMITTED',
    submittedAt: new Date('2025-01-21T09:15:00Z'),
    uploadIndex: '1234567890',
    retryCount: 0,
    lastCheckedAt: new Date('2025-01-21T09:20:00Z'),
  },
  {
    id: 'sub_003',
    type: 'E_TRANSPORT',
    status: 'IN_PROGRESS',
    submittedAt: new Date('2025-01-22T11:00:00Z'),
    reference: 'UIT-2025-001',
    retryCount: 0,
    lastCheckedAt: new Date('2025-01-22T11:05:00Z'),
  },
  {
    id: 'sub_004',
    type: 'EFACTURA',
    status: 'REJECTED',
    submittedAt: new Date('2025-01-19T16:45:00Z'),
    uploadIndex: '9876543210',
    errorMessage: 'Date furnizor incomplete - CUI lipsă',
    retryCount: 1,
    lastCheckedAt: new Date('2025-01-19T17:00:00Z'),
  },
  {
    id: 'sub_005',
    type: 'SAFT',
    status: 'PENDING',
    submittedAt: new Date('2025-01-23T08:00:00Z'),
    reference: 'SAFT-2025-01-002',
    retryCount: 0,
    lastCheckedAt: new Date('2025-01-23T08:05:00Z'),
  },
];

export const mockSpvDashboard: SpvDashboard = {
  connection: mockSpvConnectionStatus,
  stats: {
    submissionsTotal: 147,
    submissionsThisMonth: 23,
    pendingActions: 3,
    unreadMessages: 2,
  },
  recentSubmissions: mockSpvSubmissions.slice(0, 5),
  deadlines: [
    {
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
    },
    {
      currentPeriod: '2025-Q1',
      nextDeadline: new Date('2026-07-01T00:00:00Z'),
      daysRemaining: 524,
      isOverdue: false,
    },
  ],
};

export const mockSpvDisconnectedDashboard: SpvDashboard = {
  connection: mockSpvConnectionDisconnected,
  stats: {
    submissionsTotal: 0,
    submissionsThisMonth: 0,
    pendingActions: 1, // Connect to SPV
    unreadMessages: 0,
  },
  recentSubmissions: [],
  deadlines: [],
};
