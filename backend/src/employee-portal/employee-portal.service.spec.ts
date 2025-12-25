import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  EmployeePortalService,
  LeaveType,
  LeaveRequestStatus,
  DocumentType,
  DataUpdateStatus,
  NotificationType,
} from './employee-portal.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EmployeePortalService', () => {
  let service: EmployeePortalService;

  const mockEmployee = {
    id: 'emp-123',
    userId: 'user-123',
    firstName: 'Ion',
    lastName: 'Popescu',
    email: 'ion.popescu@example.com',
    position: 'Software Developer',
    hireDate: new Date('2023-01-15'),
    status: 'ACTIVE',
    department: 'IT Department',
    cnp: '1850101221145',
    salary: 5000,
    contractType: 'FULL_TIME',
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    employee: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeePortalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmployeePortalService>(EmployeePortalService);

    // Reset mocks
    jest.clearAllMocks();
    mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
    mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
    mockPrismaService.employee.findMany.mockResolvedValue([mockEmployee]);
    mockPrismaService.employee.count.mockResolvedValue(10);
  });

  describe('Dashboard', () => {
    it('should get employee dashboard', async () => {
      const dashboard = await service.getDashboard('user-123');

      expect(dashboard).toBeDefined();
      expect(dashboard.employee).toBeDefined();
      expect(dashboard.leaveBalance).toBeDefined();
      expect(dashboard.quickActions.length).toBeGreaterThan(0);
      expect(dashboard.announcements.length).toBeGreaterThan(0);
    });

    it('should include quick actions', async () => {
      const dashboard = await service.getDashboard('user-123');

      expect(dashboard.quickActions).toContainEqual(
        expect.objectContaining({ id: 'leave-request' })
      );
      expect(dashboard.quickActions).toContainEqual(
        expect.objectContaining({ id: 'payslips' })
      );
    });
  });

  describe('Employee Profile', () => {
    it('should get employee profile', async () => {
      const profile = await service.getEmployeeProfile('user-123');

      expect(profile.id).toBe('emp-123');
      expect(profile.firstName).toBe('Ion');
      expect(profile.lastName).toBe('Popescu');
      expect(profile.department).toBe('IT Department');
    });

    it('should throw NotFoundException for unknown user', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue(null);

      await expect(service.getEmployeeProfile('unknown-user')).rejects.toThrow(NotFoundException);
    });

    it('should have no manager in current schema', async () => {
      const profile = await service.getEmployeeProfile('user-123');

      // Manager is not in current schema
      expect(profile.manager).toBeUndefined();
    });

    it('should create profile update requests', async () => {
      const requests = await service.updateProfile('user-123', {
        phone: '+40798765432',
        address: 'New Address',
      });

      expect(requests.length).toBe(2);
      expect(requests[0].status).toBe(DataUpdateStatus.PENDING);
      expect(requests[0].fieldName).toBe('phone');
    });
  });

  describe('Leave Balance', () => {
    it('should get leave balance with defaults', async () => {
      const balance = await service.getLeaveBalance('user-123');

      expect(balance.annual.total).toBe(21);
      expect(balance.annual.available).toBeLessThanOrEqual(21);
      expect(balance.expiresAt).toBeDefined();
    });

    it('should calculate used days from approved requests', async () => {
      // Create some leave requests first
      await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-01-13',
        endDate: '2025-01-17',
      });

      const balance = await service.getLeaveBalance('user-123');
      expect(balance.annual.pending).toBeGreaterThan(0);
    });

    it('should throw for unknown employee', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue(null);

      await expect(service.getLeaveBalance('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Leave Requests', () => {
    it('should create annual leave request', async () => {
      const request = await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-02-03',
        endDate: '2025-02-07',
        reason: 'Vacation',
      });

      expect(request.id).toBeDefined();
      expect(request.type).toBe(LeaveType.ANNUAL);
      expect(request.workingDays).toBe(5);
      expect(request.status).toBe(LeaveRequestStatus.PENDING);
    });

    it('should auto-approve medical leave', async () => {
      const request = await service.createLeaveRequest('user-123', {
        type: LeaveType.MEDICAL,
        startDate: '2025-02-03',
        endDate: '2025-02-05',
        attachments: ['https://storage.example.com/medical-cert.pdf'],
      });

      expect(request.status).toBe(LeaveRequestStatus.APPROVED);
      expect(request.approvedAt).toBeDefined();
    });

    it('should require attachment for medical leave', async () => {
      await expect(
        service.createLeaveRequest('user-123', {
          type: LeaveType.MEDICAL,
          startDate: '2025-02-03',
          endDate: '2025-02-05',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate date range', async () => {
      await expect(
        service.createLeaveRequest('user-123', {
          type: LeaveType.ANNUAL,
          startDate: '2025-02-10',
          endDate: '2025-02-05', // End before start
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should check leave balance for annual leave', async () => {
      // Create requests that exceed balance
      for (let i = 0; i < 5; i++) {
        await service.createLeaveRequest('user-123', {
          type: LeaveType.ANNUAL,
          startDate: `2025-0${3 + i}-03`,
          endDate: `2025-0${3 + i}-07`,
        });
      }

      // This should fail due to insufficient balance
      await expect(
        service.createLeaveRequest('user-123', {
          type: LeaveType.ANNUAL,
          startDate: '2025-08-03',
          endDate: '2025-08-15',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should get leave requests', async () => {
      await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-03-03',
        endDate: '2025-03-05',
      });

      const requests = await service.getLeaveRequests('user-123');
      expect(requests.length).toBeGreaterThan(0);
    });

    it('should filter requests by status', async () => {
      await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-03-10',
        endDate: '2025-03-12',
      });

      const pendingRequests = await service.getLeaveRequests('user-123', LeaveRequestStatus.PENDING);
      expect(pendingRequests.every(r => r.status === LeaveRequestStatus.PENDING)).toBe(true);
    });

    it('should cancel leave request', async () => {
      const request = await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-04-07',
        endDate: '2025-04-11',
      });

      const cancelled = await service.cancelLeaveRequest('user-123', request.id);
      expect(cancelled.status).toBe(LeaveRequestStatus.CANCELLED);
    });

    it('should not cancel already cancelled request', async () => {
      const request = await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-04-14',
        endDate: '2025-04-16',
      });

      await service.cancelLeaveRequest('user-123', request.id);

      await expect(
        service.cancelLeaveRequest('user-123', request.id)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payslips', () => {
    it('should get payslips (empty initially)', async () => {
      const payslips = await service.getPayslips('user-123');
      expect(Array.isArray(payslips)).toBe(true);
    });

    it('should get recent payslips with limit', async () => {
      const payslips = await service.getRecentPayslips('user-123', 3);
      expect(payslips.length).toBeLessThanOrEqual(3);
    });

    it('should throw for unknown payslip', async () => {
      await expect(
        service.getPayslip('user-123', 'unknown-payslip')
      ).rejects.toThrow(NotFoundException);
    });

    it('should get payslip years', async () => {
      const years = await service.getPayslipYears('user-123');
      expect(Array.isArray(years)).toBe(true);
    });
  });

  describe('Documents', () => {
    it('should upload document', async () => {
      const doc = await service.uploadDocument('user-123', {
        type: DocumentType.CERTIFICATE,
        name: 'Work Certificate',
        fileUrl: 'https://storage.example.com/cert.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      expect(doc.id).toBeDefined();
      expect(doc.type).toBe(DocumentType.CERTIFICATE);
      expect(doc.name).toBe('Work Certificate');
    });

    it('should get documents', async () => {
      await service.uploadDocument('user-123', {
        type: DocumentType.CONTRACT,
        name: 'Employment Contract',
        fileUrl: 'https://storage.example.com/contract.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
      });

      const docs = await service.getDocuments('user-123');
      expect(docs.length).toBeGreaterThan(0);
    });

    it('should filter documents by type', async () => {
      await service.uploadDocument('user-123', {
        type: DocumentType.TRAINING_CERT,
        name: 'NestJS Training',
        fileUrl: 'https://storage.example.com/training.pdf',
        fileSize: 512,
        mimeType: 'application/pdf',
      });

      const trainingDocs = await service.getDocuments('user-123', DocumentType.TRAINING_CERT);
      expect(trainingDocs.every(d => d.type === DocumentType.TRAINING_CERT)).toBe(true);
    });

    it('should get specific document', async () => {
      const uploaded = await service.uploadDocument('user-123', {
        type: DocumentType.ID_DOCUMENT,
        name: 'ID Card',
        fileUrl: 'https://storage.example.com/id.pdf',
        fileSize: 256,
        mimeType: 'application/pdf',
      });

      const doc = await service.getDocument('user-123', uploaded.id);
      expect(doc.id).toBe(uploaded.id);
    });

    it('should throw for unauthorized document access', async () => {
      const uploaded = await service.uploadDocument('user-123', {
        type: DocumentType.OTHER,
        name: 'Test Doc',
        fileUrl: 'https://storage.example.com/test.pdf',
        fileSize: 128,
        mimeType: 'application/pdf',
      });

      // Different employee trying to access
      mockPrismaService.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        id: 'emp-other',
      });

      await expect(
        service.getDocument('user-other', uploaded.id)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Notifications', () => {
    it('should create notification', async () => {
      const notification = await service.createNotification(
        'emp-123',
        NotificationType.ANNOUNCEMENT,
        'Test Title',
        'Test Message',
        '/test-link',
      );

      expect(notification.id).toBeDefined();
      expect(notification.title).toBe('Test Title');
      expect(notification.read).toBe(false);
    });

    it('should get notifications', async () => {
      await service.createNotification(
        'emp-123',
        NotificationType.PAYSLIP_AVAILABLE,
        'Payslip Ready',
        'Your December payslip is available',
      );

      const notifications = await service.getNotifications('user-123');
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should get only unread notifications', async () => {
      await service.createNotification(
        'emp-123',
        NotificationType.LEAVE_APPROVED,
        'Leave Approved',
        'Your leave request has been approved',
      );

      const unread = await service.getUnreadNotifications('user-123');
      expect(unread.every(n => !n.read)).toBe(true);
    });

    it('should mark notification as read', async () => {
      const notification = await service.createNotification(
        'emp-123',
        NotificationType.DOCUMENT_UPLOADED,
        'Document Ready',
        'Your certificate is ready',
      );

      const marked = await service.markNotificationAsRead('user-123', notification.id);
      expect(marked.read).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      await service.createNotification('emp-123', NotificationType.ANNOUNCEMENT, 'Test 1', 'Message 1');
      await service.createNotification('emp-123', NotificationType.ANNOUNCEMENT, 'Test 2', 'Message 2');

      const count = await service.markAllNotificationsAsRead('user-123');
      expect(count).toBeGreaterThanOrEqual(2);

      const unread = await service.getUnreadNotifications('user-123');
      expect(unread.length).toBe(0);
    });
  });

  describe('Announcements', () => {
    it('should get active announcements', () => {
      const announcements = service.getActiveAnnouncements();

      expect(announcements.length).toBeGreaterThan(0);
      expect(announcements[0].title).toBeDefined();
    });

    it('should sort by priority', () => {
      const announcements = service.getActiveAnnouncements();

      // High priority should come first
      if (announcements.length > 1) {
        expect(['high', 'medium']).toContain(announcements[0].priority);
      }
    });
  });

  describe('Team', () => {
    it('should get team members', async () => {
      const team = await service.getTeamMembers('user-123');

      expect(Array.isArray(team)).toBe(true);
    });

    it('should return null for manager (not in current schema)', async () => {
      const manager = await service.getManager('user-123');

      // Manager hierarchy not implemented in current schema
      expect(manager).toBeNull();
    });

    it('should return empty array if no department', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        department: null,
      });

      const team = await service.getTeamMembers('user-123');
      expect(team).toEqual([]);
    });
  });

  describe('Statistics', () => {
    it('should get pending requests count', async () => {
      await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-05-05',
        endDate: '2025-05-09',
      });

      const count = await service.getPendingRequestsCount('user-123');
      expect(count).toBeGreaterThan(0);
    });

    it('should get portal statistics', async () => {
      const stats = await service.getPortalStatistics();

      expect(stats.totalEmployees).toBe(10);
      expect(stats.pendingLeaveRequests).toBeGreaterThanOrEqual(0);
      expect(stats.activeAnnouncements).toBeGreaterThan(0);
    });
  });

  describe('Working Days Calculation', () => {
    it('should calculate working days excluding weekends', async () => {
      // Monday to Friday = 5 working days
      const request = await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-01-06', // Monday
        endDate: '2025-01-10', // Friday
      });

      expect(request.workingDays).toBe(5);
    });

    it('should handle single day request', async () => {
      const request = await service.createLeaveRequest('user-123', {
        type: LeaveType.ANNUAL,
        startDate: '2025-01-06', // Monday
        endDate: '2025-01-06', // Same day
      });

      expect(request.workingDays).toBe(1);
    });
  });
});
