import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// Enums
export enum DocumentType {
  CONTRACT = 'CONTRACT',
  ADDENDUM = 'ADDENDUM',
  PAYSLIP = 'PAYSLIP',
  CERTIFICATE = 'CERTIFICATE',
  TRAINING_CERT = 'TRAINING_CERT',
  MEDICAL_CERT = 'MEDICAL_CERT',
  ID_DOCUMENT = 'ID_DOCUMENT',
  OTHER = 'OTHER',
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  MEDICAL = 'MEDICAL',
  UNPAID = 'UNPAID',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  CHILDCARE = 'CHILDCARE',
  BEREAVEMENT = 'BEREAVEMENT',
  MARRIAGE = 'MARRIAGE',
  STUDY = 'STUDY',
  SPECIAL = 'SPECIAL',
}

export enum LeaveRequestStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum DataUpdateStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum NotificationType {
  LEAVE_APPROVED = 'LEAVE_APPROVED',
  LEAVE_REJECTED = 'LEAVE_REJECTED',
  PAYSLIP_AVAILABLE = 'PAYSLIP_AVAILABLE',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DATA_UPDATE_APPROVED = 'DATA_UPDATE_APPROVED',
  CONTRACT_EXPIRING = 'CONTRACT_EXPIRING',
  BIRTHDAY_REMINDER = 'BIRTHDAY_REMINDER',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

// Interfaces
export interface EmployeeDashboard {
  employee: EmployeeProfile;
  leaveBalance: LeaveBalance;
  upcomingLeave: LeaveRequest[];
  recentPayslips: Payslip[];
  pendingRequests: number;
  notifications: EmployeeNotification[];
  announcements: Announcement[];
  quickActions: QuickAction[];
}

export interface EmployeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  hireDate: Date;
  manager?: { id: string; name: string };
  avatar?: string;
  employeeNumber: string;
}

export interface LeaveBalance {
  annual: { total: number; used: number; pending: number; available: number };
  medical: { used: number };
  unpaid: { used: number };
  special: { used: number };
  carryOver: number;
  expiresAt?: Date;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  reason?: string;
  status: LeaveRequestStatus;
  approver?: { id: string; name: string };
  approvedAt?: Date;
  rejectionReason?: string;
  replacement?: { id: string; name: string };
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  grossSalary: number;
  netSalary: number;
  taxes: {
    incomeTax: number;
    cas: number;
    cass: number;
  };
  deductions: PayslipDeduction[];
  bonuses: PayslipBonus[];
  workingDays: number;
  overtimeHours: number;
  pdfUrl?: string;
  generatedAt: Date;
  viewedAt?: Date;
}

export interface PayslipDeduction {
  type: string;
  description: string;
  amount: number;
}

export interface PayslipBonus {
  type: string;
  description: string;
  amount: number;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: DocumentType;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  expiresAt?: Date;
  isConfidential: boolean;
}

