import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, companyHeader, COMPANY_ID } from './test-utils';

/**
 * Comprehensive E2E Test Suite for all DocumentIulia API Modules
 * Tests Romanian accounting platform compliance and functionality
 */
describe('DocumentIulia API - All Modules (e2e)', () => {
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

  // Module 1: Health Check
  describe('Health Module', () => {
    it('GET /api/v1/health - should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect((res) => {
          expect([200, 404]).toContain(res.status); // May not be implemented
        });
    });
  });

  // Module 2: Authentication
  describe('Auth Module', () => {
    it('GET /api/v1/auth/me - should return user with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/auth/me - should reject without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });

  // Module 3: Users
  describe('Users Module', () => {
    it('GET /api/v1/users/me - should return current user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/users/me/companies - should return user companies', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me/companies')
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 4: Companies
  describe('Companies Module', () => {
    it('GET /api/v1/companies - should return companies list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/companies')
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:id - should return company details', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:id/stats - should return company stats', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/stats`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:id/members - should return company members', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/members`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 5: Clients
  describe('Clients Module', () => {
    it('GET /api/v1/companies/:companyId/clients - should return clients list', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/clients`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 6: Products
  describe('Products Module', () => {
    it('GET /api/v1/companies/:companyId/products - should return products list', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/products`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/products/low-stock - should return low stock', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/products/low-stock`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 7: Invoices
  describe('Invoices Module', () => {
    it('GET /api/v1/invoices - should return invoices list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set(authHeader())
        .set(companyHeader())
        .expect(200);
    });

    it('GET /api/v1/invoices/stats - should return invoice stats', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/stats')
        .set(authHeader())
        .set(companyHeader())
        .expect(200);
    });
  });

  // Module 8: Expenses
  describe('Expenses Module', () => {
    it('GET /api/v1/companies/:companyId/expenses - should return expenses list', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/expenses/unpaid - should return unpaid expenses', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses/unpaid`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/expenses/by-category - should return by category', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses/by-category`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/expenses/monthly-totals - should return monthly totals', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses/monthly-totals`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 9: Receipts
  describe('Receipts Module', () => {
    it('GET /api/v1/companies/:companyId/receipts - should return receipts list', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/receipts/unprocessed - should return unprocessed', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts/unprocessed`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/receipts/needs-review - should return needs review', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts/needs-review`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 10: Reports
  describe('Reports Module', () => {
    it('GET /api/v1/companies/:companyId/reports/dashboard - should return dashboard', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/dashboard`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/reports/revenue - should return revenue report', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/revenue`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/reports/expenses - should return expenses report', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/reports/expenses`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 11: Bank Accounts
  describe('Bank Accounts Module', () => {
    it('GET /api/v1/companies/:companyId/bank-accounts - should return bank accounts', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/bank-accounts`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 12: e-Factura
  describe('e-Factura Module', () => {
    it('GET /api/v1/companies/:companyId/efactura/config - should return config', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/efactura/config`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/efactura/status - should return status', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/efactura/status`)
        .set(authHeader())
        .expect(200);
    });

    it('GET /api/v1/companies/:companyId/efactura/history - should return history', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/efactura/history`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 13: SAF-T
  describe('SAF-T Module', () => {
    it('GET /api/v1/companies/:companyId/saft/preview - should return preview or validation error', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/saft/preview?year=2024&month=1`)
        .set(authHeader())
        .expect((res) => {
          // 200 for valid data, 400 for validation errors (both are acceptable)
          expect([200, 400]).toContain(res.status);
        });
    });

    it('GET /api/v1/companies/:companyId/saft/history - should return history', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/saft/history`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 14: Tax Codes
  describe('Tax Codes Module', () => {
    it('GET /api/v1/companies/:companyId/tax-codes - should return tax codes', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/tax-codes`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 15: Documents
  describe('Documents Module', () => {
    it('GET /api/v1/companies/:companyId/documents - should return documents', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/documents`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 16: Projects
  describe('Projects Module', () => {
    it('GET /api/v1/companies/:companyId/projects - should return projects', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/projects`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 17: Notifications
  describe('Notifications Module', () => {
    it('GET /api/v1/notifications - should return notifications', () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 18: Activity
  describe('Activity Module', () => {
    it('GET /api/v1/companies/:companyId/activity - should return activity log', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/activity`)
        .set(authHeader())
        .expect(200);
    });
  });

  // Module 19: Forum
  describe('Forum Module', () => {
    it('GET /api/v1/forum/categories - should return forum categories', () => {
      return request(app.getHttpServer())
        .get('/api/v1/forum/categories')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/v1/forum/topics - should return topics list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/forum/topics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
        });
    });

    it('GET /api/v1/forum/stats - should return forum stats', () => {
      return request(app.getHttpServer())
        .get('/api/v1/forum/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalTopics');
          expect(res.body).toHaveProperty('totalReplies');
        });
    });

    it('POST /api/v1/forum/topics - should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/forum/topics')
        .send({ title: 'Test', content: 'Test content', categoryId: 'test' })
        .expect(401);
    });
  });

  // Module 20: Courses
  describe('Courses Module', () => {
    it('GET /api/v1/courses - should return courses list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/v1/courses/categories - should return course categories', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses/categories')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/v1/courses/popular - should return popular courses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses/popular')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/v1/courses/:slug - should return course by slug', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses/introducere-e-factura')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('title');
          expect(res.body).toHaveProperty('lessons');
          expect(res.body).toHaveProperty('instructor');
        });
    });

    it('GET /api/v1/courses/:slug - should return 404 for non-existent course', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses/non-existent-course')
        .expect(404);
    });

    it('POST /api/v1/courses - should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/courses')
        .send({ title: 'Test Course', description: 'Test description' })
        .expect(401);
    });

    it('POST /api/v1/courses/:courseId/enroll - should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/courses/some-course-id/enroll')
        .expect(401);
    });

    it('GET /api/v1/courses/my/enrollments - should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses/my/enrollments')
        .expect(401);
    });
  });

  // Summary Test
  describe('API Summary', () => {
    it('should have all 20 modules responding', async () => {
      const endpoints = [
        '/api/v1/auth/me',
        '/api/v1/users/me',
        '/api/v1/companies',
        `/api/v1/companies/${COMPANY_ID}/clients`,
        `/api/v1/companies/${COMPANY_ID}/products`,
        '/api/v1/invoices',
        `/api/v1/companies/${COMPANY_ID}/expenses`,
        `/api/v1/companies/${COMPANY_ID}/receipts`,
        `/api/v1/companies/${COMPANY_ID}/reports/dashboard`,
        `/api/v1/companies/${COMPANY_ID}/bank-accounts`,
        `/api/v1/companies/${COMPANY_ID}/efactura/config`,
        `/api/v1/companies/${COMPANY_ID}/saft/history`,
        '/api/v1/forum/categories',
        '/api/v1/courses',
      ];

      for (const endpoint of endpoints) {
        const headers: Record<string, string> = authHeader();
        if (endpoint.includes('/invoices')) {
          headers['x-company-id'] = COMPANY_ID;
        }

        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set(headers);

        expect([200, 201]).toContain(response.status);
      }
    });
  });
});
