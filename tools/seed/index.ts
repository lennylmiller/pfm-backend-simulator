#!/usr/bin/env ts-node
import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import * as generators from './generators';

const program = new Command();
const prisma = new PrismaClient();

program
  .name('pfm-seed')
  .description('Generate realistic test data for PFM Simulator')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate test data with specified scenario')
  .option('-s, --scenario <name>', 'Predefined scenario (basic, realistic, stress)', 'basic')
  .option('-p, --partners <count>', 'Number of partners to generate', '1')
  .option('-u, --users <count>', 'Number of users per partner', '10')
  .option('-a, --accounts <count>', 'Number of accounts per user', '3')
  .option('-t, --transactions <count>', 'Number of transactions per account', '100')
  .option('--clear', 'Clear existing data before generating')
  .action(async (options) => {
    console.log('Generating test data...\n');

    try {
      if (options.clear) {
        console.log('Clearing existing data...');
        await clearDatabase();
        console.log('✓ Database cleared\n');
      }

      const scenario = getScenario(options.scenario);
      const partnerCount = parseInt(options.partners);
      const userCount = parseInt(options.users);
      const accountCount = parseInt(options.accounts);
      const transactionCount = parseInt(options.transactions);

      // Generate partners
      console.log(`Generating ${partnerCount} partners...`);
      const partners = await generators.generatePartners(partnerCount);
      console.log(`✓ Generated ${partners.length} partners\n`);

      // Generate users for each partner
      console.log(`Generating ${userCount} users per partner...`);
      const users = [];
      for (const partner of partners) {
        const partnerUsers = await generators.generateUsers(partner.id, userCount);
        users.push(...partnerUsers);
      }
      console.log(`✓ Generated ${users.length} users\n`);

      // Generate accounts for each user
      console.log(`Generating ${accountCount} accounts per user...`);
      const accounts = [];
      for (const user of users) {
        const userAccounts = await generators.generateAccounts(
          user.id,
          user.partnerId,
          accountCount
        );
        accounts.push(...userAccounts);
      }
      console.log(`✓ Generated ${accounts.length} accounts\n`);

      // Generate transactions for each account
      console.log(`Generating ${transactionCount} transactions per account...`);
      let totalTransactions = 0;
      for (const account of accounts) {
        await generators.generateTransactions(
          account.userId,
          account.id,
          transactionCount
        );
        totalTransactions += transactionCount;
      }
      console.log(`✓ Generated ${totalTransactions} transactions\n`);

      // Generate budgets
      console.log('Generating budgets...');
      let budgetCount = 0;
      for (const user of users) {
        await generators.generateBudgets(user.id, 3);
        budgetCount += 3;
      }
      console.log(`✓ Generated ${budgetCount} budgets\n`);

      // Generate goals
      console.log('Generating goals...');
      let goalCount = 0;
      for (const user of users) {
        await generators.generateGoals(user.id, 2);
        goalCount += 2;
      }
      console.log(`✓ Generated ${goalCount} goals\n`);

      // Generate alerts
      console.log('Generating alerts...');
      let alertCount = 0;
      for (const user of users) {
        await generators.generateAlerts(user.id, 2);
        alertCount += 2;
      }
      console.log(`✓ Generated ${alertCount} alerts\n`);

      console.log('Test data generation completed successfully!');
      console.log('\nSummary:');
      console.log(`  Partners: ${partners.length}`);
      console.log(`  Users: ${users.length}`);
      console.log(`  Accounts: ${accounts.length}`);
      console.log(`  Transactions: ${totalTransactions}`);
      console.log(`  Budgets: ${budgetCount}`);
      console.log(`  Goals: ${goalCount}`);
      console.log(`  Alerts: ${alertCount}`);
    } catch (error) {
      console.error('Data generation failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

program.parse();

async function clearDatabase() {
  // Order matters due to foreign keys
  await prisma.notification.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.accessToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.oAuthClient.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.tag.deleteMany();
}

function getScenario(name: string) {
  const scenarios: Record<string, any> = {
    basic: {
      partners: 1,
      usersPerPartner: 5,
      accountsPerUser: 3,
      transactionsPerAccount: 50,
    },
    realistic: {
      partners: 1,
      usersPerPartner: 100,
      accountsPerUser: 4,
      transactionsPerAccount: 200,
    },
    stress: {
      partners: 5,
      usersPerPartner: 1000,
      accountsPerUser: 5,
      transactionsPerAccount: 500,
    },
  };

  return scenarios[name] || scenarios.basic;
}
