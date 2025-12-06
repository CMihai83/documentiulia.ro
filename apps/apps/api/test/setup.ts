import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup test database
  console.log('Setting up test environment...');
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log('Test environment cleaned up.');
});

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://accountech_app:AccTech2025Prod%40Secure@127.0.0.1:5432/documentiulia_v2';
process.env.CLERK_SECRET_KEY = 'test_secret';
