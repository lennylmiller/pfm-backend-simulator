import { prisma } from '../src/config/database';

beforeAll(async () => {
  // Setup test database
});

afterAll(async () => {
  // Cleanup and disconnect
  await prisma.$disconnect();
});
