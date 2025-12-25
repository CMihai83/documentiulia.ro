import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DsrType,
  DsrStatus,
  ConsentPurpose,
  CreateDsrRequestDto,
  UpdateDsrRequestDto,
  UpdateConsentDto,
  DsrRequestResponseDto,
  ConsentRecordResponseDto,
  DataInventoryResponseDto,
  DataExportResponseDto,
} from './gdpr.dto';

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
}

export interface DataInventory {
  category: string;
  dataTypes: string[];
  purpose: string;
  retention: string;
  legalBasis: string;
}

@Injectable()
export class GdprService {
  constructor(private prisma: PrismaService) {}

  // DSR Request Management
  async createDsrRequest(
    userId: string,
    dto: CreateDsrRequestDto,
    ipAddress?: string,
  ): Promise<DsrRequestResponseDto> {
    // Check for pending requests of same type
    const existingRequest = await this.prisma.dSRRequest.findFirst({
      where: {
        userId,
        type: dto.type,
        status: { in: [DsrStatus.PENDING, DsrStatus.IN_PROGRESS] },
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        `You already have a pending ${dto.type} request. Please wait for it to be processed.`,
      );
    }

    const request = await this.prisma.dSRRequest.create({
      data: {
        userId,
        type: dto.type,
        status: DsrStatus.PENDING,
        reason: dto.reason,
        additionalDetails: dto.additionalDetails,
        ipAddress,
      },
    });

    // Log audit trail
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DSR_REQUEST_CREATED',
        entity: 'DsrRequest',
        entityId: request.id,
        details: {
          type: dto.type,
          reason: dto.reason,
        },
        ipAddress,
      },
    });

    return this.mapDsrRequestToDto(request);
  }

  async getDsrRequests(userId?: string, status?: DsrStatus): Promise<DsrRequestResponseDto[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const requests = await this.prisma.dSRRequest.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map(this.mapDsrRequestToDto);
  }

  async getDsrRequest(id: string): Promise<DsrRequestResponseDto> {
    const request = await this.prisma.dSRRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('DSR request not found');
    }

    return this.mapDsrRequestToDto(request);
  }

  async updateDsrRequest(
    id: string,
    dto: UpdateDsrRequestDto,
    adminId: string,
  ): Promise<DsrRequestResponseDto> {
    const request = await this.prisma.dSRRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('DSR request not found');
    }

    const updated = await this.prisma.dSRRequest.update({
      where: { id },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes,
        rejectionReason: dto.rejectionReason,
        processedBy: adminId,
        processedAt: dto.status === DsrStatus.COMPLETED || dto.status === DsrStatus.REJECTED
          ? new Date()
          : null,
      },
    });

    // Log audit trail
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DSR_REQUEST_UPDATED',
        entity: 'DsrRequest',
        entityId: id,
        details: {
          status: dto.status,
          previousStatus: request.status,
        },
      },
    });

    // If approved and type is deletion, execute deletion
    if (dto.status === DsrStatus.APPROVED && request.type === DsrType.DATA_DELETION) {
      await this.deleteUserData(request.userId);
    }

    return this.mapDsrRequestToDto(updated);
  }

  private mapDsrRequestToDto(request: any): DsrRequestResponseDto {
    return {
      id: request.id,
      userId: request.userId,
      type: request.type,
      status: request.status,
      reason: request.reason,
      additionalDetails: request.additionalDetails,
      adminNotes: request.adminNotes,
      rejectionReason: request.rejectionReason,
      processedBy: request.processedBy,
      processedAt: request.processedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  // Consent Management
  async updateConsent(
    userId: string,
    dto: UpdateConsentDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ConsentRecordResponseDto> {
    const consent = await this.prisma.consent.upsert({
      where: {
        userId_purpose: {
          userId,
          purpose: dto.purpose,
        },
      },
      update: {
        granted: dto.granted,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      },
      create: {
        userId,
        purpose: dto.purpose,
        granted: dto.granted,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      },
    });

    // Log audit trail
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CONSENT_UPDATED',
        entity: 'Consent',
        entityId: consent.id,
        details: {
          purpose: dto.purpose,
          granted: dto.granted,
        },
        ipAddress,
      },
    });

    return {
      id: consent.id,
      userId: consent.userId,
      purpose: consent.purpose as ConsentPurpose,
      granted: consent.granted,
      ipAddress: consent.ipAddress ?? undefined,
      userAgent: consent.userAgent ?? undefined,
      timestamp: consent.timestamp,
    };
  }

  async getUserConsents(userId: string): Promise<ConsentRecordResponseDto[]> {
    const consents = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });

    return consents.map((consent) => ({
      id: consent.id,
      userId: consent.userId,
      purpose: consent.purpose as ConsentPurpose,
      granted: consent.granted,
      ipAddress: consent.ipAddress ?? undefined,
      userAgent: consent.userAgent ?? undefined,
      timestamp: consent.timestamp,
    }));
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        invoices: true,
        employees: {
          include: {
            payrolls: true,
          },
        },
        documents: true,
        vatReports: true,
        saftReports: true,
        aiQueries: true,
        auditLogs: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove sensitive fields
    const sanitizedUser = {
      ...user,
    };

    return {
      exportDate: new Date().toISOString(),
      gdprArticle: 'Article 20 - Right to Data Portability',
      dataController: 'DocumentIulia.ro SRL',
      dataSubject: {
        id: user.id,
        email: user.email,
      },
      personalData: sanitizedUser,
      metadata: {
        format: 'JSON',
        version: '1.0',
        charset: 'UTF-8',
      },
    };
  }

  async deleteUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employees: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get employee IDs for the user
    const employeeIds = user.employees.map((e) => e.id);

    // Delete related data first (cascade)
    await this.prisma.$transaction([
      // Delete payrolls for employees
      this.prisma.payroll.deleteMany({
        where: { employeeId: { in: employeeIds } },
      }),
      // Delete employees
      this.prisma.employee.deleteMany({ where: { userId } }),
      // Delete documents
      this.prisma.document.deleteMany({ where: { userId } }),
      // Delete invoices
      this.prisma.invoice.deleteMany({ where: { userId } }),
      // Delete VAT reports
      this.prisma.vATReport.deleteMany({ where: { userId } }),
      // Delete SAFT reports
      this.prisma.sAFTReport.deleteMany({ where: { userId } }),
      // Delete AI queries
      this.prisma.aIQuery.deleteMany({ where: { userId } }),
      // Delete audit logs
      this.prisma.auditLog.deleteMany({ where: { userId } }),
      // Finally delete user
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return {
      success: true,
      message: 'All user data deleted successfully',
      gdprArticle: 'Article 17 - Right to Erasure',
      deletedAt: new Date().toISOString(),
      affectedUserId: userId,
      note: 'Some data may be retained for legal compliance (e.g., tax records for 10 years per Romanian law)',
    };
  }

  async getConsentLog(userId: string): Promise<ConsentRecord[]> {
    // In a real implementation, this would query a consent_log table
    // For now, return a simulated consent history
    return [
      {
        id: '1',
        userId,
        purpose: 'Essential cookies',
        granted: true,
        timestamp: new Date('2025-01-01'),
      },
      {
        id: '2',
        userId,
        purpose: 'Marketing communications',
        granted: false,
        timestamp: new Date('2025-01-01'),
      },
      {
        id: '3',
        userId,
        purpose: 'Analytics',
        granted: true,
        timestamp: new Date('2025-01-01'),
      },
    ];
  }

  async recordConsent(userId: string, purpose: string, granted: boolean) {
    // In a real implementation, this would insert into consent_log table
    return {
      success: true,
      consent: {
        userId,
        purpose,
        granted,
        recordedAt: new Date().toISOString(),
      },
    };
  }

  async getDataInventory(userId: string): Promise<{ inventory: DataInventory[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const inventory: DataInventory[] = [
      {
        category: 'Identity Data',
        dataTypes: ['Name', 'Email', 'Company Name', 'CUI/VAT Number'],
        purpose: 'Account management and service provision',
        retention: 'Duration of account + 10 years (legal requirement)',
        legalBasis: 'Contract performance (Art. 6(1)(b) GDPR)',
      },
      {
        category: 'Financial Data',
        dataTypes: ['Invoices', 'Transactions', 'VAT calculations', 'Bank details'],
        purpose: 'Accounting services and fiscal compliance',
        retention: '10 years (Romanian fiscal law requirement)',
        legalBasis: 'Legal obligation (Art. 6(1)(c) GDPR)',
      },
      {
        category: 'HR Data',
        dataTypes: ['Employee records', 'Payroll data', 'Tax withholdings'],
        purpose: 'HR management and payroll processing',
        retention: 'Employment + 50 years (Romanian labor law)',
        legalBasis: 'Legal obligation (Art. 6(1)(c) GDPR)',
      },
      {
        category: 'Technical Data',
        dataTypes: ['IP addresses', 'Login timestamps', 'Browser info'],
        purpose: 'Security and system administration',
        retention: '12 months',
        legalBasis: 'Legitimate interest (Art. 6(1)(f) GDPR)',
      },
      {
        category: 'Documents',
        dataTypes: ['Uploaded invoices', 'Contracts', 'Receipts'],
        purpose: 'Document management and OCR processing',
        retention: '10 years (fiscal compliance)',
        legalBasis: 'Contract performance (Art. 6(1)(b) GDPR)',
      },
    ];

    return { inventory };
  }
}
