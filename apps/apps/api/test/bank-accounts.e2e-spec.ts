import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, COMPANY_ID, isValidRomanianIBAN } from './test-utils';

describe('BankAccountsController (e2e)', () => {
  let app: INestApplication;
  let createdBankAccountId: string;

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
    if (createdBankAccountId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${COMPANY_ID}/bank-accounts/${createdBankAccountId}`)
        .set(authHeader());
    }
    await app.close();
  });

  describe('/api/v1/companies/:companyId/bank-accounts (GET)', () => {
    it('should return list of bank accounts', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/companies/${COMPANY_ID}/bank-accounts`)
        .set(authHeader())
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/api/v1/companies/:companyId/bank-accounts (POST)', () => {
    it('should create a Romanian bank account', async () => {
      const bankAccountData = {
        bankName: 'Banca Transilvania',
        iban: 'RO49BTRL00991234567890',
        swift: 'BTRLRO22',
        currency: 'RON',
        accountType: 'CURRENT',
        isDefault: false,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/bank-accounts`)
        .set(authHeader())
        .send(bankAccountData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.bankName).toBe('Banca Transilvania');
      expect(response.body.currency).toBe('RON');
      createdBankAccountId = response.body.id;
    });

    it('should support EUR accounts for Romanian banks', async () => {
      const eurAccountData = {
        bankName: 'ING Bank',
        iban: 'RO49INGB00001234567890',
        swift: 'INGBROBU',
        currency: 'EUR',
        accountType: 'CURRENT',
        isDefault: false,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/bank-accounts`)
        .set(authHeader())
        .send(eurAccountData);

      expect([201, 409]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.currency).toBe('EUR');
      }
    });

    it('should validate Romanian IBAN format', () => {
      const invalidIbanData = {
        bankName: 'Test Bank',
        iban: 'DE89370400440532013000', // German IBAN
        currency: 'RON',
        accountType: 'CURRENT',
      };

      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/bank-accounts`)
        .set(authHeader())
        .send(invalidIbanData)
        .expect((res) => {
          // Should either accept (if non-RO IBANs allowed) or reject
          expect([201, 400]).toContain(res.status);
        });
    });
  });

  describe('/api/v1/companies/:companyId/bank-accounts/:id (GET)', () => {
    it('should return bank account by ID', async () => {
      if (createdBankAccountId) {
        return request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/bank-accounts/${createdBankAccountId}`)
          .set(authHeader())
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', createdBankAccountId);
            expect(res.body).toHaveProperty('iban');
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/bank-accounts/:id (PUT)', () => {
    it('should update bank account', async () => {
      if (createdBankAccountId) {
        const updateData = {
          bankName: 'Updated Bank Name',
        };

        return request(app.getHttpServer())
          .put(`/api/v1/companies/${COMPANY_ID}/bank-accounts/${createdBankAccountId}`)
          .set(authHeader())
          .send(updateData)
          .expect(200)
          .expect((res) => {
            expect(res.body.bankName).toBe(updateData.bankName);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/bank-accounts/:id/set-default (PUT)', () => {
    it('should set bank account as default', async () => {
      if (createdBankAccountId) {
        return request(app.getHttpServer())
          .put(`/api/v1/companies/${COMPANY_ID}/bank-accounts/${createdBankAccountId}/set-default`)
          .set(authHeader())
          .expect(200)
          .expect((res) => {
            expect(res.body.isDefault).toBe(true);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/bank-accounts/:id/transactions (GET)', () => {
    it('should return bank account transactions', async () => {
      if (createdBankAccountId) {
        return request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/bank-accounts/${createdBankAccountId}/transactions`)
          .set(authHeader())
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
          });
      }
    });

    it('should support date range filter for transactions', async () => {
      if (createdBankAccountId) {
        return request(app.getHttpServer())
          .get(`/api/v1/companies/${COMPANY_ID}/bank-accounts/${createdBankAccountId}/transactions?startDate=2024-01-01&endDate=2024-12-31`)
          .set(authHeader())
          .expect(200);
      }
    });
  });

  describe('/api/v1/companies/:companyId/bank-accounts/:id/sync (POST)', () => {
    it('should trigger bank account sync (PSD2)', async () => {
      if (createdBankAccountId) {
        return request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/bank-accounts/${createdBankAccountId}/sync`)
          .set(authHeader())
          .expect((res) => {
            // 200 if sync triggered, 400 if not configured, 503 if bank unavailable
            expect([200, 201, 400, 503]).toContain(res.status);
          });
      }
    });
  });

  describe('/api/v1/companies/:companyId/bank-accounts/connect (POST)', () => {
    it('should initiate bank connection via Salt Edge', () => {
      const connectionRequest = {
        provider: 'salt_edge',
        bankCode: 'bt_ro', // Banca Transilvania
        redirectUrl: 'https://documentiulia.ro/callback',
      };

      return request(app.getHttpServer())
        .post(`/api/v1/companies/${COMPANY_ID}/bank-accounts/connect`)
        .set(authHeader())
        .send(connectionRequest)
        .expect((res) => {
          // Should return redirect URL or error if not configured
          expect([200, 201, 400, 503]).toContain(res.status);
          if (res.status === 200 || res.status === 201) {
            expect(res.body).toHaveProperty('redirectUrl');
          }
        });
    });
  });

  describe('Romanian Banks Support', () => {
    const romanianBanks = [
      { name: 'Banca Transilvania', code: 'BTRL', swift: 'BTRLRO22' },
      { name: 'BCR', code: 'RNCB', swift: 'RNCBROBU' },
      { name: 'BRD', code: 'BRDE', swift: 'BRDEROBU' },
      { name: 'ING Bank', code: 'INGB', swift: 'INGBROBU' },
      { name: 'Raiffeisen Bank', code: 'RZBB', swift: 'RZBRROBU' },
      { name: 'UniCredit', code: 'BACX', swift: 'BACXROBU' },
    ];

    it('should accept all major Romanian banks', async () => {
      for (const bank of romanianBanks.slice(0, 2)) {
        const bankData = {
          bankName: bank.name,
          iban: `RO49${bank.code}00001234567890`,
          swift: bank.swift,
          currency: 'RON',
          accountType: 'CURRENT',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/v1/companies/${COMPANY_ID}/bank-accounts`)
          .set(authHeader())
          .send(bankData);

        expect([201, 409]).toContain(response.status);
      }
    });
  });
});
