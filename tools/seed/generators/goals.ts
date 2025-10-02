import { faker } from '@faker-js/faker';
import { PrismaClient, GoalType } from '@prisma/client';

const prisma = new PrismaClient();

const SAVINGS_GOALS = [
  { name: 'Emergency Fund', target: 10000 },
  { name: 'Vacation', target: 3000 },
  { name: 'New Car', target: 25000 },
  { name: 'Down Payment', target: 50000 },
  { name: 'Wedding', target: 15000 },
];

const PAYOFF_GOALS = [
  { name: 'Credit Card Debt', target: 5000 },
  { name: 'Student Loan', target: 20000 },
  { name: 'Auto Loan', target: 15000 },
  { name: 'Medical Bills', target: 3000 },
];

export async function generateGoals(userId: bigint, count: number) {
  const goals = [];

  for (let i = 0; i < count; i++) {
    const goalType = faker.helpers.arrayElement([GoalType.savings, GoalType.payoff]);
    const goalList = goalType === GoalType.savings ? SAVINGS_GOALS : PAYOFF_GOALS;
    const goalTemplate = faker.helpers.arrayElement(goalList);

    const targetAmount = goalTemplate.target + faker.number.int({ min: -2000, max: 2000 });
    const currentAmount = faker.number.float({
      min: 0,
      max: targetAmount * 0.7,
      fractionDigits: 2,
    });

    const goal = await prisma.goal.create({
      data: {
        userId,
        goalType,
        name: goalTemplate.name,
        description: faker.lorem.sentence(),
        targetAmount,
        currentAmount,
        targetDate: faker.date.future(),
        recurring: faker.datatype.boolean(0.3),
        imageUrl: faker.image.urlLoremFlickr({ category: 'finance' }),
        metadata: {
          priority: faker.helpers.arrayElement(['high', 'medium', 'low']),
        },
      },
    });

    goals.push(goal);
  }

  return goals;
}
