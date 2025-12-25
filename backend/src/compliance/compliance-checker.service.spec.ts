import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ComplianceCheckerService,
  ComplianceRule,
  ComplianceCheck,
  ComplianceDeadline,
  ComplianceReport,
  ComplianceCategory,
  Severity,
  DeadlineStatus,
  ComplianceStatus,
} from './compliance-checker.service';

describe('ComplianceCheckerService', () => {
  let service: ComplianceCheckerService;
  let eventEmitter: EventEmitter2;
  const emittedEvents: Array<{ event: string; payload: any }> = [];

  beforeEach(async () => {
    emittedEvents.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceCheckerService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn((event: string, payload: any) => {
              emittedEvents.push({ event, payload });
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ComplianceCheckerService>(ComplianceCheckerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    await service.onModuleInit();
  });

  describe('Rule Management', () => {
    it('should initialize with default rules', async () => {
      const rules = await service.listRules();
      expect(rules.length).toBe(7);
    });

    it('should list rules by category', async () => {
      const vatRules = await service.listRules({ category: 'VAT' });
      expect(vatRules.every((r) => r.category === 'VAT')).toBe(true);
    });

    it('should list only active rules by default', async () => {
      const rules = await service.listRules();
      expect(rules.every((r) => r.isActive)).toBe(true);
    });

    it('should get rule by ID', async () => {
      const rules = await service.listRules();
      const rule = await service.getRule(rules[0].id);

      expect(rule).toBeDefined();
      expect(rule?.id).toBe(rules[0].id);
    });

    it('should create new rule', async () => {
      const rule = await service.createRule({
        name: 'Custom Rule',
        nameRo: 'Regulă Personalizată',
        description: 'Custom validation rule',
        descriptionRo: 'Regulă de validare personalizată',
        category: 'VAT',
        regulation: 'Custom',
        regulationRo: 'Personalizat',
        effectiveDate: new Date(),
        isActive: true,
        severity: 'WARNING',
        validator: 'customValidator',
      });

      expect(rule.id).toMatch(/^rule-/);
      expect(rule.name).toBe('Custom Rule');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'compliance.rule.created' }),
      );
    });

    it('should update rule', async () => {
      const rules = await service.listRules();
      const updated = await service.updateRule(rules[0].id, {
        severity: 'CRITICAL',
      });

      expect(updated.severity).toBe('CRITICAL');
    });

    it('should throw error when updating non-existent rule', async () => {
      await expect(
        service.updateRule('non-existent', { severity: 'WARNING' }),
      ).rejects.toThrow('Rule not found');
    });

    it('should have Romanian translations for all default rules', async () => {
      const rules = await service.listRules();

      for (const rule of rules) {
        expect(rule.nameRo).toBeTruthy();
        expect(rule.descriptionRo).toBeTruthy();
        expect(rule.regulationRo).toBeTruthy();
      }
    });

    it('should include e-Factura rule', async () => {
      const rules = await service.listRules({ category: 'E_FACTURA' });
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].severity).toBe('CRITICAL');
    });

    it('should include SAF-T rule', async () => {
      const rules = await service.listRules({ category: 'SAF_T' });
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should include GDPR rule', async () => {
      const rules = await service.listRules({ category: 'GDPR' });
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('CUI Validation', () => {
    it('should validate valid CUI', async () => {
      // CUI 12345674 has valid checksum per Romanian algorithm
      const result = await service.validateCUI('12345674');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate CUI with RO prefix', async () => {
      const result = await service.validateCUI('RO12345674');

      expect(result.isValid).toBe(true);
      expect(result.cui).toBe('12345674');
    });

    it('should reject CUI with invalid checksum', async () => {
      // CUI 12345679 has invalid checksum (correct is 12345674)
      const result = await service.validateCUI('12345679');

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issuesRo.length).toBeGreaterThan(0);
    });

    it('should reject CUI that is too short', async () => {
      const result = await service.validateCUI('1');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('CUI must be between 2 and 10 digits');
    });

    it('should reject CUI that is too long', async () => {
      const result = await service.validateCUI('12345678901');

      expect(result.isValid).toBe(false);
    });

    it('should clean CUI from non-numeric characters', async () => {
      const result = await service.validateCUI('RO 123.456.74');

      expect(result.cui).toBe('12345674');
    });
  });

  describe('VAT Validation', () => {
    it('should validate standard VAT rate 19%', async () => {
      const result = await service.validateVAT(1000, 19, new Date('2024-06-01'));

      expect(result.isValid).toBe(true);
      expect(result.rate).toBe(19);
      expect(result.rateType).toBe('STANDARD');
    });

    it('should validate reduced VAT rate 9%', async () => {
      const result = await service.validateVAT(1000, 9, new Date('2024-06-01'));

      expect(result.isValid).toBe(true);
      expect(result.rate).toBe(9);
      expect(result.rateType).toBe('REDUCED');
    });

    it('should validate special VAT rate 5%', async () => {
      const result = await service.validateVAT(1000, 5);

      expect(result.isValid).toBe(true);
      expect(result.rate).toBe(5);
      expect(result.rateType).toBe('SPECIAL');
    });

    it('should validate zero VAT rate', async () => {
      const result = await service.validateVAT(1000, 0);

      expect(result.isValid).toBe(true);
      expect(result.rate).toBe(0);
    });

    it('should reject invalid VAT rate', async () => {
      const result = await service.validateVAT(1000, 15, new Date('2024-06-01'));

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should validate new standard rate 21% after August 2025', async () => {
      const result = await service.validateVAT(1000, 21, new Date('2025-09-01'));

      expect(result.isValid).toBe(true);
      expect(result.rate).toBe(21);
      expect(result.rateType).toBe('STANDARD');
    });

    it('should validate new reduced rate 11% after August 2025', async () => {
      const result = await service.validateVAT(1000, 11, new Date('2025-09-01'));

      expect(result.isValid).toBe(true);
      expect(result.rate).toBe(11);
      expect(result.rateType).toBe('REDUCED');
    });

    it('should reject old 19% rate after August 2025', async () => {
      const result = await service.validateVAT(1000, 19, new Date('2025-09-01'));

      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('after August 2025');
    });

    it('should have Romanian translations for VAT issues', async () => {
      const result = await service.validateVAT(1000, 15);

      expect(result.issuesRo.length).toBeGreaterThan(0);
      expect(result.issuesRo[0]).toContain('invalidă');
    });
  });

  describe('e-Factura XML Validation', () => {
    const validXML = `<?xml version="1.0"?>
      <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
               xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
               xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
        <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#RO_CIUS</cbc:CustomizationID>
        <cbc:ID>INV-001</cbc:ID>
        <cbc:IssueDate>2025-01-01</cbc:IssueDate>
        <cac:AccountingSupplierParty>...</cac:AccountingSupplierParty>
        <cac:AccountingCustomerParty>...</cac:AccountingCustomerParty>
      </Invoice>`;

    it('should validate correct e-Factura XML', async () => {
      const result = await service.validateEFacturaXML(validXML);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('UBL 2.1');
      expect(result.version).toBe('RO_CIUS');
    });

    it('should reject XML without UBL namespace', async () => {
      const invalidXML = `<?xml version="1.0"?><Invoice><ID>1</ID></Invoice>`;
      const result = await service.validateEFacturaXML(invalidXML);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.field === 'namespace')).toBe(true);
    });

    it('should reject XML without RO_CIUS customization', async () => {
      const invalidXML = `<?xml version="1.0"?>
        <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
          <cbc:ID>1</cbc:ID>
        </Invoice>`;
      const result = await service.validateEFacturaXML(invalidXML);

      expect(result.issues.some((i) => i.field === 'customization')).toBe(true);
    });

    it('should check for required fields', async () => {
      const incompleteXML = `<?xml version="1.0"?>
        <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
          <cbc:CustomizationID>RO_CIUS</cbc:CustomizationID>
        </Invoice>`;
      const result = await service.validateEFacturaXML(incompleteXML);

      expect(result.issues.some((i) => i.message.includes('Invoice ID'))).toBe(true);
      expect(result.issues.some((i) => i.message.includes('Issue Date'))).toBe(true);
    });

    it('should include Romanian translations for issues', async () => {
      const invalidXML = `<?xml version="1.0"?><Invoice></Invoice>`;
      const result = await service.validateEFacturaXML(invalidXML);

      for (const issue of result.issues) {
        expect(issue.messageRo).toBeTruthy();
      }
    });

    it('should classify issue severity', async () => {
      const invalidXML = `<?xml version="1.0"?><Invoice></Invoice>`;
      const result = await service.validateEFacturaXML(invalidXML);

      const namespaceIssue = result.issues.find((i) => i.field === 'namespace');
      expect(namespaceIssue?.severity).toBe('CRITICAL');
    });
  });

  describe('Compliance Checks', () => {
    it('should run compliance check', async () => {
      const check = await service.runComplianceCheck('cust-1', 'CUI_VALIDATION', {
        cui: '12345674',
      });

      expect(check.id).toMatch(/^check-/);
      expect(check.category).toBe('CUI_VALIDATION');
      expect(check.status).toBe('COMPLIANT');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'compliance.check.completed' }),
      );
    });

    it('should detect non-compliant CUI', async () => {
      const check = await service.runComplianceCheck('cust-2', 'CUI_VALIDATION', {
        cui: 'invalid',
      });

      expect(check.status).toBe('NON_COMPLIANT');
      expect(check.issues.length).toBeGreaterThan(0);
    });

    it('should detect non-compliant VAT rate', async () => {
      const check = await service.runComplianceCheck('cust-3', 'VAT', {
        vatRate: 15,
      });

      expect(check.status).toBe('NON_COMPLIANT');
      expect(check.issues.some((i) => i.affectedField === 'vatRate')).toBe(true);
    });

    it('should detect missing e-Factura submission', async () => {
      const check = await service.runComplianceCheck('cust-4', 'E_FACTURA', {
        invoice: { isB2B: true, eFacturaId: null },
      });

      expect(check.status).toBe('NON_COMPLIANT');
    });

    it('should pass e-Factura check when submitted', async () => {
      const check = await service.runComplianceCheck('cust-5', 'E_FACTURA', {
        invoice: { isB2B: true, eFacturaId: 'EF-123' },
      });

      expect(check.status).toBe('COMPLIANT');
    });

    it('should detect GDPR consent issues', async () => {
      const check = await service.runComplianceCheck('cust-6', 'GDPR', {
        personalData: true,
        consentObtained: false,
      });

      expect(check.status).toBe('NON_COMPLIANT');
      expect(check.issues.some((i) => i.affectedField === 'consent')).toBe(true);
    });

    it('should get check by ID', async () => {
      const created = await service.runComplianceCheck('cust-7', 'VAT', {
        vatRate: 19,
      });
      const retrieved = await service.getCheck(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should list checks by customer', async () => {
      await service.runComplianceCheck('cust-8', 'VAT', { vatRate: 19 });
      await service.runComplianceCheck('cust-8', 'CUI_VALIDATION', { cui: '12345674' });
      await service.runComplianceCheck('cust-9', 'VAT', { vatRate: 19 });

      const checks = await service.listChecks('cust-8');
      expect(checks.length).toBe(2);
    });

    it('should filter checks by category', async () => {
      await service.runComplianceCheck('cust-10', 'VAT', { vatRate: 19 });
      await service.runComplianceCheck('cust-10', 'CUI_VALIDATION', { cui: '12345674' });

      const vatChecks = await service.listChecks('cust-10', { category: 'VAT' });
      expect(vatChecks.every((c) => c.category === 'VAT')).toBe(true);
    });

    it('should filter checks by status', async () => {
      await service.runComplianceCheck('cust-11', 'VAT', { vatRate: 19 });
      await service.runComplianceCheck('cust-11', 'VAT', { vatRate: 15 });

      const compliant = await service.listChecks('cust-11', { status: 'COMPLIANT' });
      const nonCompliant = await service.listChecks('cust-11', { status: 'NON_COMPLIANT' });

      expect(compliant.every((c) => c.status === 'COMPLIANT')).toBe(true);
      expect(nonCompliant.every((c) => c.status === 'NON_COMPLIANT')).toBe(true);
    });

    it('should sort checks by date descending', async () => {
      await service.runComplianceCheck('cust-12', 'VAT', { vatRate: 19 });
      await new Promise((r) => setTimeout(r, 10));
      await service.runComplianceCheck('cust-12', 'VAT', { vatRate: 9 });

      const checks = await service.listChecks('cust-12');
      expect(checks[0].checkedAt.getTime()).toBeGreaterThan(checks[1].checkedAt.getTime());
    });

    it('should include Romanian details', async () => {
      const check = await service.runComplianceCheck('cust-13', 'VAT', {
        vatRate: 15,
      });

      expect(check.detailsRo).toBeTruthy();
      for (const issue of check.issues) {
        expect(issue.titleRo).toBeTruthy();
        expect(issue.recommendationRo).toBeTruthy();
      }
    });
  });

  describe('Deadline Management', () => {
    it('should create deadline', async () => {
      const deadline = await service.createDeadline({
        name: 'VAT Declaration',
        nameRo: 'Declarație TVA',
        description: 'Monthly VAT declaration',
        descriptionRo: 'Declarație TVA lunară',
        category: 'TAX_DECLARATION',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        regulation: 'Tax Code',
        reminderDays: [7, 3, 1],
        recurring: true,
        recurrencePattern: 'MONTHLY',
      });

      expect(deadline.id).toMatch(/^deadline-/);
      expect(deadline.status).toBe('UPCOMING');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'compliance.deadline.created' }),
      );
    });

    it('should set status to DUE_SOON for deadlines within 3 days', async () => {
      const deadline = await service.createDeadline({
        name: 'Urgent',
        nameRo: 'Urgent',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });

      expect(deadline.status).toBe('DUE_SOON');
    });

    it('should set status to OVERDUE for past deadlines', async () => {
      const deadline = await service.createDeadline({
        name: 'Overdue',
        nameRo: 'Întârziat',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });

      expect(deadline.status).toBe('OVERDUE');
    });

    it('should get deadline by ID', async () => {
      const created = await service.createDeadline({
        name: 'Test',
        nameRo: 'Test',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });
      const retrieved = await service.getDeadline(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test');
    });

    it('should list deadlines by category', async () => {
      await service.createDeadline({
        name: 'VAT 1',
        nameRo: 'TVA 1',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });
      await service.createDeadline({
        name: 'SAF-T',
        nameRo: 'SAF-T',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'SAF_T',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });

      const vatDeadlines = await service.listDeadlines({ category: 'VAT' });
      expect(vatDeadlines.every((d) => d.category === 'VAT')).toBe(true);
    });

    it('should list upcoming deadlines', async () => {
      await service.createDeadline({
        name: 'Future',
        nameRo: 'Viitor',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });
      await service.createDeadline({
        name: 'Past',
        nameRo: 'Trecut',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });

      const upcoming = await service.listDeadlines({ upcoming: true });
      expect(upcoming.every((d) => d.dueDate > new Date())).toBe(true);
    });

    it('should sort deadlines by due date', async () => {
      await service.createDeadline({
        name: 'Later',
        nameRo: 'Mai târziu',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });
      await service.createDeadline({
        name: 'Sooner',
        nameRo: 'Mai devreme',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });

      const deadlines = await service.listDeadlines();
      for (let i = 1; i < deadlines.length; i++) {
        expect(deadlines[i].dueDate.getTime()).toBeGreaterThanOrEqual(
          deadlines[i - 1].dueDate.getTime(),
        );
      }
    });

    it('should complete deadline', async () => {
      const deadline = await service.createDeadline({
        name: 'To Complete',
        nameRo: 'De Completat',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });

      const completed = await service.completeDeadline(deadline.id);

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'compliance.deadline.completed' }),
      );
    });

    it('should throw error when completing non-existent deadline', async () => {
      await expect(service.completeDeadline('non-existent')).rejects.toThrow(
        'Deadline not found',
      );
    });

    it('should update deadline statuses', async () => {
      // Create a deadline that was upcoming but is now overdue
      const deadline = await service.createDeadline({
        name: 'Will Become Overdue',
        nameRo: 'Va Deveni Întârziat',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days past
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });

      // Verify updateDeadlineStatuses runs without error
      const updated = await service.updateDeadlineStatuses();
      expect(updated).toBeGreaterThanOrEqual(0);

      // Deadline should be OVERDUE
      const retrieved = await service.getDeadline(deadline.id);
      expect(retrieved?.status).toBe('OVERDUE');
    });
  });

  describe('Compliance Reports', () => {
    beforeEach(async () => {
      // Create some compliance checks
      await service.runComplianceCheck('cust-report', 'VAT', { vatRate: 19 });
      await service.runComplianceCheck('cust-report', 'CUI_VALIDATION', { cui: '12345674' });
      await service.runComplianceCheck('cust-report', 'VAT', { vatRate: 15 }); // Non-compliant
    });

    it('should generate compliance report', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await service.generateReport('cust-report', period);

      expect(report.id).toMatch(/^report-/);
      expect(report.customerId).toBe('cust-report');
      expect(report.categories.length).toBeGreaterThan(0);
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'compliance.report.generated' }),
      );
    });

    it('should calculate overall status', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await service.generateReport('cust-report', period);

      // Has non-compliant check, so overall should not be COMPLIANT
      expect(['NON_COMPLIANT', 'PARTIAL']).toContain(report.overallStatus);
    });

    it('should calculate compliance score', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await service.generateReport('cust-report', period);

      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
    });

    it('should include category summaries', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await service.generateReport('cust-report', period);

      for (const category of report.categories) {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('status');
        expect(category).toHaveProperty('checksPassed');
        expect(category).toHaveProperty('checksFailed');
        expect(category).toHaveProperty('issueCount');
      }
    });

    it('should include recommendations', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await service.generateReport('cust-report', period);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendationsRo.length).toBeGreaterThan(0);
    });

    it('should have Romanian title', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await service.generateReport('cust-report', period);

      expect(report.titleRo).toContain('Raport Conformitate');
    });

    it('should get report by ID', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const created = await service.generateReport('cust-report', period);
      const retrieved = await service.getReport(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should list reports by customer', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      await service.generateReport('cust-report', period);
      await service.generateReport('cust-report', period);

      const reports = await service.listReports('cust-report');
      expect(reports.length).toBe(2);
    });

    it('should sort reports by date descending', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      await service.generateReport('cust-report', period);
      await new Promise((r) => setTimeout(r, 10));
      await service.generateReport('cust-report', period);

      const reports = await service.listReports('cust-report');
      expect(reports[0].generatedAt.getTime()).toBeGreaterThan(reports[1].generatedAt.getTime());
    });
  });

  describe('Romanian Localization', () => {
    it('should translate compliance categories', () => {
      expect(service.getCategoryName('VAT')).toBe('TVA');
      expect(service.getCategoryName('E_FACTURA')).toBe('e-Factura');
      expect(service.getCategoryName('SAF_T')).toBe('SAF-T (D406)');
      expect(service.getCategoryName('GDPR')).toBe('GDPR');
      expect(service.getCategoryName('CUI_VALIDATION')).toBe('Validare CUI');
      expect(service.getCategoryName('INVOICE_FORMAT')).toBe('Format Factură');
    });

    it('should translate severity levels', () => {
      expect(service.getSeverityName('INFO')).toBe('Informare');
      expect(service.getSeverityName('WARNING')).toBe('Avertisment');
      expect(service.getSeverityName('ERROR')).toBe('Eroare');
      expect(service.getSeverityName('CRITICAL')).toBe('Critic');
    });

    it('should get all categories with translations', () => {
      const categories = service.getAllCategories();

      expect(categories.length).toBe(8);
      expect(categories).toContainEqual({
        category: 'VAT',
        name: 'VAT',
        nameRo: 'TVA',
      });
    });

    it('should use Romanian diacritics correctly', () => {
      expect(service.getCategoryName('INVOICE_FORMAT')).toContain('ă'); // Factură
      expect(service.getCategoryName('TAX_DECLARATION')).toContain('ț'); // Declarație
    });
  });

  describe('VAT Rates', () => {
    it('should return current VAT rates before August 2025', () => {
      const rates = service.getVATRates(new Date('2025-06-01'));

      expect(rates).toContainEqual(
        expect.objectContaining({ rate: 19, type: 'STANDARD' }),
      );
      expect(rates).toContainEqual(
        expect.objectContaining({ rate: 9, type: 'REDUCED' }),
      );
      expect(rates).toContainEqual(
        expect.objectContaining({ rate: 5, type: 'SPECIAL' }),
      );
    });

    it('should return new VAT rates after August 2025', () => {
      const rates = service.getVATRates(new Date('2025-09-01'));

      expect(rates).toContainEqual(
        expect.objectContaining({ rate: 21, type: 'STANDARD' }),
      );
      expect(rates).toContainEqual(
        expect.objectContaining({ rate: 11, type: 'REDUCED' }),
      );
    });

    it('should include Romanian descriptions for VAT rates', () => {
      const rates = service.getVATRates();

      for (const rate of rates) {
        expect(rate.descriptionRo).toBeTruthy();
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should perform full compliance audit', async () => {
      const customerId = 'audit-customer';

      // Run multiple compliance checks
      await service.runComplianceCheck(customerId, 'CUI_VALIDATION', { cui: '12345674' });
      await service.runComplianceCheck(customerId, 'VAT', { vatRate: 19 });
      await service.runComplianceCheck(customerId, 'E_FACTURA', {
        invoice: { isB2B: true, eFacturaId: 'EF-123' },
      });
      await service.runComplianceCheck(customerId, 'GDPR', {
        personalData: true,
        consentObtained: true,
      });

      // Generate report
      const report = await service.generateReport(customerId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      expect(report.overallStatus).toBe('COMPLIANT');
      expect(report.score).toBe(100);
    });

    it('should track compliance over time', async () => {
      const customerId = 'track-customer';

      // Run a non-compliant check (invalid VAT rate)
      await service.runComplianceCheck(customerId, 'VAT', { vatRate: 15 });

      // Run a compliant check (valid VAT rate)
      await service.runComplianceCheck(customerId, 'VAT', { vatRate: 19 });

      // Generate report covering both checks
      const report = await service.generateReport(customerId, {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 1000),
      });

      // Report should show partial compliance (one pass, one fail)
      expect(report.overallStatus).toBe('NON_COMPLIANT');
      expect(report.score).toBeLessThan(100);
      expect(report.categories.length).toBeGreaterThan(0);
    });

    it('should manage deadline workflow', async () => {
      // Create deadline
      const deadline = await service.createDeadline({
        customerId: 'deadline-customer',
        name: 'D406 Submission',
        nameRo: 'Transmitere D406',
        description: 'Monthly SAF-T submission',
        descriptionRo: 'Transmitere lunară SAF-T',
        category: 'SAF_T',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        regulation: 'Order 1783/2021',
        reminderDays: [7, 3, 1],
        recurring: true,
        recurrencePattern: 'MONTHLY',
      });

      // Check it's in upcoming
      const upcoming = await service.listDeadlines({ upcoming: true });
      expect(upcoming.some((d) => d.id === deadline.id)).toBe(true);

      // Complete it
      await service.completeDeadline(deadline.id);

      // Should no longer be in upcoming
      const upcomingAfter = await service.listDeadlines({ upcoming: true });
      expect(upcomingAfter.some((d) => d.id === deadline.id)).toBe(false);
    });

    it('should emit all relevant events', async () => {
      emittedEvents.length = 0;

      // Create rule
      await service.createRule({
        name: 'Test',
        nameRo: 'Test',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        regulation: 'Test',
        regulationRo: 'Test',
        effectiveDate: new Date(),
        isActive: true,
        severity: 'INFO',
        validator: 'test',
      });

      // Run check
      await service.runComplianceCheck('events-customer', 'VAT', { vatRate: 19 });

      // Create deadline
      const deadline = await service.createDeadline({
        name: 'Test',
        nameRo: 'Test',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'VAT',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        regulation: 'Test',
        reminderDays: [],
        recurring: false,
      });

      // Complete deadline
      await service.completeDeadline(deadline.id);

      // Generate report
      await service.generateReport('events-customer', {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      const eventNames = emittedEvents.map((e) => e.event);
      expect(eventNames).toContain('compliance.rule.created');
      expect(eventNames).toContain('compliance.check.completed');
      expect(eventNames).toContain('compliance.deadline.created');
      expect(eventNames).toContain('compliance.deadline.completed');
      expect(eventNames).toContain('compliance.report.generated');
    });
  });
});
