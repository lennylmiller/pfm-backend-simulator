import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BUDGET_CATEGORIES = [
  { name: 'Groceries', amount: 500 },
  { name: 'Dining Out', amount: 300 },
  { name: 'Gas & Transportation', amount: 200 },
  { name: 'Entertainment', amount: 150 },
  { name: 'Shopping', amount: 400 },
  { name: 'Healthcare', amount: 250 },
  { name: 'Utilities', amount: 300 },
  { name: 'Insurance', amount: 400 },
];

export async function generateBudgets(userId: bigint, count: number) {
  const budgets = [];
  const categories = faker.helpers.shuffle(BUDGET_CATEGORIES).slice(0, count);

  for (const category of categories) {
    const startDate = faker.date.past();
    const endDate = faker.date.future({ refDate: startDate });

    const budget = await prisma.budget.create({
      data: {
        userId,
        name: category.name,
        budgetAmount: category.amount,
        tagNames: [category.name.toLowerCase()],
        showOnDashboard: faker.datatype.boolean(0.9),
        startDate,
        endDate,
        recurrencePeriod: faker.helpers.arrayElement(['monthly', 'weekly', 'yearly']),
        other: {
          rollover: faker.datatype.boolean(0.5),
        },
      },
    });

    budgets.push(budget);
  }

  return budgets;
}
