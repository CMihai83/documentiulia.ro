import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Document Types
export enum QualityDocumentType {
  PROCEDURE = 'procedure',
  WORK_INSTRUCTION = 'work_instruction',
  SPECIFICATION = 'specification',
  STANDARD = 'standard',
  FORM = 'form',
  TEMPLATE = 'template',
  POLICY = 'policy',
  MANUAL = 'manual',
  DRAWING = 'drawing',
  CERTIFICATE = 'certificate',
  AUDIT_REPORT = 'audit_report',
  INSPECTION_RECORD = 'inspection_record',
  CALIBRATION_RECORD = 'calibration_record',
  TRAINING_RECORD = 'training_record',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  UNDER_REVIEW = 'under_review',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  RELEASED = 'released',
  OBSOLETE = 'obsolete',
  ARCHIVED = 'archived',
}

export enum CertificationType {
  ISO_9001 = 'iso_9001',
  ISO_14001 = 'iso_14001',
  ISO_45001 = 'iso_45001',
  ISO_27001 = 'iso_27001',
  IATF_16949 = 'iatf_16949',
  AS9100 = 'as9100',
  CE_MARK = 'ce_mark',
  UL = 'ul',
  FDA = 'fda',
  ROHS = 'rohs',
  REACH = 'reach',
  SUPPLIER = 'supplier',
  PRODUCT = 'product',
  CALIBRATION = 'calibration',
  TRAINING = 'training',
  OTHER = 'other',
}

export enum CertificationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  WITHDRAWN = 'withdrawn',
  RENEWED = 'renewed',
}

// Interfaces
export interface QualityDocument {
  id: string;
  tenantId: string;
  documentNumber: string;
  title: string;
  type: QualityDocumentType;
  status: DocumentStatus;
  version: string;
  revision: number;
  description?: string;
  category?: string;
  subcategory?: string;
  department?: string;
  processId?: string;
  processName?: string;

  // Content
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  content?: string;

  // Ownership
  authorId: string;
  authorName: string;
  ownerId: string;
  ownerName: string;
  reviewerId?: string;
  reviewerName?: string;
  approverId?: string;
  approverName?: string;

  // Approval workflow
  reviewComments?: string;
  reviewedAt?: Date;
  approvalComments?: string;
  approvedAt?: Date;
  releasedAt?: Date;
  releasedBy?: string;
  releasedByName?: string;

  // Dates
  effectiveDate?: Date;
  expiryDate?: Date;
  nextReviewDate?: Date;

  // Tracking
  accessLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  distributionList?: string[];
  revisionHistory: DocumentRevision[];
  relatedDocuments?: string[];
  supersededBy?: string;
  supersedes?: string;
  attachmentIds?: string[];
  tags?: string[];
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentRevision {
  revision: number;
  version: string;
  changedBy: string;
  changedByName: string;
  changedAt: Date;
  changeDescription: string;
  previousVersion?: string;
}

export interface Certification {
  id: string;
  tenantId: string;
  certificateNumber: string;
  type: CertificationType;
  status: CertificationStatus;
  name: string;
  description?: string;

  // Scope
  scope: string;
  standards?: string[];
  products?: string[];
  processes?: string[];
  locations?: string[];

  // Issuer
  issuingBody: string;
  issuingBodyId?: string;
  accreditationNumber?: string;

  // Dates
  issueDate: Date;
  effectiveDate: Date;
  expiryDate: Date;
  lastAuditDate?: Date;
  nextAuditDate?: Date;

  // Documents
  certificateFileId?: string;
  certificateFileName?: string;
  attachmentIds?: string[];

  // Related
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  equipmentId?: string;
  equipmentName?: string;
  employeeId?: string;
  employeeName?: string;

  // Audit history
  auditHistory: CertificationAudit[];
  renewalHistory: CertificationRenewal[];

