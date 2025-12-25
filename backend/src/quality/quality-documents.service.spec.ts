import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  QualityDocumentsService,
  QualityDocumentType,
  DocumentStatus,
  CertificationType,
  CertificationStatus,
  CreateDocumentDto,
  CreateCertificationDto,
} from './quality-documents.service';

describe('QualityDocumentsService', () => {
  let service: QualityDocumentsService;
  let eventEmitter: EventEmitter2;
  const tenantId = `tenant_docs_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const baseDocumentDto: CreateDocumentDto = {
    title: 'Assembly Procedure',
    type: QualityDocumentType.PROCEDURE,
    description: 'Standard operating procedure for product assembly',
    category: 'Operations',
    department: 'Manufacturing',
    authorId: 'user_001',
    authorName: 'John Author',
    ownerId: 'user_002',
    ownerName: 'Jane Owner',
    accessLevel: 'internal',
    distributionList: ['user_003', 'user_004'],
    tags: ['sop', 'assembly'],
  };

  const baseCertificationDto: CreateCertificationDto = {
    type: CertificationType.ISO_9001,
    name: 'ISO 9001:2015 Quality Management',
    description: 'Quality management system certification',
    scope: 'Design and manufacturing of widgets',
    standards: ['ISO 9001:2015'],
    issuingBody: 'TUV Certification Body',
    accreditationNumber: 'ACC-123456',
    issueDate: new Date(),
    effectiveDate: new Date(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    locations: ['Main Factory'],
    tags: ['iso', 'quality'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityDocumentsService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QualityDocumentsService>(QualityDocumentsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Document Operations', () => {
    describe('createDocument', () => {
      it('should create a quality document', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);

        expect(doc).toBeDefined();
        expect(doc.id).toBeDefined();
        expect(doc.documentNumber).toMatch(/^PROC-\d{5}$/);
        expect(doc.status).toBe(DocumentStatus.DRAFT);
        expect(doc.version).toBe('1.0');
        expect(doc.revision).toBe(0);
        expect(doc.revisionHistory).toHaveLength(1);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.document.created',
          expect.any(Object),
        );
      });

      it('should generate correct prefix for different document types', async () => {
        const wi = await service.createDocument(tenantId, {
          ...baseDocumentDto,
          type: QualityDocumentType.WORK_INSTRUCTION,
        });
        expect(wi.documentNumber).toMatch(/^WI-\d{5}$/);

        const spec = await service.createDocument(tenantId, {
          ...baseDocumentDto,
          type: QualityDocumentType.SPECIFICATION,
        });
        expect(spec.documentNumber).toMatch(/^SPEC-\d{5}$/);
      });
    });

    describe('updateDocument', () => {
      it('should update a draft document', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        const updated = await service.updateDocument(tenantId, doc.id, {
          title: 'Updated Assembly Procedure',
          description: 'Updated description',
        });

        expect(updated.title).toBe('Updated Assembly Procedure');
        expect(updated.description).toBe('Updated description');
      });

      it('should reject updating non-draft document', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        await service.submitForReview(tenantId, doc.id, {
          reviewerId: 'user_reviewer',
          reviewerName: 'Reviewer',
        });

        await expect(
          service.updateDocument(tenantId, doc.id, { title: 'New Title' }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Document review workflow', () => {
      it('should submit for review', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        const submitted = await service.submitForReview(tenantId, doc.id, {
          reviewerId: 'user_reviewer',
          reviewerName: 'John Reviewer',
          notes: 'Please review urgently',
        });

        expect(submitted.status).toBe(DocumentStatus.PENDING_REVIEW);
        expect(submitted.reviewerId).toBe('user_reviewer');
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.document.submitted_for_review',
          expect.any(Object),
        );
      });

      it('should start review', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        await service.submitForReview(tenantId, doc.id, {
          reviewerId: 'user_reviewer',
          reviewerName: 'Reviewer',
        });
        const reviewing = await service.startReview(tenantId, doc.id);

        expect(reviewing.status).toBe(DocumentStatus.UNDER_REVIEW);
      });

      it('should complete review with approval', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        await service.submitForReview(tenantId, doc.id, {
          reviewerId: 'user_reviewer',
          reviewerName: 'Reviewer',
        });
        await service.startReview(tenantId, doc.id);
        const reviewed = await service.completeReview(tenantId, doc.id, {
          approved: true,
          comments: 'Looks good',
        });

        expect(reviewed.status).toBe(DocumentStatus.PENDING_APPROVAL);
        expect(reviewed.reviewComments).toBe('Looks good');
        expect(reviewed.reviewedAt).toBeDefined();
      });

      it('should reject review and return to draft', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        await service.submitForReview(tenantId, doc.id, {
          reviewerId: 'user_reviewer',
          reviewerName: 'Reviewer',
        });
        await service.startReview(tenantId, doc.id);
        const reviewed = await service.completeReview(tenantId, doc.id, {
          approved: false,
          comments: 'Needs revision',
          changesRequired: 'Fix section 3',
        });

        expect(reviewed.status).toBe(DocumentStatus.DRAFT);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.document.review_rejected',
          expect.any(Object),
        );
      });
    });

    describe('Document approval workflow', () => {
      let pendingApprovalDocId: string;

      beforeEach(async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        await service.submitForReview(tenantId, doc.id, {
          reviewerId: 'user_reviewer',
          reviewerName: 'Reviewer',
        });
        await service.startReview(tenantId, doc.id);
        await service.completeReview(tenantId, doc.id, {
          approved: true,
          comments: 'Approved',
        });
        pendingApprovalDocId = doc.id;
      });

      it('should approve document', async () => {
        const approved = await service.approveDocument(
          tenantId,
          pendingApprovalDocId,
          'user_approver',
          'Jane Approver',
          {
            approved: true,
            comments: 'Approved for release',
            effectiveDate: new Date(),
          },
        );

        expect(approved.status).toBe(DocumentStatus.APPROVED);
        expect(approved.approverId).toBe('user_approver');
        expect(approved.approverName).toBe('Jane Approver');
        expect(approved.approvedAt).toBeDefined();
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.document.approved',
          expect.any(Object),
        );
      });

      it('should reject approval and return to draft', async () => {
        const rejected = await service.approveDocument(
          tenantId,
          pendingApprovalDocId,
          'user_approver',
          'Approver',
          {
            approved: false,
            comments: 'Not ready for release',
          },
        );

        expect(rejected.status).toBe(DocumentStatus.DRAFT);
      });
    });

    describe('Document release and revision', () => {
      let approvedDocId: string;

      beforeEach(async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        await service.submitForReview(tenantId, doc.id, {
          reviewerId: 'user_reviewer',
          reviewerName: 'Reviewer',
        });
        await service.startReview(tenantId, doc.id);
        await service.completeReview(tenantId, doc.id, {
          approved: true,
          comments: 'OK',
        });
        await service.approveDocument(tenantId, doc.id, 'user_approver', 'Approver', {
          approved: true,
          comments: 'OK',
        });
        approvedDocId = doc.id;
      });

      it('should release document', async () => {
        const released = await service.releaseDocument(
          tenantId,
          approvedDocId,
          'user_releaser',
          'Release Manager',
        );

        expect(released.status).toBe(DocumentStatus.RELEASED);
        expect(released.releasedAt).toBeDefined();
        expect(released.releasedBy).toBe('user_releaser');
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.document.released',
          expect.any(Object),
        );
      });

      it('should revise released document', async () => {
        await service.releaseDocument(
          tenantId,
          approvedDocId,
          'user_releaser',
          'Releaser',
        );

        const revised = await service.reviseDocument(tenantId, approvedDocId, {
          changeDescription: 'Updated safety requirements',
          content: 'New content with safety updates',
          revisedBy: 'user_editor',
          revisedByName: 'Document Editor',
        });

        expect(revised.status).toBe(DocumentStatus.DRAFT);
        expect(revised.revision).toBe(1);
        expect(revised.version).toBe('1.1');
        expect(revised.revisionHistory).toHaveLength(2);
        expect(revised.revisionHistory[1].changeDescription).toBe(
          'Updated safety requirements',
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.document.revised',
          expect.any(Object),
        );
      });
    });

    describe('Document obsolete and archive', () => {
      it('should mark document as obsolete', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        const obsolete = await service.obsoleteDocument(
          tenantId,
          doc.id,
          'new_doc_id',
          'Replaced by new version',
        );

        expect(obsolete.status).toBe(DocumentStatus.OBSOLETE);
        expect(obsolete.supersededBy).toBe('new_doc_id');
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.document.obsoleted',
          expect.any(Object),
        );
      });

      it('should archive obsolete document', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        await service.obsoleteDocument(tenantId, doc.id);
        const archived = await service.archiveDocument(tenantId, doc.id);

        expect(archived.status).toBe(DocumentStatus.ARCHIVED);
      });

      it('should reject archiving non-obsolete document', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);

        await expect(service.archiveDocument(tenantId, doc.id)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('getDocument', () => {
      it('should get document by id', async () => {
        const doc = await service.createDocument(tenantId, baseDocumentDto);
        const retrieved = await service.getDocument(tenantId, doc.id);

        expect(retrieved.id).toBe(doc.id);
      });

      it('should throw if document not found', async () => {
        await expect(service.getDocument(tenantId, 'invalid_id')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('listDocuments', () => {
      const listTenantId = `tenant_doclist_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      beforeEach(async () => {
        await service.createDocument(listTenantId, {
          ...baseDocumentDto,
          type: QualityDocumentType.PROCEDURE,
          category: 'Operations',
        });
        await service.createDocument(listTenantId, {
          ...baseDocumentDto,
          type: QualityDocumentType.WORK_INSTRUCTION,
          category: 'Safety',
        });
        await service.createDocument(listTenantId, {
          ...baseDocumentDto,
          title: 'Searchable Title',
          type: QualityDocumentType.SPECIFICATION,
        });
      });

      it('should list all documents for tenant', async () => {
        const docs = await service.listDocuments(listTenantId, {});
        expect(docs.length).toBeGreaterThanOrEqual(3);
      });

      it('should filter by type', async () => {
        const docs = await service.listDocuments(listTenantId, {
          type: QualityDocumentType.PROCEDURE,
        });
        expect(docs.every((d) => d.type === QualityDocumentType.PROCEDURE)).toBe(true);
      });

      it('should filter by category', async () => {
        const docs = await service.listDocuments(listTenantId, {
          category: 'Safety',
        });
        expect(docs.every((d) => d.category === 'Safety')).toBe(true);
      });

      it('should search by title', async () => {
        const docs = await service.listDocuments(listTenantId, {
          search: 'searchable',
        });
        expect(docs.some((d) => d.title.includes('Searchable'))).toBe(true);
      });
    });
  });

  describe('Certification Operations', () => {
    describe('createCertification', () => {
      it('should create a certification', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);

        expect(cert).toBeDefined();
        expect(cert.id).toBeDefined();
        expect(cert.certificateNumber).toMatch(/^CERT-\d{4}-\d{5}$/);
        expect(cert.status).toBe(CertificationStatus.PENDING);
        expect(cert.auditHistory).toHaveLength(0);
        expect(cert.renewalHistory).toHaveLength(0);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.certification.created',
          expect.any(Object),
        );
      });
    });

    describe('activateCertification', () => {
      it('should activate a pending certification', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);
        const activated = await service.activateCertification(tenantId, cert.id);

        expect(activated.status).toBe(CertificationStatus.ACTIVE);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.certification.activated',
          expect.any(Object),
        );
      });

      it('should reject activating non-pending certification', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);
        await service.activateCertification(tenantId, cert.id);

        await expect(
          service.activateCertification(tenantId, cert.id),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('recordAudit', () => {
      it('should record a successful audit', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);
        await service.activateCertification(tenantId, cert.id);

        const audited = await service.recordAudit(tenantId, cert.id, {
          auditDate: new Date(),
          auditType: 'surveillance',
          auditorName: 'External Auditor',
          auditorOrg: 'TUV',
          findings: 'Minor observations, no major findings',
          nonConformities: 0,
          result: 'pass',
        });

        expect(audited.auditHistory).toHaveLength(1);
        expect(audited.lastAuditDate).toBeDefined();
      });

      it('should suspend certification on failed audit', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);
        await service.activateCertification(tenantId, cert.id);

        const audited = await service.recordAudit(tenantId, cert.id, {
          auditDate: new Date(),
          auditType: 'surveillance',
          auditorName: 'Auditor',
          findings: 'Critical non-conformities found',
          nonConformities: 5,
          result: 'fail',
        });

        expect(audited.status).toBe(CertificationStatus.SUSPENDED);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.certification.suspended',
          expect.any(Object),
        );
      });
    });

    describe('renewCertification', () => {
      it('should renew certification', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);
        await service.activateCertification(tenantId, cert.id);

        const newExpiryDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
        const renewed = await service.renewCertification(tenantId, cert.id, {
          newExpiryDate,
          renewedBy: 'user_admin',
          renewedByName: 'Admin User',
          notes: 'Renewed after successful recertification audit',
        });

        expect(renewed.status).toBe(CertificationStatus.RENEWED);
        expect(renewed.expiryDate).toEqual(newExpiryDate);
        expect(renewed.renewalHistory).toHaveLength(1);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.certification.renewed',
          expect.any(Object),
        );
      });
    });

    describe('suspendCertification', () => {
      it('should suspend certification', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);
        await service.activateCertification(tenantId, cert.id);

        const suspended = await service.suspendCertification(
          tenantId,
          cert.id,
          'Pending investigation',
        );

        expect(suspended.status).toBe(CertificationStatus.SUSPENDED);
        expect(suspended.metadata?.suspensionReason).toBe('Pending investigation');
      });
    });

    describe('withdrawCertification', () => {
      it('should withdraw certification', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);
        await service.activateCertification(tenantId, cert.id);

        const withdrawn = await service.withdrawCertification(
          tenantId,
          cert.id,
          'Company request',
        );

        expect(withdrawn.status).toBe(CertificationStatus.WITHDRAWN);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.certification.withdrawn',
          expect.any(Object),
        );
      });
    });

    describe('updateCertificationStatus', () => {
      const statusTenantId = `tenant_status_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      it('should mark expiring certifications', async () => {
        // Create cert expiring in 10 days
        const cert = await service.createCertification(statusTenantId, {
          ...baseCertificationDto,
          expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        });
        await service.activateCertification(statusTenantId, cert.id);

        const updated = await service.updateCertificationStatus(statusTenantId);
        const refreshed = await service.getCertification(statusTenantId, cert.id);

        expect(updated).toBe(1);
        expect(refreshed.status).toBe(CertificationStatus.EXPIRING_SOON);
      });

      it('should mark expired certifications', async () => {
        // Create cert that expired yesterday
        const cert = await service.createCertification(statusTenantId, {
          ...baseCertificationDto,
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        });
        await service.activateCertification(statusTenantId, cert.id);

        await service.updateCertificationStatus(statusTenantId);
        const refreshed = await service.getCertification(statusTenantId, cert.id);

        expect(refreshed.status).toBe(CertificationStatus.EXPIRED);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.certification.expired',
          expect.any(Object),
        );
      });
    });

    describe('getCertification', () => {
      it('should get certification by id', async () => {
        const cert = await service.createCertification(tenantId, baseCertificationDto);
        const retrieved = await service.getCertification(tenantId, cert.id);

        expect(retrieved.id).toBe(cert.id);
      });

      it('should throw if certification not found', async () => {
        await expect(
          service.getCertification(tenantId, 'invalid_id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('listCertifications', () => {
      const listTenantId = `tenant_certlist_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      beforeEach(async () => {
        const cert1 = await service.createCertification(listTenantId, {
          ...baseCertificationDto,
          type: CertificationType.ISO_9001,
        });
        await service.activateCertification(listTenantId, cert1.id);

        const cert2 = await service.createCertification(listTenantId, {
          ...baseCertificationDto,
          type: CertificationType.ISO_14001,
          supplierId: 'supplier_001',
          supplierName: 'Supplier A',
        });
        await service.activateCertification(listTenantId, cert2.id);

        await service.createCertification(listTenantId, {
          ...baseCertificationDto,
          type: CertificationType.ISO_45001,
        });
      });

      it('should list all certifications for tenant', async () => {
        const certs = await service.listCertifications(listTenantId, {});
        expect(certs.length).toBeGreaterThanOrEqual(3);
      });

      it('should filter by type', async () => {
        const certs = await service.listCertifications(listTenantId, {
          type: CertificationType.ISO_9001,
        });
        expect(certs.every((c) => c.type === CertificationType.ISO_9001)).toBe(true);
      });

      it('should filter by status', async () => {
        const certs = await service.listCertifications(listTenantId, {
          status: CertificationStatus.ACTIVE,
        });
        expect(certs.every((c) => c.status === CertificationStatus.ACTIVE)).toBe(true);
      });

      it('should filter by supplier', async () => {
        const certs = await service.listCertifications(listTenantId, {
          supplierId: 'supplier_001',
        });
        expect(certs.every((c) => c.supplierId === 'supplier_001')).toBe(true);
      });
    });
  });

  describe('Document workflow - complete cycle', () => {
    it('should complete full document lifecycle', async () => {
      // Create
      const doc = await service.createDocument(tenantId, {
        ...baseDocumentDto,
        title: 'Complete Lifecycle Document',
      });
      expect(doc.status).toBe(DocumentStatus.DRAFT);

      // Update while draft
      const updated = await service.updateDocument(tenantId, doc.id, {
        description: 'Updated description',
      });
      expect(updated.description).toBe('Updated description');

      // Submit for review
      const submitted = await service.submitForReview(tenantId, doc.id, {
        reviewerId: 'user_reviewer',
        reviewerName: 'Reviewer',
      });
      expect(submitted.status).toBe(DocumentStatus.PENDING_REVIEW);

      // Start review
      const reviewing = await service.startReview(tenantId, doc.id);
      expect(reviewing.status).toBe(DocumentStatus.UNDER_REVIEW);

      // Complete review
      const reviewed = await service.completeReview(tenantId, doc.id, {
        approved: true,
        comments: 'Good work',
      });
      expect(reviewed.status).toBe(DocumentStatus.PENDING_APPROVAL);

      // Approve
      const approved = await service.approveDocument(
        tenantId,
        doc.id,
        'user_approver',
        'Approver',
        {
          approved: true,
          comments: 'Approved',
          effectiveDate: new Date(),
        },
      );
      expect(approved.status).toBe(DocumentStatus.APPROVED);

      // Release
      const released = await service.releaseDocument(
        tenantId,
        doc.id,
        'user_releaser',
        'Releaser',
      );
      expect(released.status).toBe(DocumentStatus.RELEASED);

      // Revise
      const revised = await service.reviseDocument(tenantId, doc.id, {
        changeDescription: 'Minor update',
        revisedBy: 'user_editor',
        revisedByName: 'Editor',
      });
      expect(revised.status).toBe(DocumentStatus.DRAFT);
      expect(revised.version).toBe('1.1');

      // Can be obsoleted directly from any status for this test
      await service.submitForReview(tenantId, doc.id, {
        reviewerId: 'user_reviewer',
        reviewerName: 'Reviewer',
      });
      await service.startReview(tenantId, doc.id);
      await service.completeReview(tenantId, doc.id, {
        approved: true,
        comments: 'OK',
      });
      await service.approveDocument(tenantId, doc.id, 'approver', 'Approver', {
        approved: true,
        comments: 'OK',
      });
      await service.releaseDocument(tenantId, doc.id, 'releaser', 'Releaser');

      // Obsolete
      const obsolete = await service.obsoleteDocument(
        tenantId,
        doc.id,
        undefined,
        'Replaced',
      );
      expect(obsolete.status).toBe(DocumentStatus.OBSOLETE);

      // Archive
      const archived = await service.archiveDocument(tenantId, doc.id);
      expect(archived.status).toBe(DocumentStatus.ARCHIVED);
    });
  });
});
