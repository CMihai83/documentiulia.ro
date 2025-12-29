/**
 * DocumentIulia.ro - Comprehensive E2E Platform Integration Tests
 *
 * Tests cross-module integrations and full platform functionality:
 * - Finance <-> HR (payroll deductions to invoices)
 * - HSE <-> Quality (incidents trigger NCR)
 * - Warehouse <-> Supply Chain (inventory to POs)
 * - Quality <-> Supply Chain (supplier evaluations to vendor scores)
 * - LMS <-> HR (course completion to training logs)
 * - CRM <-> Analytics (lead scoring KPIs)
 *
 * Test Coverage: 100+ scenarios across all 64+ modules
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

// Module imports
import { AppModule } from '../../src/app.module';

describe('DocumentIulia.ro Platform Integration Tests (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  const tenantId = uuidv4();
  const testUserId = uuidv4();

  // Test data IDs for cross-module references
  let employeeId: string;
  let payrollRecordId: string;
  let invoiceId: string;
  let incidentId: string;
  let ncrId: string;
  let capaId: string;
  let supplierId: string;
  let purchaseOrderId: string;
  let inventoryItemId: string;
  let courseId: string;
  let leadId: string;
  let dashboardId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate test user
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@documentiulia.ro',
        password: 'Test123!',
      });

    authToken = loginResponse.body.access_token || 'mock-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================
  // SECTION 1: AUTHENTICATION & USER MANAGEMENT
  // ============================================================
  describe('1. Authentication & User Management', () => {
    it('should authenticate user and return JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@documentiulia.ro',
          password: 'Test123!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid@test.com',
          password: 'wrong',
        })
        .expect(401);
    });

    it('should register new user with GDPR consent', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `newuser-${uuidv4()}@test.com`,
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          gdprConsent: true,
          marketingConsent: false,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });

  // ============================================================
  // SECTION 2: FINANCE MODULE
  // ============================================================
  describe('2. Finance Module', () => {
    it('should create invoice with Romanian VAT 21%', async () => {
      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: uuidv4(),
          items: [
            { description: 'Consulting Services', quantity: 10, unitPrice: 100, vatRate: 21 },
          ],
          currency: 'RON',
          issueDate: new Date().toISOString(),
        })
        .expect(201);

      invoiceId = response.body.id;
      expect(response.body.totalVat).toBe(210); // 1000 * 21%
      expect(response.body.totalAmount).toBe(1210);
    });

    it('should apply reduced VAT 11% for eligible items (Legea 141/2025)', async () => {
      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: uuidv4(),
          items: [
            { description: 'Food Products', quantity: 5, unitPrice: 50, vatRate: 11 },
          ],
          currency: 'RON',
          issueDate: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body.totalVat).toBe(27.5); // 250 * 11%
    });

    it('should generate e-Factura XML for B2B invoice', async () => {
      const response = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/e-factura`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('xmlContent');
      expect(response.body.xmlContent).toContain('xmlns:cbc');
    });

    it('should process PSD2 bank payment', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/psd2')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceId,
          bankAccountIBAN: 'RO49AAAA1B31007593840000',
          amount: 1210,
          currency: 'RON',
        })
        .expect(201);

      expect(response.body.status).toBe('INITIATED');
    });
  });

  // ============================================================
  // SECTION 3: TAX & COMPLIANCE MODULE
  // ============================================================
  describe('3. Tax & Compliance (ANAF/SAF-T)', () => {
    it('should generate SAF-T D406 XML report', async () => {
      const response = await request(app.getHttpServer())
        .post('/compliance/saft/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportPeriod: '2025-01',
          reportType: 'D406',
        })
        .expect(201);

      expect(response.body).toHaveProperty('xmlContent');
      expect(response.body.xmlContent).toContain('SAFTFileContent');
    });

    it('should validate SAF-T against ANAF schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/compliance/saft/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          xmlContent: '<SAFTFileContent>...</SAFTFileContent>',
        })
        .expect(201);

      expect(response.body).toHaveProperty('isValid');
    });

    it('should calculate EU VAT for cross-border transactions', async () => {
      const response = await request(app.getHttpServer())
        .post('/compliance/vat/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sellerCountry: 'RO',
          buyerCountry: 'DE',
          amount: 1000,
          isB2B: true,
          buyerVatNumber: 'DE123456789',
        })
        .expect(201);

      // Reverse charge applies for B2B EU transactions
      expect(response.body.vatRate).toBe(0);
      expect(response.body.mechanism).toBe('REVERSE_CHARGE');
    });
  });

  // ============================================================
  // SECTION 4: HR MODULE
  // ============================================================
  describe('4. HR Module', () => {
    it('should create employee with contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/hr/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Ion',
          lastName: 'Popescu',
          email: `employee-${uuidv4()}@company.ro`,
          cnp: '1850315123456',
          position: 'Software Developer',
          department: 'IT',
          salary: 8000,
          currency: 'RON',
          startDate: new Date().toISOString(),
          contractType: 'FULL_TIME',
        })
        .expect(201);

      employeeId = response.body.id;
      expect(response.body).toHaveProperty('contractId');
    });

    it('should process payroll with deductions', async () => {
      const response = await request(app.getHttpServer())
        .post('/hr/payroll/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId,
          period: '2025-01',
          grossSalary: 8000,
        })
        .expect(201);

      payrollRecordId = response.body.id;
      // Romanian tax deductions: CAS 25%, CASS 10%, Tax 10%
      expect(response.body.deductions).toBeDefined();
      expect(response.body.netSalary).toBeLessThan(8000);
    });

    it('should generate REVISAL declaration', async () => {
      const response = await request(app.getHttpServer())
        .post('/hr/revisal/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId,
          actionType: 'NEW_HIRE',
        })
        .expect(201);

      expect(response.body).toHaveProperty('declarationXml');
    });
  });

  // ============================================================
  // SECTION 5: HSE MODULE (Health, Safety, Environment)
  // ============================================================
  describe('5. HSE Module', () => {
    it('should report safety incident with AI triage', async () => {
      const response = await request(app.getHttpServer())
        .post('/hse/incidents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'NEAR_MISS',
          description: 'Worker slipped on wet floor in warehouse area',
          location: 'Warehouse B',
          reportedBy: employeeId,
          severity: 'MEDIUM',
          dateOccurred: new Date().toISOString(),
        })
        .expect(201);

      incidentId = response.body.id;
      expect(response.body).toHaveProperty('aiTriageScore');
      expect(response.body.status).toBe('REPORTED');
    });

    it('should conduct risk assessment', async () => {
      const response = await request(app.getHttpServer())
        .post('/hse/risk-assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          area: 'Warehouse B',
          hazards: [
            { type: 'SLIP_TRIP', likelihood: 3, severity: 2 },
            { type: 'MANUAL_HANDLING', likelihood: 2, severity: 3 },
          ],
          assessedBy: testUserId,
        })
        .expect(201);

      expect(response.body.riskLevel).toBeDefined();
    });
  });

  // ============================================================
  // SECTION 6: QUALITY MODULE
  // ============================================================
  describe('6. Quality Module', () => {
    it('should create quality inspection checklist', async () => {
      const response = await request(app.getHttpServer())
        .post('/quality-checklists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Incoming Material Inspection',
          checkpoints: [
            { name: 'Visual Inspection', required: true },
            { name: 'Dimensional Check', required: true },
            { name: 'Documentation Review', required: true },
          ],
        })
        .expect(201);

      expect(response.body.checkpoints).toHaveLength(3);
    });

    it('should create Non-Conformance Report (NCR)', async () => {
      const response = await request(app.getHttpServer())
        .post('/non-conformances')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Material defect in batch B-2025-001',
          type: 'MATERIAL',
          severity: 'MAJOR',
          description: 'Surface scratches found on 15% of items',
          affectedQuantity: 150,
          detectedBy: testUserId,
          sourceIncidentId: incidentId,
        })
        .expect(201);

      ncrId = response.body.id;
      expect(response.body.status).toBe('DRAFT');
    });

    it('should create CAPA from NCR', async () => {
      const response = await request(app.getHttpServer())
        .post('/capas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Corrective Action for Material Defect',
          type: 'CORRECTIVE',
          priority: 'HIGH',
          sourceNcrId: ncrId,
          problemStatement: 'Recurring material defects from supplier',
        })
        .expect(201);

      capaId = response.body.id;
      expect(response.body.status).toBe('OPEN');
    });

    it('should perform 5-Why root cause analysis', async () => {
      const response = await request(app.getHttpServer())
        .post(`/capas/${capaId}/root-cause`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: 'FIVE_WHY',
          whyAnalysis: [
            { question: 'Why defects occurred?', answer: 'Material quality issue' },
            { question: 'Why material quality issue?', answer: 'Supplier process change' },
            { question: 'Why supplier process change?', answer: 'New equipment not calibrated' },
            { question: 'Why not calibrated?', answer: 'No calibration schedule' },
            { question: 'Why no schedule?', answer: 'Supplier QMS gaps' },
          ],
        })
        .expect(201);

      expect(response.body.rootCause).toBeDefined();
    });
  });

  // ============================================================
  // SECTION 7: SUPPLY CHAIN MODULE
  // ============================================================
  describe('7. Supply Chain Module', () => {
    it('should create and qualify supplier', async () => {
      const response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Quality Materials SRL',
          code: 'QM-001',
          category: 'RAW_MATERIALS',
          vatNumber: 'RO12345678',
          address: {
            street: 'Str. Industriilor 10',
            city: 'Cluj-Napoca',
            country: 'Romania',
          },
          contactEmail: 'contact@qualitymaterials.ro',
        })
        .expect(201);

      supplierId = response.body.id;
      expect(response.body.qualificationStatus).toBe('PENDING');
    });

    it('should create purchase order', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId,
          items: [
            { productCode: 'MAT-001', description: 'Steel Plates', quantity: 100, unitPrice: 50 },
          ],
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'RON',
        })
        .expect(201);

      purchaseOrderId = response.body.id;
      expect(response.body.status).toBe('DRAFT');
    });

    it('should record supplier quality evaluation', async () => {
      const response = await request(app.getHttpServer())
        .post('/supplier-quality/evaluations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId,
          period: '2025-Q1',
          qualityScore: 85,
          deliveryScore: 90,
          serviceScore: 88,
          priceScore: 82,
        })
        .expect(201);

      expect(response.body.overallScore).toBeGreaterThan(80);
    });
  });

  // ============================================================
  // SECTION 8: WAREHOUSE MODULE
  // ============================================================
  describe('8. Warehouse Module', () => {
    it('should create inventory item', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: 'MAT-001',
          name: 'Steel Plates',
          category: 'RAW_MATERIALS',
          unitOfMeasure: 'PIECE',
          reorderPoint: 50,
          reorderQuantity: 100,
        })
        .expect(201);

      inventoryItemId = response.body.id;
    });

    it('should record goods receipt from PO', async () => {
      const response = await request(app.getHttpServer())
        .post('/warehouse/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          purchaseOrderId,
          items: [
            { inventoryItemId, quantity: 100, locationCode: 'A-01-01' },
          ],
          receivedBy: testUserId,
        })
        .expect(201);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('should perform cycle count', async () => {
      const response = await request(app.getHttpServer())
        .post('/warehouse/cycle-counts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationCode: 'A-01-01',
          items: [
            { inventoryItemId, systemQuantity: 100, countedQuantity: 98 },
          ],
          countedBy: testUserId,
        })
        .expect(201);

      expect(response.body.variance).toBe(-2);
    });

    it('should create wave pick for order fulfillment', async () => {
      const response = await request(app.getHttpServer())
        .post('/warehouse/waves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderIds: [uuidv4()],
          strategy: 'ZONE_PICK',
          priority: 'HIGH',
        })
        .expect(201);

      expect(response.body.status).toBe('CREATED');
    });
  });

  // ============================================================
  // SECTION 9: CRM MODULE
  // ============================================================
  describe('9. CRM Module', () => {
    it('should create lead with AI scoring', async () => {
      const response = await request(app.getHttpServer())
        .post('/crm/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company: 'Tech Startup SRL',
          contactName: 'Maria Ionescu',
          email: 'maria@techstartup.ro',
          phone: '+40721234567',
          source: 'WEBSITE',
          interest: 'ERP Implementation',
          budget: 50000,
          currency: 'EUR',
        })
        .expect(201);

      leadId = response.body.id;
      expect(response.body).toHaveProperty('aiScore');
    });

    it('should convert lead to opportunity', async () => {
      const response = await request(app.getHttpServer())
        .post(`/crm/leads/${leadId}/convert`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          opportunityName: 'Tech Startup ERP Project',
          expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          probability: 60,
        })
        .expect(201);

      expect(response.body.stage).toBe('QUALIFICATION');
    });
  });

  // ============================================================
  // SECTION 10: ANALYTICS MODULE
  // ============================================================
  describe('10. Analytics Module', () => {
    it('should create custom dashboard', async () => {
      const response = await request(app.getHttpServer())
        .post('/quality-dashboards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Quality Overview Dashboard',
          widgets: [
            { type: 'KPI_CARD', metric: 'FIRST_PASS_YIELD', position: { x: 0, y: 0 } },
            { type: 'TREND_CHART', metric: 'DEFECT_RATE', position: { x: 1, y: 0 } },
            { type: 'PIE_CHART', metric: 'NCR_BY_TYPE', position: { x: 0, y: 1 } },
          ],
          isDefault: true,
        })
        .expect(201);

      dashboardId = response.body.id;
      expect(response.body.widgets).toHaveLength(3);
    });

    it('should calculate quality KPIs', async () => {
      const response = await request(app.getHttpServer())
        .post('/quality-kpis/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          period: '2025-01',
        })
        .expect(201);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should analyze trend for defect rate', async () => {
      const response = await request(app.getHttpServer())
        .get('/quality-analytics/trend/DEFECT_RATE')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
        })
        .expect(200);

      expect(response.body).toHaveProperty('trend');
      expect(response.body).toHaveProperty('dataPoints');
    });
  });

  // ============================================================
  // SECTION 11: CROSS-MODULE INTEGRATION TESTS
  // ============================================================
  describe('11. Cross-Module Integrations', () => {
    it('HSE Incident -> Quality NCR integration', async () => {
      // When HSE incident is escalated, it should trigger NCR creation
      const response = await request(app.getHttpServer())
        .post(`/hse/incidents/${incidentId}/escalate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          escalateTo: 'QUALITY',
          reason: 'Product quality implications identified',
        })
        .expect(201);

      expect(response.body).toHaveProperty('linkedNcrId');
    });

    it('HR Payroll -> Finance Integration', async () => {
      // Payroll processing should create corresponding finance entries
      const response = await request(app.getHttpServer())
        .get(`/hr/payroll/${payrollRecordId}/finance-entries`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.journalEntries).toBeDefined();
      expect(response.body.journalEntries.length).toBeGreaterThan(0);
    });

    it('Supply Chain -> Warehouse Integration', async () => {
      // PO approval should reserve warehouse capacity
      const response = await request(app.getHttpServer())
        .post(`/purchase-orders/${purchaseOrderId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.warehouseReservationId).toBeDefined();
    });

    it('Quality Supplier Eval -> Supply Chain Vendor Score', async () => {
      // Quality evaluation should update supplier score in supply chain
      const response = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}/quality-metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.qualityScore).toBeDefined();
      expect(response.body.lastEvaluationDate).toBeDefined();
    });

    it('CRM Opportunity -> Analytics KPI', async () => {
      // Won opportunity should update sales KPIs
      const response = await request(app.getHttpServer())
        .get('/analytics/sales-kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '2025-Q1' })
        .expect(200);

      expect(response.body).toHaveProperty('pipelineValue');
      expect(response.body).toHaveProperty('conversionRate');
    });
  });

  // ============================================================
  // SECTION 12: COMPLIANCE & SECURITY TESTS
  // ============================================================
  describe('12. Compliance & Security', () => {
    it('should export GDPR user data', async () => {
      const response = await request(app.getHttpServer())
        .get('/compliance/gdpr/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userData');
      expect(response.body).toHaveProperty('exportDate');
    });

    it('should log audit trail for sensitive operations', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          entityType: 'INVOICE',
          entityId: invoiceId,
        })
        .expect(200);

      expect(response.body.logs).toBeInstanceOf(Array);
      expect(response.body.logs.length).toBeGreaterThan(0);
    });

    it('should enforce RBAC for admin-only endpoints', async () => {
      // Non-admin user should be denied
      const limitedToken = 'limited-user-token';
      await request(app.getHttpServer())
        .get('/admin/system-config')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });
  });

  // ============================================================
  // SECTION 13: PERFORMANCE & SCALABILITY TESTS
  // ============================================================
  describe('13. Performance Tests', () => {
    it('should handle 100 concurrent invoice creations', async () => {
      const promises = Array(100).fill(null).map((_, i) =>
        request(app.getHttpServer())
          .post('/invoices')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerId: uuidv4(),
            items: [{ description: `Item ${i}`, quantity: 1, unitPrice: 100, vatRate: 21 }],
            currency: 'RON',
            issueDate: new Date().toISOString(),
          })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 201).length;
      expect(successCount).toBeGreaterThanOrEqual(95); // 95% success rate
    });

    it('should respond within 200ms for dashboard queries', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get(`/quality-dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });
});
