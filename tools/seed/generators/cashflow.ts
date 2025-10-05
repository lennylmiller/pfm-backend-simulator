import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';

const prisma = new PrismaClient();

// Common recurring bills
const COMMON_BILLS = [
  { name: 'Rent/Mortgage', amountRange: [800, 2500], recurrence: 'monthly', dueDate: 1 },
  { name: 'Electric Bill', amountRange: [80, 200], recurrence: 'monthly', dueDate: 15 },
  { name: 'Water & Sewer', amountRange: [40, 100], recurrence: 'monthly', dueDate: 10 },
  { name: 'Internet', amountRange: [50, 120], recurrence: 'monthly', dueDate: 5 },
  { name: 'Cell Phone', amountRange: [50, 150], recurrence: 'monthly', dueDate: 20 },
  { name: 'Car Insurance', amountRange: [100, 300], recurrence: 'monthly', dueDate: 1 },
  { name: 'Netflix', amountRange: [10, 20], recurrence: 'monthly', dueDate: 12 },
  { name: 'Spotify', amountRange: [10, 15], recurrence: 'monthly', dueDate: 15 },
  { name: 'Gym Membership', amountRange: [20, 80], recurrence: 'monthly', dueDate: 1 },
  { name: 'Student Loan', amountRange: [150, 500], recurrence: 'monthly', dueDate: 28 },
];

// Common income sources
const COMMON_INCOMES = [
  { name: 'Salary', amountRange: [2000, 6000], recurrence: 'biweekly', receiveDate: 15 },
  { name: 'Freelance Work', amountRange: [500, 2000], recurrence: 'monthly', receiveDate: 1 },
  { name: 'Side Hustle', amountRange: [200, 800], recurrence: 'monthly', receiveDate: 10 },
  { name: 'Investment Income', amountRange: [100, 500], recurrence: 'monthly', receiveDate: 5 },
];

/**
 * Generate realistic cashflow bills for a user
 */
export async function generateCashflowBills(userId: bigint, count: number = 5) {
  const bills = [];
  const selectedBills = faker.helpers.shuffle(COMMON_BILLS).slice(0, count);

  for (const billTemplate of selectedBills) {
    const amount = faker.number.float({
      min: billTemplate.amountRange[0],
      max: billTemplate.amountRange[1],
      fractionDigits: 2,
    });

    const bill = await prisma.cashflowBill.create({
      data: {
        userId,
        name: billTemplate.name,
        amount,
        dueDate: billTemplate.dueDate,
        recurrence: billTemplate.recurrence,
        active: faker.datatype.boolean(0.95), // 95% are active
      },
    });

    bills.push(bill);
  }

  return bills;
}

/**
 * Generate realistic cashflow incomes for a user
 */
export async function generateCashflowIncomes(userId: bigint, count: number = 2) {
  const incomes = [];
  const selectedIncomes = faker.helpers.shuffle(COMMON_INCOMES).slice(0, count);

  for (const incomeTemplate of selectedIncomes) {
    const amount = faker.number.float({
      min: incomeTemplate.amountRange[0],
      max: incomeTemplate.amountRange[1],
      fractionDigits: 2,
    });

    const income = await prisma.cashflowIncome.create({
      data: {
        userId,
        name: incomeTemplate.name,
        amount,
        receiveDate: incomeTemplate.receiveDate,
        recurrence: incomeTemplate.recurrence,
        active: faker.datatype.boolean(0.98), // 98% are active
      },
    });

    incomes.push(income);
  }

  return incomes;
}

/**
 * Generate cashflow events based on bills and incomes
 * Creates projected events for the next 90 days
 */
export async function generateCashflowEvents(
  userId: bigint,
  bills: any[],
  incomes: any[]
) {
  const events = [];
  const today = new Date();
  const endDate = addDays(today, 90); // Project 90 days ahead

  // Generate events from bills
  for (const bill of bills) {
    if (!bill.active) continue;

    let currentDate = new Date(today);
    currentDate.setDate(bill.dueDate);

    // If the due date already passed this month, start from next month
    if (currentDate < today) {
      currentDate = addMonths(currentDate, 1);
    }

    while (currentDate <= endDate) {
      const event = await prisma.cashflowEvent.create({
        data: {
          userId,
          sourceType: 'bill',
          sourceId: bill.id,
          name: bill.name,
          amount: bill.amount,
          eventDate: currentDate,
          eventType: 'expense',
          processed: false,
          metadata: {
            recurrence: bill.recurrence,
            dueDate: bill.dueDate,
          },
        },
      });

      events.push(event);

      // Move to next occurrence based on recurrence
      if (bill.recurrence === 'monthly') {
        currentDate = addMonths(currentDate, 1);
      } else if (bill.recurrence === 'biweekly') {
        currentDate = addDays(currentDate, 14);
      } else if (bill.recurrence === 'weekly') {
        currentDate = addDays(currentDate, 7);
      }
    }
  }

  // Generate events from incomes
  for (const income of incomes) {
    if (!income.active) continue;

    let currentDate = new Date(today);
    currentDate.setDate(income.receiveDate);

    // If the receive date already passed this month, start from next month
    if (currentDate < today) {
      currentDate = addMonths(currentDate, 1);
    }

    while (currentDate <= endDate) {
      const event = await prisma.cashflowEvent.create({
        data: {
          userId,
          sourceType: 'income',
          sourceId: income.id,
          name: income.name,
          amount: income.amount,
          eventDate: currentDate,
          eventType: 'income',
          processed: false,
          metadata: {
            recurrence: income.recurrence,
            receiveDate: income.receiveDate,
          },
        },
      });

      events.push(event);

      // Move to next occurrence based on recurrence
      if (income.recurrence === 'monthly') {
        currentDate = addMonths(currentDate, 1);
      } else if (income.recurrence === 'biweekly') {
        currentDate = addDays(currentDate, 14);
      } else if (income.recurrence === 'weekly') {
        currentDate = addDays(currentDate, 7);
      }
    }
  }

  return events;
}

/**
 * Generate complete cashflow data (bills, incomes, and events) for a user
 */
export async function generateCashflow(
  userId: bigint,
  billCount: number = 5,
  incomeCount: number = 2
) {
  const bills = await generateCashflowBills(userId, billCount);
  const incomes = await generateCashflowIncomes(userId, incomeCount);
  const events = await generateCashflowEvents(userId, bills, incomes);

  return {
    bills,
    incomes,
    events,
  };
}