export interface DataUpdateRequest {
  id: string;
  employeeId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason?: string;
  status: DataUpdateStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

export interface EmployeeNotification {
  id: string;
  employeeId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  publishedAt: Date;
  expiresAt?: Date;
  author: string;
}

export interface QuickAction {
  id: string;
  label: string;
  labelEn: string;
  icon: string;
  url: string;
  color: string;
}

export interface TeamMember {
  id: string;
  name: string;
  position: string;
  avatar?: string;
  email: string;
  isManager: boolean;
  status: 'active' | 'on_leave' | 'remote';
}

// Default configuration
const DEFAULT_ANNUAL_LEAVE_DAYS = 21;
const LEAVE_TYPES_CONFIG: Record<LeaveType, { maxDays?: number; requiresApproval: boolean; requiresAttachment: boolean }> = {
  [LeaveType.ANNUAL]: { maxDays: 30, requiresApproval: true, requiresAttachment: false },
  [LeaveType.MEDICAL]: { requiresApproval: false, requiresAttachment: true },
  [LeaveType.UNPAID]: { requiresApproval: true, requiresAttachment: false },
  [LeaveType.MATERNITY]: { maxDays: 126, requiresApproval: true, requiresAttachment: true },
  [LeaveType.PATERNITY]: { maxDays: 15, requiresApproval: true, requiresAttachment: true },
  [LeaveType.CHILDCARE]: { maxDays: 730, requiresApproval: true, requiresAttachment: true },
  [LeaveType.BEREAVEMENT]: { maxDays: 5, requiresApproval: true, requiresAttachment: true },
  [LeaveType.MARRIAGE]: { maxDays: 5, requiresApproval: true, requiresAttachment: false },
  [LeaveType.STUDY]: { maxDays: 30, requiresApproval: true, requiresAttachment: true },
  [LeaveType.SPECIAL]: { requiresApproval: true, requiresAttachment: false },
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'leave-request', label: 'Cerere Concediu', labelEn: 'Leave Request', icon: 'calendar', url: '/portal/leave/new', color: 'blue' },
  { id: 'payslips', label: 'Fluturași Salariu', labelEn: 'Payslips', icon: 'document', url: '/portal/payslips', color: 'green' },
  { id: 'documents', label: 'Documente', labelEn: 'Documents', icon: 'folder', url: '/portal/documents', color: 'purple' },
  { id: 'profile', label: 'Profil', labelEn: 'Profile', icon: 'user', url: '/portal/profile', color: 'orange' },
  { id: 'team', label: 'Echipa Mea', labelEn: 'My Team', icon: 'users', url: '/portal/team', color: 'teal' },
  { id: 'help', label: 'Ajutor', labelEn: 'Help', icon: 'question', url: '/portal/help', color: 'gray' },
];

@Injectable()
export class EmployeePortalService {
  private readonly logger = new Logger(EmployeePortalService.name);