  tags?: string[];
  notes?: string;
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export interface CertificationAudit {
  id: string;
  auditDate: Date;
  auditType: 'initial' | 'surveillance' | 'recertification' | 'special';
  auditorName: string;
  auditorOrg?: string;
  findings: string;
  nonConformities: number;
  result: 'pass' | 'conditional' | 'fail';
  reportFileId?: string;
}

export interface CertificationRenewal {
  id: string;
  renewalDate: Date;
  previousExpiryDate: Date;
  newExpiryDate: Date;
  renewedBy: string;
  renewedByName: string;
  notes?: string;
}

// DTOs
export interface CreateDocumentDto {
  title: string;
  type: QualityDocumentType;
  description?: string;
  category?: string;
  subcategory?: string;
  department?: string;
  processId?: string;
  processName?: string;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  content?: string;
  authorId: string;
  authorName: string;
  ownerId: string;
  ownerName: string;
  accessLevel: QualityDocument['accessLevel'];
  distributionList?: string[];
  effectiveDate?: Date;
  expiryDate?: Date;
  nextReviewDate?: Date;
  tags?: string[];
}

export interface UpdateDocumentDto {
  title?: string;
  description?: string;
  content?: string;
  fileId?: string;
  fileName?: string;
  category?: string;
  subcategory?: string;
  department?: string;
  accessLevel?: QualityDocument['accessLevel'];
  distributionList?: string[];
  effectiveDate?: Date;
  expiryDate?: Date;
  nextReviewDate?: Date;
  tags?: string[];
}

export interface SubmitForReviewDto {
  reviewerId: string;
  reviewerName: string;
  notes?: string;
}

export interface ReviewDocumentDto {
  approved: boolean;
  comments: string;
  changesRequired?: string;
}

export interface ApproveDocumentDto {
  approved: boolean;
  comments: string;
  effectiveDate?: Date;
}

export interface ReviseDocumentDto {
  changeDescription: string;
  content?: string;
  fileId?: string;
  fileName?: string;
  revisedBy: string;
  revisedByName: string;
}

export interface CreateCertificationDto {
  type: CertificationType;
  name: string;
  description?: string;
  scope: string;
  standards?: string[];
  products?: string[];
  processes?: string[];
  locations?: string[];
  issuingBody: string;
  issuingBodyId?: string;
  accreditationNumber?: string;
  issueDate: Date;
  effectiveDate: Date;
  expiryDate: Date;
  certificateFileId?: string;
  certificateFileName?: string;
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  equipmentId?: string;
  equipmentName?: string;
  employeeId?: string;
  employeeName?: string;
  tags?: string[];
  notes?: string;
}

export interface RecordAuditDto {
  auditDate: Date;
  auditType: CertificationAudit['auditType'];
  auditorName: string;
  auditorOrg?: string;
  findings: string;
  nonConformities: number;
  result: CertificationAudit['result'];
  reportFileId?: string;
}

export interface RenewCertificationDto {
  newExpiryDate: Date;
  renewedBy: string;
  renewedByName: string;
  certificateFileId?: string;
  certificateFileName?: string;
  notes?: string;
}

@Injectable()
export class QualityDocumentsService {
  private documents = new Map<string, QualityDocument>();
  private certifications = new Map<string, Certification>();
  private docCounter = new Map<string, number>();
  private certCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Document Operations
  async createDocument(
    tenantId: string,
    dto: CreateDocumentDto,
  ): Promise<QualityDocument> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const documentNumber = await this.generateDocumentNumber(tenantId, dto.type);

    const document: QualityDocument = {
      id,
      tenantId,
      documentNumber,
      title: dto.title,
      type: dto.type,
      status: DocumentStatus.DRAFT,
      version: '1.0',
      revision: 0,
      description: dto.description,
      category: dto.category,
      subcategory: dto.subcategory,
      department: dto.department,
      processId: dto.processId,
      processName: dto.processName,
      fileId: dto.fileId,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      fileMimeType: dto.fileMimeType,
      content: dto.content,
      authorId: dto.authorId,
      authorName: dto.authorName,
      ownerId: dto.ownerId,
      ownerName: dto.ownerName,
      accessLevel: dto.accessLevel,
      distributionList: dto.distributionList,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      nextReviewDate: dto.nextReviewDate ? new Date(dto.nextReviewDate) : undefined,
      tags: dto.tags,
      revisionHistory: [
        {
          revision: 0,
          version: '1.0',
          changedBy: dto.authorId,
          changedByName: dto.authorName,
          changedAt: new Date(),
          changeDescription: 'Initial creation',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.documents.set(id, document);

    this.eventEmitter.emit('quality.document.created', {
      tenantId,
      documentId: id,
      type: dto.type,
    });

    return document;
  }

  async updateDocument(
    tenantId: string,
    documentId: string,
    dto: UpdateDocumentDto,
  ): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be updated directly');
    }

    Object.assign(document, {
      ...dto,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : document.effectiveDate,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : document.expiryDate,
      nextReviewDate: dto.nextReviewDate ? new Date(dto.nextReviewDate) : document.nextReviewDate,
      updatedAt: new Date(),
    });

    this.documents.set(documentId, document);

    return document;
  }

