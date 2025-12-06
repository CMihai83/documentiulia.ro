import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, romanianTestData, COMPANY_ID } from './test-utils';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let createdProductId: string;

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
    if (createdProductId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${COMPANY_ID}/products/${createdProductId}`)
        .set(authHeader());
    }
    await app.close();
  });

  describe('/api/v1/companies/:companyId/products (GET)', () => {
    it('should return list of products', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/products`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should support type filter (SERVICE)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/products?type=SERVICE`)
        .set(authHeader())
        .expect(200);
    });

    it('should support type filter (PRODUCT)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/products?type=PRODUCT`)
        .set(authHeader())
        .expect(200);
    });

    it('should support active filter', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/products?active=true`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/products (POST)', () => {
    it('should create a new service', async () => {
      const productData = {
        ...romanianTestData.product,
        code: `SRV-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/products`)
        .set(authHeader())
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('SERVICE');
      expect(response.body.vatRate).toBe(19);
      createdProductId = response.body.id;
    });

    it('should create a physical product with stock', async () => {
      const physicalProduct = {
        code: `PRD-${Date.now()}`,
        name: 'Produs fizic test',
        description: 'Produs pentru testare',
        type: 'PRODUCT',
        unitPrice: 250.00,
        vatRate: 19,
        unit: 'buc',
        currency: 'RON',
        isActive: true,
        trackStock: true,
        stockQuantity: 100,
        minStockLevel: 10,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/products`)
        .set(authHeader())
        .send(physicalProduct)
        .expect(201);

      expect(response.body.type).toBe('PRODUCT');
      expect(response.body.trackStock).toBe(true);
      expect(response.body.stockQuantity).toBe(100);
    });

    it('should validate Romanian VAT rates (19%, 9%, 5%, 0%)', async () => {
      const productWith9VAT = {
        code: `VAT9-${Date.now()}`,
        name: 'Produs cu TVA 9%',
        type: 'PRODUCT',
        unitPrice: 100,
        vatRate: 9, // Valid Romanian VAT rate for food
        unit: 'buc',
        currency: 'RON',
      };

      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/products`)
        .set(authHeader())
        .send(productWith9VAT)
        .expect(201);
    });

    it('should reject duplicate product code', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/products`)
        .set(authHeader())
        .send(romanianTestData.product)
        .expect(409);
    });
  });

  describe('/api/v1/companies/:companyId/products/low-stock (GET)', () => {
    it('should return products with low stock', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/products/low-stock`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/api/v1/companies/:companyId/products/:id (GET)', () => {
    it('should return product by ID', async () => {
      if (createdProductId) {
        return request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/products/${createdProductId}`)
          .set(authHeader())
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', createdProductId);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/products/:id (PUT)', () => {
    it('should update product details', async () => {
      if (createdProductId) {
        const updateData = {
          name: 'Serviciu actualizat',
          unitPrice: 150.00,
        };

        return request(app.getHttpServer())
          .put(`/api/v1/companies/${COMPANY_ID}/products/${createdProductId}`)
          .set(authHeader())
          .send(updateData)
          .expect(200)
          .expect((res) => {
            expect(res.body.name).toBe(updateData.name);
            expect(parseFloat(res.body.unitPrice)).toBe(150.00);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/products/:id/stock (PUT)', () => {
    it('should update product stock', async () => {
      // Get a product with stock tracking
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/products?type=PRODUCT`)
        .set(authHeader());

      const productWithStock = listResponse.body.data?.find((p: any) => p.trackStock);

      if (productWithStock) {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${COMPANY_ID}/products/${productWithStock.id}/stock`)
          .set(authHeader())
          .send({ quantity: 50, reason: 'Stock adjustment' })
          .expect(200);
      }
    });
  });
});