  // In-memory storage for demo
  private leaveRequests: Map<string, LeaveRequest> = new Map();
  private payslips: Map<string, Payslip> = new Map();
  private documents: Map<string, EmployeeDocument> = new Map();
  private dataUpdateRequests: Map<string, DataUpdateRequest> = new Map();
  private notifications: Map<string, EmployeeNotification> = new Map();
  private announcements: Map<string, Announcement> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Add sample announcements
    const announcement: Announcement = {
      id: 'ann-1',
      title: 'Bine ați venit pe noul portal!',
      content: 'Portalul pentru angajați a fost actualizat cu funcționalități noi. Explorați noile caracteristici!',
      priority: 'high',
      publishedAt: new Date(),
      author: 'HR Department',
    };
    this.announcements.set(announcement.id, announcement);
  }

  // =================== DASHBOARD ===================

  async getDashboard(userId: string): Promise<EmployeeDashboard> {
    const employee = await this.getEmployeeProfile(userId);
    const leaveBalance = await this.getLeaveBalance(userId);
    const upcomingLeave = await this.getUpcomingLeave(userId);
    const recentPayslips = await this.getRecentPayslips(userId, 3);
    const pendingRequests = await this.getPendingRequestsCount(userId);
    const notifications = await this.getUnreadNotifications(userId);
    const announcements = this.getActiveAnnouncements();

    return {
      employee,
      leaveBalance,
      upcomingLeave,
      recentPayslips,
      pendingRequests,
      notifications,
      announcements,
      quickActions: QUICK_ACTIONS,
    };
  }

  // =================== EMPLOYEE PROFILE ===================

  async getEmployeeProfile(userId: string): Promise<EmployeeProfile> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    // Manager would be determined by organization structure in a full implementation
    const manager: { id: string; name: string } | undefined = undefined;

    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: undefined, // Not in current schema
      position: employee.position,
      department: employee.department || 'N/A',
      hireDate: employee.hireDate,
      manager,
      avatar: undefined,
      employeeNumber: employee.id.substring(0, 8).toUpperCase(),
    };
  }

  async updateProfile(userId: string, updates: Partial<{ phone: string; address: string; emergencyContact: string }>): Promise<DataUpdateRequest[]> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const requests: DataUpdateRequest[] = [];

    for (const [field, newValue] of Object.entries(updates)) {
      if (newValue !== undefined) {
        const oldValue = (employee as Record<string, any>)[field] || '';

        const request: DataUpdateRequest = {
          id: `dur_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          employeeId: employee.id,
          fieldName: field,
          oldValue: String(oldValue),
          newValue: String(newValue),
          status: DataUpdateStatus.PENDING,
          createdAt: new Date(),
        };

        this.dataUpdateRequests.set(request.id, request);
        requests.push(request);
      }
    }

    this.logger.log(`Profile update requests created for employee ${employee.id}`);
    return requests;
  }

  // =================== LEAVE MANAGEMENT ===================

  async getLeaveBalance(userId: string): Promise<LeaveBalance> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Calculate used leave from requests
    const approvedLeave = Array.from(this.leaveRequests.values())
      .filter(lr => lr.employeeId === employee.id && lr.status === LeaveRequestStatus.APPROVED);

    const pendingLeave = Array.from(this.leaveRequests.values())
      .filter(lr => lr.employeeId === employee.id && lr.status === LeaveRequestStatus.PENDING);

    const annualUsed = approvedLeave
      .filter(lr => lr.type === LeaveType.ANNUAL)
      .reduce((sum, lr) => sum + lr.workingDays, 0);

    const annualPending = pendingLeave
      .filter(lr => lr.type === LeaveType.ANNUAL)
      .reduce((sum, lr) => sum + lr.workingDays, 0);

    const medicalUsed = approvedLeave
      .filter(lr => lr.type === LeaveType.MEDICAL)
      .reduce((sum, lr) => sum + lr.workingDays, 0);

    const unpaidUsed = approvedLeave
      .filter(lr => lr.type === LeaveType.UNPAID)
      .reduce((sum, lr) => sum + lr.workingDays, 0);

    const specialUsed = approvedLeave
      .filter(lr => [LeaveType.BEREAVEMENT, LeaveType.MARRIAGE, LeaveType.STUDY].includes(lr.type))
      .reduce((sum, lr) => sum + lr.workingDays, 0);

    const totalAnnual = DEFAULT_ANNUAL_LEAVE_DAYS;

    return {
      annual: {
        total: totalAnnual,
        used: annualUsed,
        pending: annualPending,
        available: totalAnnual - annualUsed - annualPending,
      },
      medical: { used: medicalUsed },
      unpaid: { used: unpaidUsed },
      special: { used: specialUsed },
      carryOver: 0,
      expiresAt: new Date(new Date().getFullYear() + 1, 2, 31), // March 31 next year
    };
  }

  async createLeaveRequest(
    userId: string,
    data: {
      type: LeaveType;
      startDate: string;
      endDate: string;
      reason?: string;
      replacementId?: string;
      attachments?: string[];
    },
  ): Promise<LeaveRequest> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Calculate working days
    const workingDays = this.calculateWorkingDays(startDate, endDate);

    // Validate leave type constraints
    const config = LEAVE_TYPES_CONFIG[data.type];
    if (config.maxDays && workingDays > config.maxDays) {
      throw new BadRequestException(`Maximum ${config.maxDays} days allowed for this leave type`);
    }

    if (config.requiresAttachment && (!data.attachments || data.attachments.length === 0)) {
      throw new BadRequestException('This leave type requires supporting documents');
    }

    // Check leave balance for annual leave
    if (data.type === LeaveType.ANNUAL) {
      const balance = await this.getLeaveBalance(userId);
      if (workingDays > balance.annual.available) {
        throw new BadRequestException(`Insufficient leave balance. Available: ${balance.annual.available} days`);
      }
    }

    // Get replacement info if provided
    let replacement: { id: string; name: string } | undefined;
    if (data.replacementId) {
      const replacementEmployee = await this.prisma.employee.findUnique({
        where: { id: data.replacementId },
      });
      if (replacementEmployee) {
        replacement = {
          id: replacementEmployee.id,
          name: `${replacementEmployee.firstName} ${replacementEmployee.lastName}`,
        };
      }
    }

    const id = `lr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const leaveRequest: LeaveRequest = {
      id,
      employeeId: employee.id,
      type: data.type,
      startDate,
      endDate,
      workingDays,
      reason: data.reason,
      status: config.requiresApproval ? LeaveRequestStatus.PENDING : LeaveRequestStatus.APPROVED,
      replacement,
      attachments: data.attachments || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Auto-approve medical leave
    if (!config.requiresApproval) {
      leaveRequest.approvedAt = new Date();
    }

    this.leaveRequests.set(id, leaveRequest);
    this.logger.log(`Leave request created: ${id} for employee ${employee.id}`);

    // Notification would be created for manager in a full implementation
    // For now, we skip manager notification as managerId is not in schema

    return leaveRequest;
  }

  async getLeaveRequests(userId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    let requests = Array.from(this.leaveRequests.values())
      .filter(lr => lr.employeeId === employee.id);

    if (status) {
      requests = requests.filter(lr => lr.status === status);
    }

    return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUpcomingLeave(userId: string): Promise<LeaveRequest[]> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      return [];
    }

    const now = new Date();
    return Array.from(this.leaveRequests.values())
      .filter(lr =>
        lr.employeeId === employee.id &&
        lr.status === LeaveRequestStatus.APPROVED &&
        lr.startDate >= now
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 5);
  }

  async cancelLeaveRequest(userId: string, requestId: string): Promise<LeaveRequest> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const request = this.leaveRequests.get(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.employeeId !== employee.id) {
      throw new ForbiddenException('Not authorized to cancel this request');
    }

    if (request.status === LeaveRequestStatus.CANCELLED) {
      throw new BadRequestException('Request is already cancelled');
    }

    if (request.status === LeaveRequestStatus.APPROVED && request.startDate <= new Date()) {
      throw new BadRequestException('Cannot cancel leave that has already started');
    }

    request.status = LeaveRequestStatus.CANCELLED;
    request.updatedAt = new Date();
    this.leaveRequests.set(requestId, request);

    return request;
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  // =================== PAYSLIPS ===================

  async getPayslips(userId: string, year?: number): Promise<Payslip[]> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    let payslips = Array.from(this.payslips.values())
      .filter(p => p.employeeId === employee.id);

    if (year) {
      payslips = payslips.filter(p => p.year === year);
    }

    return payslips.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }

  async getRecentPayslips(userId: string, limit: number = 3): Promise<Payslip[]> {
    const payslips = await this.getPayslips(userId);
    return payslips.slice(0, limit);
  }

  async getPayslip(userId: string, payslipId: string): Promise<Payslip> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const payslip = this.payslips.get(payslipId);
    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    if (payslip.employeeId !== employee.id) {
      throw new ForbiddenException('Not authorized to view this payslip');
    }

    // Mark as viewed
    if (!payslip.viewedAt) {
      payslip.viewedAt = new Date();
      this.payslips.set(payslipId, payslip);
    }

    return payslip;
  }

  async downloadPayslip(userId: string, payslipId: string): Promise<{ url: string; filename: string }> {
    const payslip = await this.getPayslip(userId, payslipId);

    const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const filename = `Fluturas_${monthNames[payslip.month - 1]}_${payslip.year}.pdf`;

    return {
      url: payslip.pdfUrl || `/api/payslips/${payslipId}/pdf`,
      filename,
    };
  }

  async getPayslipYears(userId: string): Promise<number[]> {
    const payslips = await this.getPayslips(userId);
    const years = new Set(payslips.map(p => p.year));
    return Array.from(years).sort((a, b) => b - a);
  }

  // =================== DOCUMENTS ===================

  async getDocuments(userId: string, type?: DocumentType): Promise<EmployeeDocument[]> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    let docs = Array.from(this.documents.values())
      .filter(d => d.employeeId === employee.id);

    if (type) {
      docs = docs.filter(d => d.type === type);
    }

    return docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async getDocument(userId: string, documentId: string): Promise<EmployeeDocument> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    if (doc.employeeId !== employee.id) {
      throw new ForbiddenException('Not authorized to view this document');
    }

    return doc;
  }

  async uploadDocument(
    userId: string,
    data: {
      type: DocumentType;
      name: string;
      description?: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    },
  ): Promise<EmployeeDocument> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const id = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const document: EmployeeDocument = {
      id,
      employeeId: employee.id,
      type: data.type,
      name: data.name,
      description: data.description,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedAt: new Date(),
      isConfidential: false,
    };

    this.documents.set(id, document);
    this.logger.log(`Document uploaded: ${id} for employee ${employee.id}`);

    return document;
  }

  // =================== NOTIFICATIONS ===================

  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<EmployeeNotification[]> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      return [];
    }

    let notifications = Array.from(this.notifications.values())
      .filter(n => n.employeeId === employee.id);

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUnreadNotifications(userId: string): Promise<EmployeeNotification[]> {
    return this.getNotifications(userId, true);
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<EmployeeNotification> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.employeeId !== employee.id) {
      throw new ForbiddenException('Not authorized');
    }

    notification.read = true;
    this.notifications.set(notificationId, notification);

    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    let count = 0;
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.employeeId === employee.id && !notification.read) {
        notification.read = true;
        this.notifications.set(id, notification);
        count++;
      }
    }

    return count;
  }

  async createNotification(
    employeeId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ): Promise<EmployeeNotification> {
    const id = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const notification: EmployeeNotification = {
      id,
      employeeId,
      type,
      title,
      message,
      link,
      read: false,
      createdAt: new Date(),
    };

    this.notifications.set(id, notification);
    return notification;
  }

  // =================== ANNOUNCEMENTS ===================

  getActiveAnnouncements(): Announcement[] {
    const now = new Date();
    return Array.from(this.announcements.values())
      .filter(a => !a.expiresAt || a.expiresAt > now)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  // =================== TEAM ===================

  async getTeamMembers(userId: string): Promise<TeamMember[]> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee || !employee.department) {
      return [];
    }

    const teamMembers = await this.prisma.employee.findMany({
      where: {
        department: employee.department,
        status: 'ACTIVE',
      },
      take: 20,
    });

    return teamMembers.map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      position: m.position,
      email: m.email,
      isManager: false, // Would be determined by org structure
      status: 'active' as const,
    }));
  }

  async getManager(userId: string): Promise<TeamMember | null> {
    // In the current schema, there's no managerId field
    // This would be implemented with an organization hierarchy
    return null;
  }

  // =================== STATISTICS ===================

  async getPendingRequestsCount(userId: string): Promise<number> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      return 0;
    }

    const pendingLeave = Array.from(this.leaveRequests.values())
      .filter(lr => lr.employeeId === employee.id && lr.status === LeaveRequestStatus.PENDING)
      .length;

    const pendingDataUpdates = Array.from(this.dataUpdateRequests.values())
      .filter(dur => dur.employeeId === employee.id && dur.status === DataUpdateStatus.PENDING)
      .length;

    return pendingLeave + pendingDataUpdates;
  }

  async getPortalStatistics(): Promise<{
    totalEmployees: number;
    pendingLeaveRequests: number;
    pendingDataUpdates: number;
    activeAnnouncements: number;
  }> {
    const totalEmployees = await this.prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    return {
      totalEmployees,
      pendingLeaveRequests: Array.from(this.leaveRequests.values())
        .filter(lr => lr.status === LeaveRequestStatus.PENDING).length,
      pendingDataUpdates: Array.from(this.dataUpdateRequests.values())
        .filter(dur => dur.status === DataUpdateStatus.PENDING).length,
      activeAnnouncements: this.getActiveAnnouncements().length,
    };
  }
}
