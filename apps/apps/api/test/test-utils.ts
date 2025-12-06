import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';

export const DEV_TOKEN = 'dev_test_token';
export const COMPANY_ID = 'cmima19rd0001i0gv51qpgvfo';
export const USER_ID = 'cmima19r00000i0gv61hsdyhl';

export interface TestContext {
  app: INestApplication;
  request: ReturnType<typeof request>;
}

export async function createTestingApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return {
    app,
    request: request(app.getHttpServer()) as any,
  };
}

export function authHeader() {
  return { Authorization: `Bearer ${DEV_TOKEN}` };
}

export function companyHeader() {
  return { 'x-company-id': COMPANY_ID };
}

export function fullHeaders() {
  return {
    ...authHeader(),
    ...companyHeader(),
    'Content-Type': 'application/json',
  };
}

// Romanian test data generators
export const romanianTestData = {
  company: {
    name: 'Test SRL E2E',
    cui: 'RO99999999',
    regCom: 'J40/999/2024',
    address: 'Str. Testului nr. 99',
    city: 'București',
    county: 'București',
    postalCode: '010101',
    country: 'RO',
    email: 'test-e2e@test.ro',
    phone: '+40700000000',
    vatPayer: true,
    vatNumber: 'RO99999999',
    vatRate: '19',
    currency: 'RON',
  },
  client: {
    type: 'COMPANY',
    name: 'Client Test SRL',
    cui: 'RO88888888',
    regCom: 'J40/888/2024',
    address: 'Str. Clientului nr. 88',
    city: 'Cluj-Napoca',
    county: 'Cluj',
    postalCode: '400000',
    country: 'RO',
    email: 'client-test@test.ro',
    phone: '+40711111111',
    vatPayer: true,
    vatNumber: 'RO88888888',
  },
  product: {
    code: 'TEST-001',
    name: 'Serviciu Test',
    description: 'Serviciu pentru testare E2E',
    type: 'SERVICE',
    unitPrice: 100.00,
    vatRate: 19,
    unit: 'buc',
    currency: 'RON',
    isActive: true,
  },
  expense: {
    category: 'SUPPLIES',
    description: 'Cheltuială test E2E',
    amount: 500.00,
    vatAmount: 95.00,
    currency: 'RON',
    date: new Date().toISOString().split('T')[0],
    vendorName: 'Furnizor Test SRL',
    vendorCui: 'RO77777777',
    isPaid: false,
  },
  invoice: {
    series: 'TEST',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'RON',
    status: 'DRAFT',
    items: [
      {
        description: 'Serviciu test',
        quantity: 1,
        unitPrice: 100,
        vatRate: 19,
        unit: 'buc',
      },
    ],
  },
};

// Helper to validate Romanian CUI format
export function isValidRomanianCUI(cui: string): boolean {
  const cleanCUI = cui.replace(/^RO/i, '').replace(/\s/g, '');
  return /^\d{2,10}$/.test(cleanCUI);
}

// Helper to validate Romanian IBAN
export function isValidRomanianIBAN(iban: string): boolean {
  return /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(iban.replace(/\s/g, ''));
}

// Helper to generate random Romanian phone
export function generateRomanianPhone(): string {
  const prefixes = ['0721', '0722', '0723', '0731', '0732', '0740', '0741', '0742'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `+4${prefix}${number}`;
}
