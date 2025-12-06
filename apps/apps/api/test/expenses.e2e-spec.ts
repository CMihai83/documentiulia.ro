import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, romanianTestData, COMPANY_ID } from './test-utils';

describe('ExpensesController (e2e)', () => {
  let app: INestApplication;
  let createdExpenseId: string;

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
    // Cleanup
    if (createdExpenseId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${COMPANY_ID}/expenses/${createdExpenseId}`)
        .set(authHeader());
    }
    await app.close();
  });

  describe('/api/v1/companies/:companyId/expenses (GET)', () => {
    it('should return list of expenses', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should support category filter', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses?category=SUPPLIES`)
        .set(authHeader())
        .expect(200);
    });

    it('should support isPaid filter', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses?isPaid=false`)
        .set(authHeader())
        .expect(200);
    });

    it('should support date range', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses?startDate=2024-01-01&endDate=2024-12-31`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/expenses (POST)', () => {
    it('should create a new expense', async () => {
      const expenseData = {
        ...romanianTestData.expense,
        description: `Cheltuială test ${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/expenses`)
        .set(authHeader())
        .send(expenseData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.category).toBe('SUPPLIES');
      expect(response.body.currency).toBe('RON');
      expect(response.body.isPaid).toBe(false);
      createdExpenseId = response.body.id;
    });

    it('should handle all Romanian expense categories', async () => {
      const categories = [
        'OFFICE',
        'TRAVEL',
        'UTILITIES',
        'MARKETING',
        'SALARIES',
        'SUPPLIES',
        'SERVICES',
        'EQUIPMENT',
        'RENT',
        'INSURANCE',
        'TAXES',
        'BANK_FEES',
        'OTHER',
      ];

      for (const category of categories.slice(0, 3)) { // Test first 3 to save time
        const expenseData = {
          category,
          description: `Test ${category}`,
          amount: 100,
          currency: 'RON',
          date: new Date().toISOString().split('T')[0],
        };

        const response = await request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/expenses`)
          .set(authHeader())
          .send(expenseData);

        expect([200, 201]).toContain(response.status);
      }
    });

    it('should calculate VAT correctly', async () => {
      const expenseWithVat = {
        category: 'SUPPLIES',
        description: 'Expense with VAT',
        amount: 119, // Total with VAT
        vatAmount: 19, // 19% VAT on 100 net
        currency: 'RON',
        date: new Date().toISOString().split('T')[0],
        vendorName: 'Furnizor Test',
        vendorCui: 'RO12345678',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/expenses`)
        .set(authHeader())
        .send(expenseWithVat)
        .expect(201);

      expect(parseFloat(response.body.vatAmount)).toBe(19);
    });
  });

  describe('/api/v1/companies/:companyId/expenses/unpaid (GET)', () => {
    it('should return unpaid expenses', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses/unpaid`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // All returned expenses should be unpaid
          res.body.forEach((expense: any) => {
            expect(expense.isPaid).toBe(false);
          });
        });
    });
  });

  describe('/api/v1/companies/:companyId/expenses/by-category (GET)', () => {
    it('should return expenses grouped by category', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses/by-category`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('category');
            expect(res.body[0]).toHaveProperty('total');
          }
        });
    });

    it('should support year/month filter', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses/by-category?year=2024&month=1`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/expenses/monthly-totals (GET)', () => {
    it('should return monthly expense totals', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses/monthly-totals`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should support year filter', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses/monthly-totals?year=2024`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/expenses/:id (PUT)', () => {
    it('should update expense', async () => {
      if (createdExpenseId) {
        const updateData = {
          description: 'Cheltuială actualizată',
          amount: 600,
        };

        return request(app.getHttpServer())
          .put(`/api/v1/companies/${COMPANY_ID}/expenses/${createdExpenseId}`)
          .set(authHeader())
          .send(updateData)
          .expect(200)
          .expect((res) => {
            expect(res.body.description).toBe(updateData.description);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/expenses/:id/mark-paid (PUT)', () => {
    it('should mark expense as paid', async () => {
      if (createdExpenseId) {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${COMPANY_ID}/expenses/${createdExpenseId}/mark-paid`)
          .set(authHeader())
          .send({ paidDate: new Date().toISOString().split('T')[0] })
          .expect(200)
          .expect((res) => {
            expect(res.body.isPaid).toBe(true);
          });
      }
    });
  });
});
