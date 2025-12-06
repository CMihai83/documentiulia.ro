import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, romanianTestData, COMPANY_ID } from './test-utils';

describe('ClientsController (e2e)', () => {
  let app: INestApplication;
  let createdClientId: string;

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
    // Cleanup: delete test client if created
    if (createdClientId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${COMPANY_ID}/clients/${createdClientId}`)
        .set(authHeader());
    }
    await app.close();
  });

  describe('/api/v1/companies/:companyId/clients (GET)', () => {
    it('should return list of clients', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/clients`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should support search parameter', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/clients?search=Alpha`)
        .set(authHeader())
        .expect(200);
    });

    it('should support type filter', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/clients?type=COMPANY`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/clients (POST)', () => {
    it('should create a new Romanian company client', async () => {
      const clientData = {
        ...romanianTestData.client,
        cui: `RO${Math.floor(Math.random() * 100000000)}`, // Random CUI to avoid duplicates
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/clients`)
        .set(authHeader())
        .send(clientData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('COMPANY');
      expect(response.body.vatPayer).toBe(true);
      createdClientId = response.body.id;
    });

    it('should create an individual client', async () => {
      const individualClient = {
        type: 'INDIVIDUAL',
        name: 'Ion Popescu',
        cnp: '1900101400001',
        address: 'Str. Individuală nr. 10',
        city: 'București',
        county: 'București',
        email: 'ion.popescu@test.ro',
        phone: '+40722222222',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/clients`)
        .set(authHeader())
        .send(individualClient)
        .expect(201);

      expect(response.body.type).toBe('INDIVIDUAL');
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/clients`)
        .set(authHeader())
        .send({ name: 'Missing fields' })
        .expect(400);
    });
  });

  describe('/api/v1/companies/:companyId/clients/:id (GET)', () => {
    it('should return client by ID', async () => {
      // First get a client
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/clients`)
        .set(authHeader());

      if (listResponse.body.data.length > 0) {
        const clientId = listResponse.body.data[0].id;

        return request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/clients/${clientId}`)
          .set(authHeader())
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', clientId);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/clients/:id (PUT)', () => {
    it('should update client details', async () => {
      if (createdClientId) {
        const updateData = {
          name: 'Updated Client Name SRL',
          phone: '+40733333333',
        };

        return request(app.getHttpServer())
          .put(`/api/v1/companies/${COMPANY_ID}/clients/${createdClientId}`)
          .set(authHeader())
          .send(updateData)
          .expect(200)
          .expect((res) => {
            expect(res.body.name).toBe(updateData.name);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/clients/:id/stats (GET)', () => {
    it('should return client statistics', async () => {
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/clients`)
        .set(authHeader());

      if (listResponse.body.data.length > 0) {
        const clientId = listResponse.body.data[0].id;

        return request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/clients/${clientId}/stats`)
          .set(authHeader())
          .expect(200);
      }
    });
  });
});
