import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

/**
 * Critical User Flow E2E Tests
 *
 * Tests for core business operations:
 * 1. User Authentication & Onboarding
 * 2. Invoice Creation & Management
 * 3. OCR Document Processing
 * 4. VAT Calculation & Reporting
 * 5. Payment Recording
 * 6. Dashboard Analytics
 */

describe('Critical User Flows (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: string;
  let testInvoiceId: string;

  const testUser = {
    email: 'e2e-test@documentiulia.ro',
    password: 'TestPassword123!',
    name: 'E2E Test User',
    company: 'E2E Test Company SRL',
    cui: 'RO99999999',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // Import your AppModule here
      imports: [],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. AUTHENTICATION FLOW
  // ============================================================================

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email);
      testUserId = response.body.id;
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      authToken = response.body.accessToken;
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should access protected route with valid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should reject access without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });

  // ============================================================================
  // 2. ONBOARDING FLOW
  // ============================================================================

  describe('Onboarding Flow', () => {
    it('should get onboarding status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('currentStep');
      expect(response.body).toHaveProperty('completed');
    });

    it('should complete company setup step', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/onboarding/company')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          companyName: 'E2E Test Company SRL',
          cui: 'RO99999999',
          regCom: 'J40/1234/2025',
          address: 'Str. Test 123',
          city: 'București',
          county: 'Sector 1',
        })
        .expect(200);
    });

    it('should select business modules', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/onboarding/modules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modules: ['invoices', 'vat', 'reports', 'hr'],
        })
        .expect(200);
    });
  });

  // ============================================================================
  // 3. INVOICE MANAGEMENT FLOW
  // ============================================================================

  describe('Invoice Management Flow', () => {
    const testInvoice = {
      invoiceNumber: 'E2E-001',
      invoiceDate: '2025-01-15',
      dueDate: '2025-02-15',
      type: 'ISSUED',
      partnerName: 'Test Client SRL',
      partnerCui: 'RO88888888',
      partnerAddress: 'Str. Client 456, Cluj',
      netAmount: 1000,
      vatRate: 21,
      currency: 'RON',
      items: [
        {
          description: 'Test Service',
          quantity: 1,
          unitPrice: 1000,
          vatRate: 21,
        },
      ],
    };

    it('should create a new invoice', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testInvoice)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.invoiceNumber).toBe(testInvoice.invoiceNumber);
      expect(response.body.grossAmount).toBe(1210); // 1000 + 21% VAT
      testInvoiceId = response.body.id;
    });

    it('should list invoices with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/invoices?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get invoice by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testInvoiceId);
    });

    it('should update invoice status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
    });

    it('should filter invoices by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/invoices?status=APPROVED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((inv: any) => inv.status === 'APPROVED')).toBe(true);
    });

    it('should export invoice to PDF', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/invoices/${testInvoiceId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /application\/pdf/);
    });
  });

  // ============================================================================
  // 4. VAT CALCULATION FLOW
  // ============================================================================

  describe('VAT Calculation Flow', () => {
    it('should calculate VAT for period', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vat/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        })
        .expect(200);

      expect(response.body).toHaveProperty('vatCollected');
      expect(response.body).toHaveProperty('vatDeductible');
      expect(response.body).toHaveProperty('vatPayable');
    });

    it('should apply correct VAT rates (21% standard, 11% reduced)', async () => {
      // Test 21% rate
      const response21 = await request(app.getHttpServer())
        .post('/api/v1/vat/calculate-amount')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 1000, rate: 21 })
        .expect(200);

      expect(response21.body.vatAmount).toBe(210);
      expect(response21.body.grossAmount).toBe(1210);

      // Test 11% rate
      const response11 = await request(app.getHttpServer())
        .post('/api/v1/vat/calculate-amount')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 1000, rate: 11 })
        .expect(200);

      expect(response11.body.vatAmount).toBe(110);
      expect(response11.body.grossAmount).toBe(1110);
    });

    it('should generate VAT report', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/vat/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          period: '2025-01',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('period');
    });
  });

  // ============================================================================
  // 5. OCR DOCUMENT PROCESSING FLOW
  // ============================================================================

  describe('OCR Document Processing Flow', () => {
    it('should upload document for OCR', async () => {
      // Mock file upload
      const response = await request(app.getHttpServer())
        .post('/api/v1/ocr/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('mock pdf content'), 'test-invoice.pdf')
        .expect(201);

      expect(response.body).toHaveProperty('documentId');
      expect(response.body).toHaveProperty('status');
    });

    it('should process document with OCR', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ocr/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ documentId: 'mock-doc-id' })
        .expect(200);

      expect(response.body).toHaveProperty('extractedData');
      expect(response.body).toHaveProperty('confidence');
    });

    it('should get OCR templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ocr/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================================
  // 6. PAYMENT RECORDING FLOW
  // ============================================================================

  describe('Payment Recording Flow', () => {
    let testPaymentId: string;

    it('should record a payment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceId: testInvoiceId,
          amount: 1210,
          currency: 'RON',
          method: 'BANK_TRANSFER',
          paymentDate: '2025-01-20',
          reference: 'TRF-001',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('COMPLETED');
      testPaymentId = response.body.id;
    });

    it('should update invoice payment status after payment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.paymentStatus).toBe('PAID');
    });

    it('should list payments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================================================
  // 7. DASHBOARD ANALYTICS FLOW
  // ============================================================================

  describe('Dashboard Analytics Flow', () => {
    it('should get dashboard summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard/summary?range=30d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('period');
    });

    it('should get revenue trend', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard/revenue-trend?months=6')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get recent activity', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard/activity?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================================
  // 8. E-FACTURA FLOW
  // ============================================================================

  describe('e-Factura Flow', () => {
    it('should generate e-Factura UBL XML', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/efactura/generate/${testInvoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('xml');
      expect(response.body).toHaveProperty('valid');
    });

    it('should validate e-Factura XML', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/efactura/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceId: testInvoiceId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('errors');
    });
  });

  // ============================================================================
  // 9. SAF-T D406 FLOW
  // ============================================================================

  describe('SAF-T D406 Flow', () => {
    it('should generate SAF-T D406 XML', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/saft/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          period: '2025-01',
          type: 'MONTHLY',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('xmlPath');
    });

    it('should list SAF-T reports', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/saft/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================================
  // 10. HEALTH & MONITORING
  // ============================================================================

  describe('Health & Monitoring', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should return API version', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/version')
        .expect(200);

      expect(response.body).toHaveProperty('version');
    });
  });
});
