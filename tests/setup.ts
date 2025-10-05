import { prisma } from '../src/config/database';

beforeAll(async () => {
  // Clean database before all tests
  await cleanDatabase();
});

afterAll(async () => {
  // Final cleanup and disconnect
  await cleanDatabase();
  await prisma.$disconnect();
  // Give database time to fully disconnect
  await new Promise(resolve => setTimeout(resolve, 500));
});

/**
 * Clean all test data from database
 * Must delete in correct order to respect foreign key constraints
 */
async function cleanDatabase() {
  // Delete in order respecting foreign key constraints
  await prisma.transaction.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.partner.deleteMany({});
}
