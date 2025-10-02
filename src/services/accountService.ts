import { prisma } from '../config/database';
import { AccountState } from '@prisma/client';

export const accountService = {
  async getAllAccounts(userId: string) {
    return await prisma.account.findMany({
      where: {
        userId: BigInt(userId),
        archivedAt: null,
        state: AccountState.active,
      },
      orderBy: {
        ordering: 'asc',
      },
    });
  },

  async getAccountById(userId: string, accountId: string) {
    return await prisma.account.findFirst({
      where: {
        id: BigInt(accountId),
        userId: BigInt(userId),
      },
    });
  },

  async updateAccount(userId: string, accountId: string, data: any) {
    return await prisma.account.update({
      where: {
        id: BigInt(accountId),
      },
      data: {
        name: data.name,
        displayName: data.display_name,
        includeInNetworth: data.include_in_networth,
        includeInCashflow: data.include_in_cashflow,
        includeInBudget: data.include_in_budget,
        includeInGoals: data.include_in_goals,
        includeInDashboard: data.include_in_dashboard,
        updatedAt: new Date(),
      },
    });
  },

  async archiveAccount(userId: string, accountId: string) {
    return await prisma.account.update({
      where: {
        id: BigInt(accountId),
      },
      data: {
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  },

  async deleteAccount(userId: string, accountId: string) {
    return await prisma.account.delete({
      where: {
        id: BigInt(accountId),
      },
    });
  },
};
