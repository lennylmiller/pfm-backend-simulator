import { faker } from '@faker-js/faker';
import { PrismaClient, AlertType } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateAlerts(userId: bigint, count: number) {
  const alerts = [];
  const alertTypes = Object.values(AlertType);

  for (let i = 0; i < count; i++) {
    const alertType = faker.helpers.arrayElement(alertTypes);

    const alert = await prisma.alert.create({
      data: {
        userId,
        alertType,
        name: getAlertName(alertType),
        conditions: getAlertConditions(alertType),
        emailDelivery: faker.datatype.boolean(0.8),
        smsDelivery: faker.datatype.boolean(0.3),
        active: faker.datatype.boolean(0.9),
      },
    });

    alerts.push(alert);
  }

  return alerts;
}

function getAlertName(alertType: AlertType): string {
  const names: Record<AlertType, string> = {
    account_threshold: `Balance Alert - ${faker.finance.accountName()}`,
    goal: `Goal Milestone - ${faker.lorem.words(2)}`,
    merchant_name: `Merchant Alert - ${faker.company.name()}`,
    spending_target: `Spending Limit - ${faker.lorem.word()}`,
    transaction_limit: `Transaction Limit - ${faker.lorem.word()}`,
    upcoming_bill: `Bill Reminder - ${faker.company.name()}`,
  };

  return names[alertType];
}

function getAlertConditions(alertType: AlertType): any {
  switch (alertType) {
    case 'account_threshold':
      return {
        threshold: faker.number.int({ min: 100, max: 1000 }),
        direction: faker.helpers.arrayElement(['below', 'above']),
      };
    case 'goal':
      return {
        milestone: faker.number.int({ min: 25, max: 100 }),
      };
    case 'merchant_name':
      return {
        merchant: faker.company.name(),
        notify_on_any: true,
      };
    case 'spending_target':
      return {
        amount: faker.number.int({ min: 500, max: 2000 }),
        period: faker.helpers.arrayElement(['weekly', 'monthly']),
      };
    case 'transaction_limit':
      return {
        amount: faker.number.int({ min: 100, max: 500 }),
      };
    case 'upcoming_bill':
      return {
        days_before: faker.number.int({ min: 1, max: 7 }),
      };
    default:
      return {};
  }
}
