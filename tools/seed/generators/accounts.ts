import { faker } from '@faker-js/faker';
import { PrismaClient, AccountType, AccountState, AggregationType } from '@prisma/client';

const prisma = new PrismaClient();

const ACCOUNT_NAMES: Record<AccountType, string[]> = {
  checking: ['Main Checking', 'Joint Checking', 'Business Checking'],
  savings: ['Emergency Fund', 'Vacation Savings', 'High Yield Savings'],
  credit_card: ['Visa', 'Mastercard', 'AmEx', 'Discover'],
  loan: ['Personal Loan', 'Auto Loan', 'Home Equity'],
  investment: ['401k', 'IRA', 'Brokerage Account'],
  mortgage: ['Home Mortgage', 'Second Home', 'Rental Property'],
  line_of_credit: ['Home Equity Line', 'Business Line'],
  other: ['Miscellaneous Account'],
};

export async function generateAccounts(userId: bigint, partnerId: bigint, count: number) {
  const accounts = [];
  const accountTypes = Object.keys(ACCOUNT_NAMES) as AccountType[];

  for (let i = 0; i < count; i++) {
    const accountType = faker.helpers.arrayElement(accountTypes);
    const accountName = faker.helpers.arrayElement(ACCOUNT_NAMES[accountType]);

    // Generate realistic balance based on account type
    let balance = 0;
    switch (accountType) {
      case 'checking':
        balance = faker.number.float({ min: 100, max: 10000, fractionDigits: 2 });
        break;
      case 'savings':
        balance = faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 });
        break;
      case 'credit_card':
        balance = faker.number.float({ min: -5000, max: 0, fractionDigits: 2 });
        break;
      case 'loan':
      case 'mortgage':
        balance = faker.number.float({ min: -200000, max: -5000, fractionDigits: 2 });
        break;
      case 'investment':
        balance = faker.number.float({ min: 5000, max: 500000, fractionDigits: 2 });
        break;
      default:
        balance = faker.number.float({ min: -10000, max: 10000, fractionDigits: 2 });
    }

    const account = await prisma.account.create({
      data: {
        userId,
        partnerId,
        name: accountName,
        displayName: faker.helpers.maybe(
          () => `${accountName} (${faker.finance.accountNumber(4)})`,
          { probability: 0.5 }
        ),
        number: faker.finance.accountNumber(),
        referenceId: faker.string.uuid(),
        accountType,
        displayAccountType: accountType,
        aggregationType: faker.helpers.arrayElement(Object.values(AggregationType)),
        balance,
        state: faker.helpers.weightedArrayElement([
          { value: AccountState.active, weight: 9 },
          { value: AccountState.inactive, weight: 1 },
        ]),
        includeInNetworth: faker.datatype.boolean(0.9),
        includeInCashflow: faker.datatype.boolean(0.9),
        includeInBudget: faker.datatype.boolean(0.8),
        includeInGoals: faker.datatype.boolean(0.7),
        includeInDashboard: faker.datatype.boolean(0.95),
        ordering: i,
      },
    });

    accounts.push(account);
  }

  return accounts;
}
