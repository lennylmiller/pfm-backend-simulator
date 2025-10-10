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
  // 1. Delete child tables that reference accounts/users
  await prisma.transaction.deleteMany({});
  await prisma.cashflowEvent.deleteMany({});
  await prisma.cashflowBill.deleteMany({});
  await prisma.cashflowIncome.deleteMany({});

  // 2. Delete accounts (references both user and partner)
  await prisma.account.deleteMany({});

  // 3. Delete other tables that reference users
  await prisma.budget.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.accessToken.deleteMany({});
  await prisma.tag.deleteMany({});

  // 4. Delete users (references partner)
  await prisma.user.deleteMany({});

  // 5. Delete partner-level tables
  await prisma.oAuthClient.deleteMany({});

  // 6. Finally delete partners
  await prisma.partner.deleteMany({});
}
