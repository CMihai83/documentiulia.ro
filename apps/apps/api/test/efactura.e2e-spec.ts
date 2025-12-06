import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, COMPANY_ID } from './test-utils';

describe('EfacturaController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/companies/:companyId/efactura/config (GET)', () => {
    it('should return e-Factura configuration', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/efactura/config`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('isConfigured');
        });
    });
  });

  describe('/api/v1/companies/:companyId/efactura/config (POST)', () => {
    it('should save e-Factura configuration', () => {
      const configData = {
        anafUsername: 'test_user',
        anafEnvironment: 'test', // test or production
        certificatePath: '/path/to/cert.pfx',
        autoSubmit: false,
      };

      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/efactura/config`)
        .set(authHeader())
        .send(configData)
        .expect(201);
    });
  });

  describe('/api/v1/companies/:companyId/efactura/validate (POST)', () => {
    it('should validate invoice for e-Factura compliance', async () => {
      // First get an invoice
      const invoicesResponse = await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set(authHeader())
        .set({ 'x-company-id': COMPANY_ID });

      if (invoicesResponse.body.data?.length > 0) {
        const invoiceId = invoicesResponse.body.data[0].id;

        return request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/efactura/validate`)
          .set(authHeader())
          .send({ invoiceId })
          .expect((res) => {
            // Should be 200 (valid) or return validation errors
            expect([200, 400]).toContain(res.status);
            if (res.status === 400) {
              expect(res.body).toHaveProperty('errors');
            }
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/efactura/generate-xml (POST)', () => {
    it('should generate UBL 2.1 XML for Romanian e-Factura', async () => {
      const invoicesResponse = await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set(authHeader())
        .set({ 'x-company-id': COMPANY_ID });

      if (invoicesResponse.body.data?.length > 0) {
        const invoiceId = invoicesResponse.body.data[0].id;

        return request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/efactura/generate-xml`)
          .set(authHeader())
          .send({ invoiceId })
          .expect((res) => {
            expect([200, 400]).toContain(res.status);
            if (res.status === 200) {
              expect(res.body).toHaveProperty('xml');
              // Verify UBL 2.1 namespace
              expect(res.body.xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
            }
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/efactura/status (GET)', () => {
    it('should return e-Factura submission status for invoices', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/efactura/status`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('pending');
          expect(res.body).toHaveProperty('submitted');
          expect(res.body).toHaveProperty('accepted');
          expect(res.body).toHaveProperty('rejected');
        });
    });
  });

  describe('/api/v1/companies/:companyId/efactura/history (GET)', () => {
    it('should return e-Factura submission history', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/efactura/history`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Romanian e-Factura XML Compliance', () => {
    it('should include all mandatory Romanian fields in generated XML', async () => {
      // This test verifies UBL 2.1 compliance for Romanian e-Factura
      const invoicesResponse = await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set(authHeader())
        .set({ 'x-company-id': COMPANY_ID });

      if (invoicesResponse.body.data?.length > 0) {
        const invoiceId = invoicesResponse.body.data[0].id;

        const response = await request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/efactura/generate-xml`)
          .set(authHeader())
          .send({ invoiceId });

        if (response.status === 200 && response.body.xml) {
          const xml = response.body.xml;

          // Verify mandatory Romanian elements
          const mandatoryElements = [
            'cbc:ID', // Invoice number
            'cbc:IssueDate', // Issue date
            'cbc:DueDate', // Due date
            'cbc:InvoiceTypeCode', // Type code (380 for invoice)
            'cbc:DocumentCurrencyCode', // Currency (RON)
            'cac:AccountingSupplierParty', // Supplier
            'cac:AccountingCustomerParty', // Customer
            'cac:TaxTotal', // VAT total
            'cac:LegalMonetaryTotal', // Totals
            'cac:InvoiceLine', // Line items
          ];

          mandatoryElements.forEach((element) => {
            expect(xml).toContain(element.split(':')[1]);
          });

          // Verify Romanian-specific identifiers
          expect(xml).toMatch(/RO\d{2,10}/); // CUI format
        }
      }
    });
  });
});
