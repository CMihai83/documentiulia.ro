import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, romanianTestData, COMPANY_ID } from './test-utils';

describe('CompaniesController (e2e)', () => {
  let app: INestApplication;
  let createdCompanyId: string;

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
    // Cleanup: delete test company if created
    if (createdCompanyId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${createdCompanyId}`)
        .set(authHeader());
    }
    await app.close();
  });

  describe('/api/v1/companies (GET)', () => {
    it('should return list of companies', () => {
      return request(app.getHttpServer())
        .get('/api/v1/companies')
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/api/v1/companies (POST)', () => {
    it('should create a new company with Romanian data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .set(authHeader())
        .send(romanianTestData.company)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.cui).toBe(romanianTestData.company.cui);
      expect(response.body.vatPayer).toBe(true);
      createdCompanyId = response.body.id;
    });

    it('should reject duplicate CUI', () => {
      return request(app.getHttpServer())
        .post('/api/v1/companies')
        .set(authHeader())
        .send(romanianTestData.company)
        .expect(409);
    });
  });

  describe('/api/v1/companies/:id (GET)', () => {
    it('should return company by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', COMPANY_ID);
          expect(res.body).toHaveProperty('cui');
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return 404 for non-existent company', () => {
      return request(app.getHttpServer())
        .get('/api/v1/companies/non-existent-id')
        .set(authHeader())
        .expect(404);
    });
  });

  describe('/api/v1/companies/:id (PUT)', () => {
    it('should update company details', async () => {
      const updateData = {
        name: 'Updated Company Name SRL',
        phone: '+40212345679',
      };

      return request(app.getHttpServer())
        .put(`/api/v1/companies/${COMPANY_ID}`)
        .set(authHeader())
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe(updateData.name);
        });
    });
  });

  describe('/api/v1/companies/:id/stats (GET)', () => {
    it('should return company statistics', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/stats`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalClients');
          expect(res.body).toHaveProperty('totalProducts');
        });
    });
  });

  describe('/api/v1/companies/:id/members (GET)', () => {
    it('should return company members', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/members`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });
});
