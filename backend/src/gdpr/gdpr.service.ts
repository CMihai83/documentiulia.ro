import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
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
  constructor(
    private prisma: PrismaService,
    private auditChain: AuditChainService,
  ) {}

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
    await this.auditChain.appendAudit({
        userId,
        action: 'DSR_REQUEST_CREATED',
        entity: 'DsrRequest',
        entityId: request.id,
        details: {
          type: dto.type,
          reason: dto.reason,
        },
        ipAddress,
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
    await this.auditChain.appendAudit({
        userId: adminId,
        action: 'DSR_REQUEST_UPDATED',
        entity: 'DsrRequest',
        entityId: id,
        details: {
          status: dto.status,
          previousStatus: request.status,
        },
      });

    // If approved and type is deletion, execute deletion
    if (dto.status === DsrStatus.APPROVED && request.type === DsrType.DATA_DELETION) {
      await this.deleteUserData(request.userId, request.id);
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
    await this.auditChain.appendAudit({
        userId,
        action: 'CONSENT_UPDATED',
        entity: 'Consent',
        entityId: consent.id,
        details: {
          purpose: dto.purpose,
          granted: dto.granted,
        },
        ipAddress,
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
        // Restricted (Art. 18 archived) records are excluded from the portability export.
        invoices: { where: { restrictedAt: null } },
        employees: { include: { payrolls: { where: { restrictedAt: null } } } },
        documents: { where: { restrictedAt: null } },
        vatReports: { where: { restrictedAt: null } },
        saftReports: { where: { restrictedAt: null } },
        aiQueries: true,
        auditLogs: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Strip credentials/secrets — security material is not the subject's portable
    // personal data (Art. 20 covers data the user provided/generated, never
    // password hashes or MFA seeds).
    const {
      password: _password,
      mfaSecret: _mfaSecret,
      mfaBackupCodes: _mfaBackupCodes,
      ...sanitizedUser
    } = user as any;

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
      note: 'Records restricted under a prior erasure request (Art. 18) are excluded. Copies of invoices already submitted to ANAF via e-Factura remain under ANAF control and are outside this export.',
    };
  }

  /**
   * GI-DSR-1 — retention-aware erasure (GDPR Art. 17 with the Art. 17(3)(b) legal-obligation carve-out).
   *
   * Decision matrix:
   *  - No retention duty (AI queries)          → hard delete.
   *  - Retention-bound (invoices, payroll, VAT/SAF-T, accounting docs) → RESTRICT
   *    (Art. 18 archive tier: set restrictedAt/reason), unless a legal hold applies → skip + report.
   *  - The person's records                     → anonymize person-identifying fields in place.
   *  - The user account                         → anonymize in place (FK anchor; login disabled), never deleted.
   *  - Audit log                                → NEVER touched (accountability, Art. 5(2)).
   */
  async deleteUserData(userId: string, requestId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employees: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const RESTRICTION_REASON = 'GDPR Art. 17 erasure request — retained under Art. 17(3)(b) legal obligation (Romanian tax/accounting retention)';
    const shortId = randomBytes(4).toString('hex');
    const anonEmail = `erased-${shortId}@anonymized.local`;
    const employeeIds = user.employees.map((e) => e.id);
    const report: Record<string, any> = { deleted: {}, restricted: {}, anonymized: {}, held: {} };

    await this.prisma.$transaction(async (tx) => {
      // (a) No retention duty → hard delete
      report.deleted.aiQueries = (await tx.aIQuery.deleteMany({ where: { userId } })).count;

      // (b) Retention-bound → restrict, honouring legal holds. Held rows are left untouched and reported.
      for (const [name, model] of [
        ['invoices', tx.invoice],
        ['documents', tx.document],
        ['vatReports', tx.vATReport],
        ['saftReports', tx.sAFTReport],
      ] as const) {
        const held = await (model as any).count({ where: { userId, legalHold: true } });
        if (held > 0) report.held[name] = held;
        report.restricted[name] = (await (model as any).updateMany({
          where: { userId, legalHold: false, restrictedAt: null },
          data: { restrictedAt: new Date(), restrictionReason: RESTRICTION_REASON },
        })).count;
      }
      // Payroll is keyed by employeeId
      if (employeeIds.length) {
        const heldPayroll = await tx.payroll.count({ where: { employeeId: { in: employeeIds }, legalHold: true } });
        if (heldPayroll > 0) report.held.payrolls = heldPayroll;
        report.restricted.payrolls = (await tx.payroll.updateMany({
          where: { employeeId: { in: employeeIds }, legalHold: false, restrictedAt: null },
          data: { restrictedAt: new Date(), restrictionReason: RESTRICTION_REASON },
        })).count;
      }

      // (c) Anonymize person-identifying fields on retained records (keep legally-required fields).
      //     Employees: name + CNP are payroll-required → keep; email/phone → anonymize.
      report.anonymized.employees = (await tx.employee.updateMany({
        where: { userId, anonymizedAt: null },
        data: { email: anonEmail, phone: null, anonymizedAt: new Date() },
      })).count;
      //     Partners: legal name + CUI + address stay (invoice validity); contact fields → anonymize.
      report.anonymized.partners = (await tx.partner.updateMany({
        where: { userId, anonymizedAt: null },
        data: { email: null, phone: null, contactPerson: null, bankAccount: null, anonymizedAt: new Date() },
      })).count;

      // (d) The user account → anonymize in place, disable login. Never deleted.
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonEmail,
          name: 'Erased User',
          address: null,
          password: randomBytes(24).toString('hex'), // unusable credential
          anonymizedAt: new Date(),
        },
      });
      report.anonymized.user = 1;
    });

    // (e) Accountability audit — appended to the immutable chain, never deleting prior entries.
    await this.auditChain.appendAudit({
      userId,
      action: 'GDPR_ERASURE',
      entity: 'User',
      entityId: userId,
      details: { erasureReport: report, requestId: requestId ?? null },
    });

    if (requestId) {
      await this.prisma.dSRRequest.update({ where: { id: requestId }, data: { erasureReport: report as any } }).catch(() => undefined);
    }

    return {
      success: true,
      message: 'Erasure processed: non-retained data deleted; retention-bound records restricted; identity anonymized.',
      gdprArticle: 'Article 17 - Right to Erasure (with Article 17(3)(b) legal-obligation retention)',
      processedAt: new Date().toISOString(),
      affectedUserId: userId,
      report,
      note: 'Records under Romanian tax/accounting retention (invoices, payroll, VAT/SAF-T) are restricted, not deleted. Copies already submitted to ANAF (e-Factura XML) cannot be erased and remain under ANAF control.',
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