  async submitForReview(
    tenantId: string,
    documentId: string,
    dto: SubmitForReviewDto,
  ): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be submitted for review');
    }

    document.status = DocumentStatus.PENDING_REVIEW;
    document.reviewerId = dto.reviewerId;
    document.reviewerName = dto.reviewerName;
    document.metadata = { ...document.metadata, reviewNotes: dto.notes };
    document.updatedAt = new Date();

    this.documents.set(documentId, document);

    this.eventEmitter.emit('quality.document.submitted_for_review', {
      tenantId,
      documentId,
      reviewerId: dto.reviewerId,
    });

    return document;
  }

  async startReview(tenantId: string, documentId: string): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    if (document.status !== DocumentStatus.PENDING_REVIEW) {
      throw new BadRequestException('Document is not pending review');
    }

    document.status = DocumentStatus.UNDER_REVIEW;
    document.updatedAt = new Date();

    this.documents.set(documentId, document);

    return document;
  }

  async completeReview(
    tenantId: string,
    documentId: string,
    dto: ReviewDocumentDto,
  ): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    if (document.status !== DocumentStatus.UNDER_REVIEW) {
      throw new BadRequestException('Document is not under review');
    }

    document.reviewComments = dto.comments;
    document.reviewedAt = new Date();

    if (dto.approved) {
      document.status = DocumentStatus.PENDING_APPROVAL;
      this.eventEmitter.emit('quality.document.review_passed', {
        tenantId,
        documentId,
      });
    } else {
      document.status = DocumentStatus.DRAFT;
      document.metadata = { ...document.metadata, changesRequired: dto.changesRequired };
      this.eventEmitter.emit('quality.document.review_rejected', {
        tenantId,
        documentId,
        changesRequired: dto.changesRequired,
      });
    }

    document.updatedAt = new Date();
    this.documents.set(documentId, document);

    return document;
  }

  async approveDocument(
    tenantId: string,
    documentId: string,
    approverId: string,
    approverName: string,
    dto: ApproveDocumentDto,
  ): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    if (document.status !== DocumentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Document is not pending approval');
    }

    document.approverId = approverId;
    document.approverName = approverName;
    document.approvalComments = dto.comments;
    document.approvedAt = new Date();

    if (dto.approved) {
      document.status = DocumentStatus.APPROVED;
      if (dto.effectiveDate) {
        document.effectiveDate = new Date(dto.effectiveDate);
      }
      this.eventEmitter.emit('quality.document.approved', {
        tenantId,
        documentId,
      });
    } else {
      document.status = DocumentStatus.DRAFT;
      this.eventEmitter.emit('quality.document.approval_rejected', {
        tenantId,
        documentId,
        comments: dto.comments,
      });
    }

    document.updatedAt = new Date();
    this.documents.set(documentId, document);

    return document;
  }

  async releaseDocument(
    tenantId: string,
    documentId: string,
    releasedBy: string,
    releasedByName: string,
  ): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    if (document.status !== DocumentStatus.APPROVED) {
      throw new BadRequestException('Only approved documents can be released');
    }

    document.status = DocumentStatus.RELEASED;
    document.releasedAt = new Date();
    document.releasedBy = releasedBy;
    document.releasedByName = releasedByName;
    document.updatedAt = new Date();

    this.documents.set(documentId, document);

    this.eventEmitter.emit('quality.document.released', {
      tenantId,
      documentId,
      distributionList: document.distributionList,
    });

    return document;
  }

  async reviseDocument(
    tenantId: string,
    documentId: string,
    dto: ReviseDocumentDto,
  ): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    if (document.status !== DocumentStatus.RELEASED) {
      throw new BadRequestException('Only released documents can be revised');
    }

    const newRevision = document.revision + 1;
    const versionParts = document.version.split('.');
    const newVersion = `${versionParts[0]}.${newRevision}`;

    // Record revision history
    document.revisionHistory.push({
      revision: newRevision,
      version: newVersion,
      changedBy: dto.revisedBy,
      changedByName: dto.revisedByName,
      changedAt: new Date(),
      changeDescription: dto.changeDescription,
      previousVersion: document.version,
    });

    document.revision = newRevision;
    document.version = newVersion;
    document.status = DocumentStatus.DRAFT;

    if (dto.content) {
      document.content = dto.content;
    }
    if (dto.fileId) {
      document.fileId = dto.fileId;
      document.fileName = dto.fileName;
    }

    document.updatedAt = new Date();
    this.documents.set(documentId, document);

    this.eventEmitter.emit('quality.document.revised', {
      tenantId,
      documentId,
      newVersion,
      changeDescription: dto.changeDescription,
    });

    return document;
  }

  async obsoleteDocument(
    tenantId: string,
    documentId: string,
    supersededBy?: string,
    reason?: string,
  ): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    document.status = DocumentStatus.OBSOLETE;
    document.supersededBy = supersededBy;
    document.metadata = { ...document.metadata, obsoleteReason: reason };
    document.updatedAt = new Date();

    this.documents.set(documentId, document);

    this.eventEmitter.emit('quality.document.obsoleted', {
      tenantId,
      documentId,
      supersededBy,
    });

    return document;
  }

  async archiveDocument(tenantId: string, documentId: string): Promise<QualityDocument> {
    const document = await this.getDocument(tenantId, documentId);

    if (document.status !== DocumentStatus.OBSOLETE) {
      throw new BadRequestException('Only obsolete documents can be archived');
    }

    document.status = DocumentStatus.ARCHIVED;
    document.updatedAt = new Date();

    this.documents.set(documentId, document);

    return document;
  }

  async getDocument(tenantId: string, documentId: string): Promise<QualityDocument> {
    const document = this.documents.get(documentId);

    if (!document || document.tenantId !== tenantId) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    return document;
  }

  async listDocuments(
    tenantId: string,
    filters: {
      type?: QualityDocumentType;
      status?: DocumentStatus;
      category?: string;
      department?: string;
      ownerId?: string;
      accessLevel?: QualityDocument['accessLevel'];
      search?: string;
    },
  ): Promise<QualityDocument[]> {
    let documents = Array.from(this.documents.values()).filter(
      (d) => d.tenantId === tenantId,
    );

    if (filters.type) {
      documents = documents.filter((d) => d.type === filters.type);
    }

    if (filters.status) {
      documents = documents.filter((d) => d.status === filters.status);
    }

    if (filters.category) {
      documents = documents.filter((d) => d.category === filters.category);
    }

    if (filters.department) {
      documents = documents.filter((d) => d.department === filters.department);
    }

    if (filters.ownerId) {
      documents = documents.filter((d) => d.ownerId === filters.ownerId);
    }

    if (filters.accessLevel) {
      documents = documents.filter((d) => d.accessLevel === filters.accessLevel);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      documents = documents.filter(
        (d) =>
          d.title.toLowerCase().includes(searchLower) ||
          d.documentNumber.toLowerCase().includes(searchLower) ||
          d.description?.toLowerCase().includes(searchLower),
      );
    }

    return documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Certification Operations
  async createCertification(
    tenantId: string,
    dto: CreateCertificationDto,
  ): Promise<Certification> {
    const id = `cert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const certificateNumber = await this.generateCertificateNumber(tenantId, dto.type);

    const certification: Certification = {
      id,
      tenantId,
      certificateNumber,
      type: dto.type,
      status: CertificationStatus.PENDING,
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
      standards: dto.standards,
      products: dto.products,
      processes: dto.processes,
      locations: dto.locations,
      issuingBody: dto.issuingBody,
      issuingBodyId: dto.issuingBodyId,
      accreditationNumber: dto.accreditationNumber,
      issueDate: new Date(dto.issueDate),
      effectiveDate: new Date(dto.effectiveDate),
      expiryDate: new Date(dto.expiryDate),
      certificateFileId: dto.certificateFileId,
      certificateFileName: dto.certificateFileName,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      productId: dto.productId,
      productName: dto.productName,
      equipmentId: dto.equipmentId,
      equipmentName: dto.equipmentName,
      employeeId: dto.employeeId,
      employeeName: dto.employeeName,
      auditHistory: [],
      renewalHistory: [],
      tags: dto.tags,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.certifications.set(id, certification);

    this.eventEmitter.emit('quality.certification.created', {
      tenantId,
      certificationId: id,
      type: dto.type,
    });

    return certification;
  }

  async activateCertification(
    tenantId: string,
    certificationId: string,
  ): Promise<Certification> {
    const certification = await this.getCertification(tenantId, certificationId);

    if (certification.status !== CertificationStatus.PENDING) {
      throw new BadRequestException('Only pending certifications can be activated');
    }

    certification.status = CertificationStatus.ACTIVE;
    certification.updatedAt = new Date();

    this.certifications.set(certificationId, certification);

    this.eventEmitter.emit('quality.certification.activated', {
      tenantId,
      certificationId,
    });

    return certification;
  }

  async recordAudit(
    tenantId: string,
    certificationId: string,
    dto: RecordAuditDto,
  ): Promise<Certification> {
    const certification = await this.getCertification(tenantId, certificationId);

    const audit: CertificationAudit = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      auditDate: new Date(dto.auditDate),
      auditType: dto.auditType,
      auditorName: dto.auditorName,
      auditorOrg: dto.auditorOrg,
      findings: dto.findings,
      nonConformities: dto.nonConformities,
      result: dto.result,
      reportFileId: dto.reportFileId,
    };

    certification.auditHistory.push(audit);
    certification.lastAuditDate = audit.auditDate;
    certification.updatedAt = new Date();

    if (dto.result === 'fail') {
      certification.status = CertificationStatus.SUSPENDED;
      this.eventEmitter.emit('quality.certification.suspended', {
        tenantId,
        certificationId,
        reason: 'Failed audit',
      });
    }

    this.certifications.set(certificationId, certification);

    return certification;
  }

  async renewCertification(
    tenantId: string,
    certificationId: string,
    dto: RenewCertificationDto,
  ): Promise<Certification> {
    const certification = await this.getCertification(tenantId, certificationId);

    const renewal: CertificationRenewal = {
      id: `renewal_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      renewalDate: new Date(),
      previousExpiryDate: certification.expiryDate,
      newExpiryDate: new Date(dto.newExpiryDate),
      renewedBy: dto.renewedBy,
      renewedByName: dto.renewedByName,
      notes: dto.notes,
    };

    certification.renewalHistory.push(renewal);
    certification.expiryDate = new Date(dto.newExpiryDate);
    certification.status = CertificationStatus.RENEWED;

    if (dto.certificateFileId) {
      certification.certificateFileId = dto.certificateFileId;
      certification.certificateFileName = dto.certificateFileName;
    }

    certification.updatedAt = new Date();

    this.certifications.set(certificationId, certification);

    this.eventEmitter.emit('quality.certification.renewed', {
      tenantId,
      certificationId,
      newExpiryDate: dto.newExpiryDate,
    });

    return certification;
  }

  async suspendCertification(
    tenantId: string,
    certificationId: string,
    reason: string,
  ): Promise<Certification> {
    const certification = await this.getCertification(tenantId, certificationId);

    certification.status = CertificationStatus.SUSPENDED;
    certification.metadata = { ...certification.metadata, suspensionReason: reason };
    certification.updatedAt = new Date();

    this.certifications.set(certificationId, certification);

    this.eventEmitter.emit('quality.certification.suspended', {
      tenantId,
      certificationId,
      reason,
    });

    return certification;
  }

  async withdrawCertification(
    tenantId: string,
    certificationId: string,
    reason: string,
  ): Promise<Certification> {
    const certification = await this.getCertification(tenantId, certificationId);

    certification.status = CertificationStatus.WITHDRAWN;
    certification.metadata = { ...certification.metadata, withdrawalReason: reason };
    certification.updatedAt = new Date();

    this.certifications.set(certificationId, certification);

    this.eventEmitter.emit('quality.certification.withdrawn', {
      tenantId,
      certificationId,
      reason,
    });

    return certification;
  }

  async updateCertificationStatus(tenantId: string): Promise<number> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let updated = 0;

    const certifications = Array.from(this.certifications.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    for (const cert of certifications) {
      let newStatus: CertificationStatus | null = null;

      if (
        cert.status === CertificationStatus.ACTIVE ||
        cert.status === CertificationStatus.RENEWED
      ) {
        if (cert.expiryDate <= now) {
          newStatus = CertificationStatus.EXPIRED;
        } else if (cert.expiryDate <= thirtyDaysFromNow) {
          newStatus = CertificationStatus.EXPIRING_SOON;
        }
      }

      if (newStatus && newStatus !== cert.status) {
        cert.status = newStatus;
        cert.updatedAt = new Date();
        this.certifications.set(cert.id, cert);
        updated++;

        if (newStatus === CertificationStatus.EXPIRED) {
          this.eventEmitter.emit('quality.certification.expired', {
            tenantId,
            certificationId: cert.id,
          });
        } else if (newStatus === CertificationStatus.EXPIRING_SOON) {
          this.eventEmitter.emit('quality.certification.expiring_soon', {
            tenantId,
            certificationId: cert.id,
            expiryDate: cert.expiryDate,
          });
        }
      }
    }

    return updated;
  }

  async getCertification(
    tenantId: string,
    certificationId: string,
  ): Promise<Certification> {
    const certification = this.certifications.get(certificationId);

    if (!certification || certification.tenantId !== tenantId) {
      throw new NotFoundException(`Certification ${certificationId} not found`);
    }

    return certification;
  }

  async listCertifications(
    tenantId: string,
    filters: {
      type?: CertificationType;
      status?: CertificationStatus;
      supplierId?: string;
      productId?: string;
      equipmentId?: string;
      employeeId?: string;
      expiringWithin?: number;
    },
  ): Promise<Certification[]> {
    let certifications = Array.from(this.certifications.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filters.type) {
      certifications = certifications.filter((c) => c.type === filters.type);
    }

    if (filters.status) {
      certifications = certifications.filter((c) => c.status === filters.status);
    }

    if (filters.supplierId) {
      certifications = certifications.filter((c) => c.supplierId === filters.supplierId);
    }

    if (filters.productId) {
      certifications = certifications.filter((c) => c.productId === filters.productId);
    }

    if (filters.equipmentId) {
      certifications = certifications.filter(
        (c) => c.equipmentId === filters.equipmentId,
      );
    }

    if (filters.employeeId) {
      certifications = certifications.filter((c) => c.employeeId === filters.employeeId);
    }

    if (filters.expiringWithin) {
      const cutoff = new Date(
        Date.now() + filters.expiringWithin * 24 * 60 * 60 * 1000,
      );
      certifications = certifications.filter((c) => c.expiryDate <= cutoff);
    }

    return certifications.sort(
      (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime(),
    );
  }

  // Helper Methods
  private async generateDocumentNumber(
    tenantId: string,
    type: QualityDocumentType,
  ): Promise<string> {
    const key = `${tenantId}_${type}`;
    const counter = (this.docCounter.get(key) || 0) + 1;
    this.docCounter.set(key, counter);

    const prefix = this.getDocumentPrefix(type);
    return `${prefix}-${counter.toString().padStart(5, '0')}`;
  }

  private getDocumentPrefix(type: QualityDocumentType): string {
    const prefixes: Record<QualityDocumentType, string> = {
      [QualityDocumentType.PROCEDURE]: 'PROC',
      [QualityDocumentType.WORK_INSTRUCTION]: 'WI',
      [QualityDocumentType.SPECIFICATION]: 'SPEC',
      [QualityDocumentType.STANDARD]: 'STD',
      [QualityDocumentType.FORM]: 'FORM',
      [QualityDocumentType.TEMPLATE]: 'TMPL',
      [QualityDocumentType.POLICY]: 'POL',
      [QualityDocumentType.MANUAL]: 'MAN',
      [QualityDocumentType.DRAWING]: 'DWG',
      [QualityDocumentType.CERTIFICATE]: 'CERT',
      [QualityDocumentType.AUDIT_REPORT]: 'AUD',
      [QualityDocumentType.INSPECTION_RECORD]: 'INSP',
      [QualityDocumentType.CALIBRATION_RECORD]: 'CAL',
      [QualityDocumentType.TRAINING_RECORD]: 'TRN',
    };
    return prefixes[type];
  }

  private async generateCertificateNumber(
    tenantId: string,
    type: CertificationType,
  ): Promise<string> {
    const key = `${tenantId}_cert`;
    const counter = (this.certCounter.get(key) || 0) + 1;
    this.certCounter.set(key, counter);
    const year = new Date().getFullYear();
    return `CERT-${year}-${counter.toString().padStart(5, '0')}`;
  }
}
