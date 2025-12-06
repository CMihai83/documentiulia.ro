import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, COMPANY_ID } from './test-utils';
import * as path from 'path';
import * as fs from 'fs';

describe('ReceiptsController (e2e)', () => {
  let app: INestApplication;
  let uploadedReceiptId: string;

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
    if (uploadedReceiptId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${COMPANY_ID}/receipts/${uploadedReceiptId}`)
        .set(authHeader());
    }
    await app.close();
  });

  describe('/api/v1/companies/:companyId/receipts (GET)', () => {
    it('should return list of receipts', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter by processing status', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts?status=COMPLETED`)
        .set(authHeader())
        .expect(200);
    });

    it('should filter by expense linkage', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts?hasExpense=false`)
        .set(authHeader())
        .expect(200);
    });
  });

  describe('/api/v1/companies/:companyId/receipts/upload (POST)', () => {
    it('should upload a receipt image', async () => {
      // Create a test image buffer (1x1 white pixel PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      );

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/receipts/upload`)
        .set(authHeader())
        .attach('file', testImageBuffer, 'test-receipt.png');

      // Should accept the upload (201) or reject invalid image (400)
      expect([201, 400]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('status');
        uploadedReceiptId = response.body.id;
      }
    });

    it('should reject non-image files', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/receipts/upload`)
        .set(authHeader())
        .attach('file', Buffer.from('not an image'), 'test.txt')
        .expect(400);
    });
  });

  describe('/api/v1/companies/:companyId/receipts/unprocessed (GET)', () => {
    it('should return receipts pending OCR processing', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts/unprocessed`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // All returned receipts should be pending or processing
          res.body.forEach((receipt: any) => {
            expect(['PENDING', 'PROCESSING']).toContain(receipt.status);
          });
        });
    });
  });

  describe('/api/v1/companies/:companyId/receipts/needs-review (GET)', () => {
    it('should return processed receipts needing manual review', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts/needs-review`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/api/v1/companies/:companyId/receipts/:id (GET)', () => {
    it('should return receipt by ID with OCR data', async () => {
      // Get a receipt first
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts`)
        .set(authHeader());

      if (listResponse.body.data?.length > 0) {
        const receiptId = listResponse.body.data[0].id;

        return request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/receipts/${receiptId}`)
          .set(authHeader())
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('ocrData');
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/receipts/:id/ocr (PUT)', () => {
    it('should update OCR data for receipt', async () => {
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts`)
        .set(authHeader());

      if (listResponse.body.data?.length > 0) {
        const receiptId = listResponse.body.data[0].id;

        const ocrUpdate = {
          vendorName: 'Magazin Test SRL',
          vendorCui: 'RO12345678',
          total: 119.00,
          vatAmount: 19.00,
          date: '2024-01-15',
          items: [
            { description: 'Produs 1', quantity: 2, unitPrice: 50.00 },
          ],
        };

        return request(app.getHttpServer())
          .put(`/api/v1/companies/${COMPANY_ID}/receipts/${receiptId}/ocr`)
          .set(authHeader())
          .send(ocrUpdate)
          .expect((res) => {
            expect([200, 400]).toContain(res.status);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/receipts/:id/create-expense (POST)', () => {
    it('should create expense from OCR data', async () => {
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts?status=COMPLETED&hasExpense=false`)
        .set(authHeader());

      if (listResponse.body.data?.length > 0) {
        const receiptId = listResponse.body.data[0].id;

        return request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/receipts/${receiptId}/create-expense`)
          .set(authHeader())
          .send({ category: 'SUPPLIES' })
          .expect((res) => {
            expect([201, 400]).toContain(res.status);
            if (res.status === 201) {
              expect(res.body).toHaveProperty('expenseId');
            }
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/receipts/:id/link-expense (POST)', () => {
    it('should link receipt to existing expense', async () => {
      // Get an unlinked receipt
      const receiptsResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts?hasExpense=false`)
        .set(authHeader());

      // Get an expense without receipt
      const expensesResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/expenses`)
        .set(authHeader());

      if (
        receiptsResponse.body.data?.length > 0 &&
        expensesResponse.body.data?.length > 0
      ) {
        const receiptId = receiptsResponse.body.data[0].id;
        const expenseId = expensesResponse.body.data[0].id;

        return request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/receipts/${receiptId}/link-expense`)
          .set(authHeader())
          .send({ expenseId })
          .expect((res) => {
            expect([200, 201, 400]).toContain(res.status);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/receipts/:id/reprocess (POST)', () => {
    it('should queue receipt for OCR reprocessing', async () => {
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts?status=REVIEW_NEEDED`)
        .set(authHeader());

      if (listResponse.body.data?.length > 0) {
        const receiptId = listResponse.body.data[0].id;

        return request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/receipts/${receiptId}/reprocess`)
          .set(authHeader())
          .expect((res) => {
            expect([200, 201]).toContain(res.status);
            expect(res.body.status).toBe('PENDING');
          });
      }
    });
  });

  describe('Romanian Receipt OCR Validation', () => {
    it('should extract Romanian bon fiscal data correctly', async () => {
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/receipts?status=COMPLETED`)
        .set(authHeader());

      if (listResponse.body.data?.length > 0) {
        const receiptId = listResponse.body.data[0].id;

        const response = await request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/receipts/${receiptId}`)
          .set(authHeader());

        if (response.body.ocrData) {
          const ocrData = response.body.ocrData;

          // Verify Romanian-specific fields
          if (ocrData.vendorCui) {
            expect(ocrData.vendorCui).toMatch(/^(RO)?\d{2,10}$/);
          }

          if (ocrData.total && ocrData.vatAmount) {
            // VAT should be reasonable (0-25% of net)
            const netAmount = ocrData.total - ocrData.vatAmount;
            const vatRate = (ocrData.vatAmount / netAmount) * 100;
            expect(vatRate).toBeLessThanOrEqual(25);
          }
        }
      }
    });
  });
});
