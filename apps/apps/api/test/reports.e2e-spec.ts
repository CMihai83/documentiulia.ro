import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, COMPANY_ID } from './test-utils';

describe('ReportsController (e2e)', () => {
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

  describe('/api/v1/companies/:companyId/reports/dashboard (GET)', () => {
    it('should return dashboard summary', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/dashboard`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalRevenue');
          expect(res.body).toHaveProperty('totalExpenses');
          expect(res.body).toHaveProperty('profit');
          expect(res.body).toHaveProperty('invoicesCount');
          expect(res.body).toHaveProperty('clientsCount');
        });
    });
  });

  describe('/api/v1/companies/:companyId/reports/revenue (GET)', () => {
    it('should return revenue report', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/revenue`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('data');
        });
    });

    it('should support date range filter', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/revenue?startDate=2024-01-01&endDate=2024-12-31`)
        .set(authHeader())
        .expect(200);
    });

    it('should support period grouping (monthly)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/revenue?period=monthly&year=2024`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should support period grouping (quarterly)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/revenue?period=quarterly&year=2024`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/reports/expenses (GET)', () => {
    it('should return expense report', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/expenses`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('byCategory');
        });
    });

    it('should group expenses by category', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/expenses?year=2024`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('byCategory');
          expect(Array.isArray(res.body.byCategory)).toBe(true);
        });
    });
  });

  describe('/api/v1/companies/:companyId/reports/profit-loss (GET)', () => {
    it('should return profit/loss report', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/profit-loss`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('revenue');
          expect(res.body).toHaveProperty('expenses');
          expect(res.body).toHaveProperty('profit');
          expect(res.body).toHaveProperty('profitMargin');
        });
    });

    it('should support monthly breakdown', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/profit-loss?year=2024&breakdown=monthly`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/reports/vat (GET)', () => {
    it('should return VAT report for Romanian compliance', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/vat`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('vatCollected');
          expect(res.body).toHaveProperty('vatPaid');
          expect(res.body).toHaveProperty('vatDue');
        });
    });

    it('should support month/year filter for VAT period', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/vat?year=2024&month=1`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/reports/cashflow (GET)', () => {
    it('should return cash flow report', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/cashflow`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('inflows');
          expect(res.body).toHaveProperty('outflows');
          expect(res.body).toHaveProperty('netCashFlow');
        });
    });
  });

  describe('/api/v1/companies/:companyId/reports/clients (GET)', () => {
    it('should return client analytics report', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/clients`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalClients');
          expect(res.body).toHaveProperty('topClients');
        });
    });
  });

  describe('/api/v1/companies/:companyId/reports/products (GET)', () => {
    it('should return product analytics report', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/products`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalProducts');
          expect(res.body).toHaveProperty('topProducts');
        });
    });
  });
});
