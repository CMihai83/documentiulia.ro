import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, companyHeader, fullHeaders, COMPANY_ID } from './test-utils';

describe('InvoicesController (e2e)', () => {
  let app: INestApplication;
  let createdInvoiceId: string;
  let testClientId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Get a client ID for invoice creation
    const clientsResponse = await request(app.getHttpServer())
      .get(`/api/v1/companies/${COMPANY_ID}/clients`)
      .set(authHeader());

    if (clientsResponse.body.data?.length > 0) {
      testClientId = clientsResponse.body.data[0].id;
    }
  });

  afterAll(async () => {
    // Cleanup
    if (createdInvoiceId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/invoices/${createdInvoiceId}`)
        .set(authHeader())
        .set(companyHeader());
    }
    await app.close();
  });

  describe('/api/v1/invoices (GET)', () => {
    it('should return list of invoices', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set(authHeader())
        .set(companyHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
        });
    });

    it('should support status filter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices?status=DRAFT')
        .set(authHeader())
        .set(companyHeader())
        .expect(200);
    });

    it('should support date range filter', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      return request(app.getHttpServer())
        .get(`/api/v1/invoices?startDate=${startDate}&endDate=${endDate}`)
        .set(authHeader())
        .set(companyHeader())
        .expect(200);
    });

    it('should require company header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set(authHeader())
        .expect(400);
    });
  });

  describe('/api/v1/invoices (POST)', () => {
    it('should create a new Romanian invoice', async () => {
      if (!testClientId) {
        console.log('No client available for invoice test');
        return;
      }

      const invoiceData = {
        clientId: testClientId,
        series: 'TEST',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'RON',
        items: [
          {
            description: 'Serviciu consultanță',
            quantity: 10,
            unitPrice: 100,
            vatRate: 19,
            unit: 'ore',
          },
          {
            description: 'Serviciu implementare',
            quantity: 5,
            unitPrice: 200,
            vatRate: 19,
            unit: 'ore',
          },
        ],
        notes: 'Factura test pentru E2E',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set(authHeader())
        .set(companyHeader())
        .send(invoiceData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('number');
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.currency).toBe('RON');

      // Verify VAT calculation (19% on 2000 RON = 380 RON)
      const subtotal = 10 * 100 + 5 * 200; // 2000 RON
      const expectedVat = subtotal * 0.19; // 380 RON
      expect(parseFloat(response.body.subtotal)).toBe(subtotal);
      expect(parseFloat(response.body.vatAmount)).toBe(expectedVat);
      expect(parseFloat(response.body.total)).toBe(subtotal + expectedVat);

      createdInvoiceId = response.body.id;
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set(authHeader())
        .set(companyHeader())
        .send({ series: 'TEST' })
        .expect(400);
    });
  });

  describe('/api/v1/invoices/:id (GET)', () => {
    it('should return invoice by ID', async () => {
      if (createdInvoiceId) {
        return request(app.getHttpServer())
          .get(`/api/v1/invoices/${createdInvoiceId}`)
          .set(authHeader())
          .set(companyHeader())
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', createdInvoiceId);
            expect(res.body).toHaveProperty('items');
            expect(Array.isArray(res.body.items)).toBe(true);
          });
      }
    });
  });

  describe('/api/v1/invoices/:id (PUT)', () => {
    it('should update draft invoice', async () => {
      if (createdInvoiceId) {
        const updateData = {
          notes: 'Notă actualizată',
        };

        return request(app.getHttpServer())
          .put(`/api/v1/invoices/${createdInvoiceId}`)
          .set(authHeader())
          .set(companyHeader())
          .send(updateData)
          .expect(200)
          .expect((res) => {
            expect(res.body.notes).toBe(updateData.notes);
          });
      }
    });
  });

  describe('/api/v1/invoices/:id/send (POST)', () => {
    it('should mark invoice as sent', async () => {
      if (createdInvoiceId) {
        return request(app.getHttpServer())
          .post(`/api/v1/invoices/${createdInvoiceId}/send`)
          .set(authHeader())
          .set(companyHeader())
          .expect(201)
          .expect((res) => {
            expect(res.body.status).toBe('SENT');
          });
      }
    });
  });

  describe('/api/v1/invoices/:id/pay (POST)', () => {
    it('should record payment for invoice', async () => {
      if (createdInvoiceId) {
        const paymentData = {
          amount: 2380, // Full amount
          date: new Date().toISOString().split('T')[0],
          method: 'BANK_TRANSFER',
          reference: 'OP/001/2024',
        };

        return request(app.getHttpServer())
          .post(`/api/v1/invoices/${createdInvoiceId}/pay`)
          .set(authHeader())
          .set(companyHeader())
          .send(paymentData)
          .expect(201);
      }
    });
  });

  describe('/api/v1/invoices/stats (GET)', () => {
    it('should return invoice statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/stats')
        .set(authHeader())
        .set(companyHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('byStatus');
        });
    });
  });
});
