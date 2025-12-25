import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  HRFormsService,
  FormCategory,
  FormStatus,
  SubmissionStatus,
  ApprovalAction,
  FormTemplate,
  FormSubmission,
  FieldType,
} from './hr-forms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HRFormsService', () => {
  let service: HRFormsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    hrForm: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    hrFormSubmission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        HR_FORMS_RETENTION_DAYS: 365,
        HR_FORMS_MAX_ATTACHMENTS: 10,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HRFormsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<HRFormsService>(HRFormsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should initialize with pre-built templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThan(20);
    });

    it('should get templates by category', () => {
      const leaveTemplates = service.getTemplates(FormCategory.LEAVE);
      expect(leaveTemplates.length).toBeGreaterThan(5);
      expect(leaveTemplates.every(t => t.category === FormCategory.LEAVE)).toBe(true);
    });

    it('should get templates by status', () => {
      const activeTemplates = service.getTemplates(undefined, FormStatus.ACTIVE);
      expect(activeTemplates.length).toBeGreaterThan(0);
      expect(activeTemplates.every(t => t.status === FormStatus.ACTIVE)).toBe(true);
    });

    it('should get a specific template by ID', () => {
      const template = service.getTemplate('tpl-leave-annual');
      expect(template).toBeDefined();
      expect(template.id).toBe('tpl-leave-annual');
      expect(template.name).toBe('Cerere Concediu de Odihnă');
      expect(template.category).toBe(FormCategory.LEAVE);
    });

    it('should throw NotFoundException for unknown template', () => {
      expect(() => service.getTemplate('non-existent-template')).toThrow(NotFoundException);
    });

    it('should get all categories with counts', () => {
      const categories = service.getCategories();
      expect(categories.length).toBeGreaterThan(0);

      const leaveCategory = categories.find(c => c.category === FormCategory.LEAVE);
      expect(leaveCategory).toBeDefined();
      expect(leaveCategory!.count).toBeGreaterThan(5);
      expect(leaveCategory!.label).toBe('Concedii');
    });
  });

  describe('Leave Form Templates', () => {
    it('should have annual leave template with correct fields', () => {
      const template = service.getTemplate('tpl-leave-annual');
      expect(template.fields.length).toBeGreaterThanOrEqual(5);

      const startDateField = template.fields.find(f => f.name === 'startDate');
      expect(startDateField).toBeDefined();
      expect(startDateField!.type).toBe(FieldType.DATE);
      expect(startDateField!.required).toBe(true);
      expect(startDateField!.validation?.futureDate).toBe(true);
    });

    it('should have medical leave template with certificate upload', () => {
      const template = service.getTemplate('tpl-leave-medical');
      const certificateField = template.fields.find(f => f.name === 'certificate');
      expect(certificateField).toBeDefined();
      expect(certificateField!.type).toBe(FieldType.FILE);
      expect(certificateField!.required).toBe(true);
    });

    it('should have maternity leave template', () => {
      const template = service.getTemplate('tpl-leave-maternity');
      expect(template).toBeDefined();
      expect(template.category).toBe(FormCategory.LEAVE);

      const dueDateField = template.fields.find(f => f.name === 'expectedDueDate');
      expect(dueDateField).toBeDefined();
    });

    it('should have paternity leave template with additional days option', () => {
      const template = service.getTemplate('tpl-leave-paternity');
      const additionalDaysField = template.fields.find(f => f.name === 'additionalDays');
      expect(additionalDaysField).toBeDefined();
      expect(additionalDaysField!.type).toBe(FieldType.CHECKBOX);
    });

    it('should have bereavement leave template with relationship options', () => {
      const template = service.getTemplate('tpl-leave-bereavement');
      const relationshipField = template.fields.find(f => f.name === 'relationship');
      expect(relationshipField).toBeDefined();
      expect(relationshipField!.type).toBe(FieldType.SELECT);
      expect(relationshipField!.options!.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Performance Form Templates', () => {
    it('should have annual review template with ratings', () => {
      const template = service.getTemplate('tpl-perf-annual-review');
      expect(template.category).toBe(FormCategory.PERFORMANCE);

      const ratingField = template.fields.find(f => f.name === 'overallRating');
      expect(ratingField).toBeDefined();
      expect(ratingField!.type).toBe(FieldType.RATING);
    });

    it('should have 360 feedback template with multiple competencies', () => {
      const template = service.getTemplate('tpl-perf-360-feedback');
      expect(template.settings.anonymousAllowed).toBe(true);

      const ratingFields = template.fields.filter(f => f.type === FieldType.RATING);
      expect(ratingFields.length).toBeGreaterThanOrEqual(4);
    });

    it('should have probation review template with recommendation field', () => {
      const template = service.getTemplate('tpl-perf-probation-review');
      const recommendationField = template.fields.find(f => f.name === 'recommendation');
      expect(recommendationField).toBeDefined();
      expect(recommendationField!.options).toContainEqual(expect.objectContaining({ value: 'confirm' }));
      expect(recommendationField!.options).toContainEqual(expect.objectContaining({ value: 'extend' }));
      expect(recommendationField!.options).toContainEqual(expect.objectContaining({ value: 'terminate' }));
    });
  });

  describe('Onboarding Form Templates', () => {
    it('should have personal info template with CNP validation', () => {
      const template = service.getTemplate('tpl-onboard-personal-info');
      const cnpField = template.fields.find(f => f.name === 'cnp');
      expect(cnpField).toBeDefined();
      expect(cnpField!.validation?.pattern).toBe('^[1-9]\\d{12}$');
    });

    it('should have bank details template with IBAN validation', () => {
      const template = service.getTemplate('tpl-onboard-bank-details');
      const ibanField = template.fields.find(f => f.name === 'iban');
      expect(ibanField).toBeDefined();
      expect(ibanField!.validation?.pattern).toContain('RO');
    });

    it('should have IT access template with system selection', () => {
      const template = service.getTemplate('tpl-onboard-it-access');
      const accessField = template.fields.find(f => f.name === 'accessNeeded');
      expect(accessField).toBeDefined();
      expect(accessField!.type).toBe(FieldType.MULTISELECT);
    });

    it('should have onboarding checklist with REVISAL step', () => {
      const template = service.getTemplate('tpl-onboard-checklist');
      const revisalField = template.fields.find(f => f.name === 'revisalSubmitted');
      expect(revisalField).toBeDefined();
      expect(revisalField!.type).toBe(FieldType.CHECKBOX);
    });
  });

  describe('Offboarding Form Templates', () => {
    it('should have resignation template with notice period', () => {
      const template = service.getTemplate('tpl-offboard-resignation');
      const noticePeriodField = template.fields.find(f => f.name === 'noticePeriod');
      expect(noticePeriodField).toBeDefined();
      expect(noticePeriodField!.defaultValue).toBe(20);
    });

    it('should have exit interview template with satisfaction rating', () => {
      const template = service.getTemplate('tpl-offboard-exit-interview');
      expect(template.settings.anonymousAllowed).toBe(true);

      const satisfactionField = template.fields.find(f => f.name === 'satisfaction');
      expect(satisfactionField).toBeDefined();
      expect(satisfactionField!.type).toBe(FieldType.RATING);
    });

    it('should have clearance template with multi-step workflow', () => {
      const template = service.getTemplate('tpl-offboard-clearance');
      expect(template.workflow?.enabled).toBe(true);
      expect(template.workflow?.steps.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Other Form Templates', () => {
    it('should have training request template with cost field', () => {
      const template = service.getTemplate('tpl-train-request');
      const costField = template.fields.find(f => f.name === 'cost');
      expect(costField).toBeDefined();
      expect(costField!.type).toBe(FieldType.CURRENCY);
    });

    it('should have expense report template with category selection', () => {
      const template = service.getTemplate('tpl-expense-report');
      const categoryField = template.fields.find(f => f.name === 'category');
      expect(categoryField).toBeDefined();
      expect(categoryField!.options!.length).toBeGreaterThanOrEqual(4);
    });

    it('should have HSE incident template with severity levels', () => {
      const template = service.getTemplate('tpl-hse-incident');
      const severityField = template.fields.find(f => f.name === 'severity');
      expect(severityField).toBeDefined();
      expect(severityField!.options).toContainEqual(expect.objectContaining({ value: 'critical' }));
    });

    it('should have GDPR consent template with required consents', () => {
      const template = service.getTemplate('tpl-gdpr-consent');
      expect(template.settings.requireSignature).toBe(true);

      const dataProcessingField = template.fields.find(f => f.name === 'dataProcessingConsent');
      expect(dataProcessingField).toBeDefined();
      expect(dataProcessingField!.required).toBe(true);
    });
  });

  describe('Form Submission', () => {
    it('should create a draft submission', async () => {
      const submission = await service.createSubmission(
        'user-123',
        'tpl-leave-annual',
        {
          startDate: '2025-01-15',
          endDate: '2025-01-20',
          workingDays: 4,
        },
      );

      expect(submission).toBeDefined();
      expect(submission.id).toMatch(/^sub_/);
      expect(submission.status).toBe(SubmissionStatus.DRAFT);
      expect(submission.userId).toBe('user-123');
      expect(submission.formId).toBe('tpl-leave-annual');
    });

    it('should validate required fields on submission', async () => {
      await expect(
        service.createSubmission('user-123', 'tpl-leave-annual', {
          startDate: '2025-01-15',
          // missing endDate and workingDays
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate field constraints', async () => {
      await expect(
        service.createSubmission('user-123', 'tpl-leave-annual', {
          startDate: '2025-01-15',
          endDate: '2025-01-20',
          workingDays: 50, // exceeds max of 30
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for unknown form template', async () => {
      await expect(
        service.createSubmission('user-123', 'non-existent-form', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Form Submission Flow', () => {
    let submissionId: string;

    beforeEach(async () => {
      const submission = await service.createSubmission(
        'user-123',
        'tpl-leave-annual',
        {
          startDate: '2025-01-15',
          endDate: '2025-01-20',
          workingDays: 4,
        },
      );
      submissionId = submission.id;
    });

    it('should submit a draft form', async () => {
      const submitted = await service.submitForm(submissionId);
      expect(submitted.status).toBe(SubmissionStatus.PENDING_APPROVAL);
      expect(submitted.submittedAt).toBeDefined();
      expect(submitted.currentStep).toBe(0);
    });

    it('should handle submitting already submitted form', async () => {
      await service.submitForm(submissionId);

      // The service doesn't prevent re-submission (it just updates the status)
      const resubmitted = await service.submitForm(submissionId);
      expect(resubmitted.status).toBe(SubmissionStatus.PENDING_APPROVAL);
    });

    it('should process approval action', async () => {
      await service.submitForm(submissionId);

      const approved = await service.processApproval(
        submissionId,
        'manager-123',
        'John Manager',
        ApprovalAction.APPROVE,
        'Approved!',
      );

      expect(approved.status).toBe(SubmissionStatus.APPROVED);
      expect(approved.approvals.length).toBe(1);
      expect(approved.approvals[0].approverId).toBe('manager-123');
      expect(approved.approvals[0].action).toBe(ApprovalAction.APPROVE);
    });

    it('should reject submission', async () => {
      await service.submitForm(submissionId);

      const rejected = await service.processApproval(
        submissionId,
        'manager-123',
        'John Manager',
        ApprovalAction.REJECT,
        'Not approved due to conflict',
      );

      expect(rejected.status).toBe(SubmissionStatus.REJECTED);
      expect(rejected.completedAt).toBeDefined();
    });

    it('should request changes and return to draft', async () => {
      await service.submitForm(submissionId);

      const returned = await service.processApproval(
        submissionId,
        'manager-123',
        'John Manager',
        ApprovalAction.REQUEST_CHANGES,
        'Please add more details',
      );

      expect(returned.status).toBe(SubmissionStatus.DRAFT);
    });
  });

  describe('Multi-Step Workflow', () => {
    it('should handle multi-step approval process', async () => {
      // Create submission for form with multi-step workflow (unpaid leave)
      const submission = await service.createSubmission(
        'user-123',
        'tpl-leave-unpaid',
        {
          startDate: '2025-02-01',
          endDate: '2025-02-10',
          reason: 'Personal matters',
        },
      );

      await service.submitForm(submission.id);

      // First approval (manager)
      const afterFirstApproval = await service.processApproval(
        submission.id,
        'manager-123',
        'John Manager',
        ApprovalAction.APPROVE,
      );

      expect(afterFirstApproval.status).toBe(SubmissionStatus.PENDING_APPROVAL);
      expect(afterFirstApproval.currentStep).toBe(1);

      // Second approval (HR)
      const afterSecondApproval = await service.processApproval(
        submission.id,
        'hr-123',
        'HR Admin',
        ApprovalAction.APPROVE,
      );

      expect(afterSecondApproval.status).toBe(SubmissionStatus.APPROVED);
      expect(afterSecondApproval.completedAt).toBeDefined();
    });
  });

  describe('Submission Retrieval', () => {
    it('should get submission by ID', async () => {
      const created = await service.createSubmission(
        'user-123',
        'tpl-leave-annual',
        {
          startDate: '2025-01-15',
          endDate: '2025-01-20',
          workingDays: 4,
        },
      );

      const retrieved = service.getSubmission(created.id);
      expect(retrieved.id).toBe(created.id);
    });

    it('should throw NotFoundException for unknown submission', () => {
      expect(() => service.getSubmission('non-existent-submission')).toThrow(NotFoundException);
    });

    it('should get user submissions', async () => {
      await service.createSubmission('user-123', 'tpl-leave-annual', {
        startDate: '2025-01-15',
        endDate: '2025-01-20',
        workingDays: 4,
      });

      await service.createSubmission('user-123', 'tpl-train-feedback', {
        trainingName: 'NestJS Workshop',
        trainingDate: '2025-01-10',
        overallRating: 5,
        contentQuality: 5,
        trainerQuality: 5,
        applicability: 4,
        wouldRecommend: true,
      });

      const submissions = service.getUserSubmissions('user-123');
      expect(submissions.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter user submissions by status', async () => {
      const sub1 = await service.createSubmission('user-456', 'tpl-leave-annual', {
        startDate: '2025-01-15',
        endDate: '2025-01-20',
        workingDays: 4,
      });

      await service.createSubmission('user-456', 'tpl-train-feedback', {
        trainingName: 'NestJS Workshop',
        trainingDate: '2025-01-10',
        overallRating: 5,
        contentQuality: 5,
        trainerQuality: 5,
        applicability: 4,
        wouldRecommend: true,
      });

      await service.submitForm(sub1.id);

      const pendingSubmissions = service.getUserSubmissions('user-456', SubmissionStatus.PENDING_APPROVAL);
      expect(pendingSubmissions.length).toBe(1);

      const draftSubmissions = service.getUserSubmissions('user-456', SubmissionStatus.DRAFT);
      expect(draftSubmissions.length).toBe(1);
    });

    it('should get pending approvals', async () => {
      const sub = await service.createSubmission('user-789', 'tpl-leave-annual', {
        startDate: '2025-01-15',
        endDate: '2025-01-20',
        workingDays: 4,
      });

      await service.submitForm(sub.id);

      const pendingApprovals = service.getPendingApprovals('manager-123');
      expect(pendingApprovals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create various submissions
      await service.createSubmission('user-stats-1', 'tpl-leave-annual', {
        startDate: '2025-01-15',
        endDate: '2025-01-20',
        workingDays: 4,
      });

      const sub2 = await service.createSubmission('user-stats-2', 'tpl-train-feedback', {
        trainingName: 'NestJS Workshop',
        trainingDate: '2025-01-10',
        overallRating: 5,
        contentQuality: 5,
        trainerQuality: 5,
        applicability: 4,
        wouldRecommend: true,
      });
      await service.submitForm(sub2.id);
    });

    it('should return statistics', () => {
      const stats = service.getStatistics();

      expect(stats.totalTemplates).toBeGreaterThan(20);
      expect(stats.totalSubmissions).toBeGreaterThanOrEqual(2);
      expect(stats.byCategory).toBeDefined();
      expect(stats.byStatus).toBeDefined();
    });

    it('should count submissions by category', () => {
      const stats = service.getStatistics();

      expect(stats.byCategory[FormCategory.LEAVE]).toBeGreaterThanOrEqual(1);
      expect(stats.byCategory[FormCategory.TRAINING]).toBeGreaterThanOrEqual(1);
    });

    it('should count submissions by status', () => {
      const stats = service.getStatistics();

      expect(stats.byStatus[SubmissionStatus.DRAFT]).toBeGreaterThanOrEqual(1);
      // Training feedback doesn't have workflow, so it becomes COMPLETED directly
      expect(stats.byStatus[SubmissionStatus.COMPLETED]).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Validation', () => {
    it('should validate pattern constraints', async () => {
      await expect(
        service.createSubmission('user-123', 'tpl-onboard-personal-info', {
          firstName: 'John',
          lastName: 'Doe',
          cnp: '123', // invalid CNP
          birthDate: '1990-01-01',
          birthPlace: 'Bucharest',
          citizenship: 'Română',
          address: 'Test Address',
          phone: '+40712345678',
          email: 'john@example.com',
          emergencyContact: 'Jane Doe',
          emergencyPhone: '+40712345679',
        }),
      ).rejects.toThrow();
    });

    it('should validate IBAN format', async () => {
      await expect(
        service.createSubmission('user-123', 'tpl-onboard-bank-details', {
          bankName: 'BCR',
          iban: 'INVALID_IBAN',
          accountHolder: 'John Doe',
        }),
      ).rejects.toThrow();
    });

    it('should accept valid IBAN', async () => {
      const submission = await service.createSubmission('user-123', 'tpl-onboard-bank-details', {
        bankName: 'BCR',
        iban: 'RO49AAAA1B31007593840000',
        accountHolder: 'John Doe',
      });

      expect(submission).toBeDefined();
      expect(submission.status).toBe(SubmissionStatus.DRAFT);
    });

    it('should accept valid CNP', async () => {
      const submission = await service.createSubmission('user-123', 'tpl-onboard-personal-info', {
        firstName: 'Ion',
        lastName: 'Popescu',
        cnp: '1850101221145', // Valid Romanian CNP
        birthDate: '1985-01-01',
        birthPlace: 'București',
        citizenship: 'Română',
        address: 'Str. Exemplu nr. 1, București',
        phone: '+40712345678',
        email: 'ion.popescu@example.com',
        emergencyContact: 'Maria Popescu',
        emergencyPhone: '+40712345679',
        idCard: 'https://storage.example.com/id-card.pdf', // Required file field
      });

      expect(submission).toBeDefined();
      expect(submission.status).toBe(SubmissionStatus.DRAFT);
    });
  });

  describe('Form Settings', () => {
    it('should have correct settings for leave forms', () => {
      const template = service.getTemplate('tpl-leave-annual');
      expect(template.settings.allowDrafts).toBe(true);
      expect(template.settings.allowEditing).toBe(false);
      expect(template.settings.requireSignature).toBe(false);
    });

    it('should have retention configured', () => {
      const template = service.getTemplate('tpl-onboard-personal-info');
      expect(template.settings.retentionDays).toBe(3650); // 10 years
    });

    it('should allow anonymous feedback forms', () => {
      const template = service.getTemplate('tpl-perf-360-feedback');
      expect(template.settings.anonymousAllowed).toBe(true);
    });

    it('should require signature for official documents', () => {
      const template = service.getTemplate('tpl-offboard-resignation');
      expect(template.settings.requireSignature).toBe(true);
    });
  });

  describe('Workflow Configuration', () => {
    it('should have workflow enabled for leave requests', () => {
      const template = service.getTemplate('tpl-leave-annual');
      expect(template.workflow?.enabled).toBe(true);
      expect(template.workflow?.steps.length).toBeGreaterThanOrEqual(1);
    });

    it('should have manager approval step', () => {
      const template = service.getTemplate('tpl-leave-annual');
      const managerStep = template.workflow?.steps.find(s => s.approverType === 'manager');
      expect(managerStep).toBeDefined();
      expect(managerStep!.requiredApprovals).toBe(1);
    });

    it('should have notification configuration', () => {
      const template = service.getTemplate('tpl-leave-annual');
      expect(template.workflow?.notifications.onSubmit).toBe(true);
      expect(template.workflow?.notifications.onApproval).toBe(true);
      expect(template.workflow?.notifications.channels).toContain('email');
    });

    it('should have multi-step workflow for complex forms', () => {
      const template = service.getTemplate('tpl-offboard-clearance');
      expect(template.workflow?.steps.length).toBeGreaterThanOrEqual(3);

      const stepTypes = template.workflow?.steps.map(s => s.approverType);
      expect(stepTypes).toContain('role');
      expect(stepTypes).toContain('hr');
    });
  });
});
