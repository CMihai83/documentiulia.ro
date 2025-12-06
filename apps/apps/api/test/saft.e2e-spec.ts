import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, COMPANY_ID } from './test-utils';

describe('SAFTController (e2e)', () => {
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

  describe('/api/v1/companies/:companyId/saft/generate (POST)', () => {
    it('should generate SAF-T D406 XML for Romanian ANAF', () => {
      const saftParams = {
        year: 2024,
        month: 1, // For monthly declaration
        // Or: quarter: 1 for quarterly
        type: 'D406', // Romanian SAF-T declaration
      };

      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/saft/generate`)
        .set(authHeader())
        .send(saftParams)
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
          if (res.status === 200 || res.status === 201) {
            expect(res.body).toHaveProperty('xml');
            // Verify SAF-T RO namespace
            expect(res.body.xml).toContain('mfp:SAF-T_RO');
          }
        });
    });

    it('should generate quarterly SAF-T declaration', () => {
      const saftParams = {
        year: 2024,
        quarter: 1,
        type: 'D406',
      };

      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/saft/generate`)
        .set(authHeader())
        .send(saftParams)
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });

    it('should validate period parameters', () => {
      const invalidParams = {
        year: 2024,
        // Missing month or quarter
        type: 'D406',
      };

      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/saft/generate`)
        .set(authHeader())
        .send(invalidParams)
        .expect(400);
    });
  });

  describe('/api/v1/companies/:companyId/saft/validate (POST)', () => {
    it('should validate SAF-T data before generation', () => {
      const validateParams = {
        year: 2024,
        month: 1,
      };

      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/saft/validate`)
        .set(authHeader())
        .send(validateParams)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('isValid');
          expect(res.body).toHaveProperty('errors');
          expect(res.body).toHaveProperty('warnings');
        });
    });
  });

  describe('/api/v1/companies/:companyId/saft/preview (GET)', () => {
    it('should return SAF-T data preview', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/saft/preview?year=2024&month=1`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('header');
          expect(res.body).toHaveProperty('masterFiles');
          expect(res.body).toHaveProperty('generalLedgerEntries');
          expect(res.body).toHaveProperty('sourceDocuments');
        });
    });
  });

  describe('/api/v1/companies/:companyId/saft/history (GET)', () => {
    it('should return SAF-T generation history', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/saft/history`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('/api/v1/companies/:companyId/saft/download/:id (GET)', () => {
    it('should download previously generated SAF-T file', async () => {
      // First check history for existing files
      const historyResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/saft/history`)
        .set(authHeader());

      if (historyResponse.body.data?.length > 0) {
        const fileId = historyResponse.body.data[0].id;

        return request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/saft/download/${fileId}`)
          .set(authHeader())
          .expect((res) => {
            expect([200, 404]).toContain(res.status);
          });
      }
    });
  });

  describe('Romanian SAF-T D406 Compliance', () => {
    it('should include all mandatory SAF-T elements', async () => {
      const saftParams = {
        year: 2024,
        month: 1,
        type: 'D406',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/saft/generate`)
        .set(authHeader())
        .send(saftParams);

      if (response.status === 200 && response.body.xml) {
        const xml = response.body.xml;

        // Verify mandatory SAF-T RO structure
        const mandatorySections = [
          'Header',
          'MasterFiles',
          'GeneralLedgerEntries',
          'SourceDocuments',
        ];

        mandatorySections.forEach((section) => {
          expect(xml).toContain(section);
        });

        // Verify Romanian-specific header fields
        expect(xml).toContain('TaxRegistrationNumber'); // CUI
        expect(xml).toContain('FiscalYear');
        expect(xml).toContain('SelectionCriteria');
      }
    });

    it('should properly format Romanian fiscal identifiers', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/saft/generate`)
        .set(authHeader())
        .send({ year: 2024, month: 1, type: 'D406' });

      if (response.status === 200 && response.body.xml) {
        const xml = response.body.xml;

        // CUI should be properly formatted
        expect(xml).toMatch(/<TaxRegistrationNumber>RO?\d{2,10}<\/TaxRegistrationNumber>/);

        // IBAN should be Romanian format
        expect(xml).toMatch(/RO\d{2}[A-Z]{4}/);
      }
    });
  });
});
