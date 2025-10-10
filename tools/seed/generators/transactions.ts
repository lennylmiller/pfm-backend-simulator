import { faker } from '@faker-js/faker';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const MERCHANT_CATEGORIES: Record<string, string[]> = {
  Groceries: ['Whole Foods', 'Safeway', 'Kroger', "Trader Joe's", 'Sprouts'],
  'Gas & Fuel': ['Shell', 'Chevron', 'BP', 'Exxon', '76'],
  Restaurants: ['Starbucks', "McDonald's", 'Chipotle', 'Subway', 'Panera'],
  Shopping: ['Amazon', 'Target', 'Walmart', 'Best Buy', 'Costco'],
  Utilities: ['PG&E', 'Comcast', 'AT&T', 'Water District', 'Internet Provider'],
  Healthcare: ['CVS Pharmacy', 'Walgreens', 'Kaiser', 'Medical Center'],
  Entertainment: ['Netflix', 'Spotify', 'AMC Theaters', 'Hulu'],
  Transportation: ['Uber', 'Lyft', 'BART', 'Public Transit'],
  Insurance: ['State Farm', 'Geico', 'Progressive', 'Allstate'],
};

export async function generateTransactions(userId: bigint, accountId: bigint, count: number) {
  const transactions = [];

  for (let i = 0; i < count; i++) {
    // Generate date within last 90 days
    const postedAt = faker.date.recent({ days: 90 });

    // Pick random category and merchant
    const category = faker.helpers.objectKey(MERCHANT_CATEGORIES);
    const merchantName = faker.helpers.arrayElement(MERCHANT_CATEGORIES[category]);

    // Generate realistic amount
    const isDebit = faker.datatype.boolean(0.8); // 80% debits
    const amount = faker.number.float({
      min: isDebit ? -200 : 500,
      max: isDebit ? -5 : 5000,
      fractionDigits: 2,
    });

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId,
        referenceId: faker.string.uuid(),
        description: `${merchantName} - ${category}`,
        originalDescription: faker.lorem.words(3).toUpperCase(),
        merchantName,
        amount,
        transactionType: isDebit ? TransactionType.debit : TransactionType.credit,
        postedAt,
        transactedAt: faker.date.recent({ days: 1, refDate: postedAt }),
        metadata: {
          location: faker.location.city(),
          category: category,
        },
      },
    });

    transactions.push(transaction);
  }

  return transactions;
}
