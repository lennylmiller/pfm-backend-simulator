import { prisma } from '../config/database';
import { AccountState } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const MOCK_DATA_PATH = '/Users/LenMiller/code/banno/responsive-tiles/src/api/data';

function loadMockData(filename: string) {
  const filePath = path.join(MOCK_DATA_PATH, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

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

  async getAccountInvestments(userId: string, accountId: string) {
    const mockData = loadMockData('investments.json');
    return mockData;
  },

  async getAccountTransactions(userId: string, accountId: string, page: number = 1) {
    const mockData = loadMockData('accountTransactions.json');
    const pageKey = page.toString();

    if (mockData[pageKey]) {
      return mockData[pageKey];
    }

    return {
      transactions: [],
      accounts: [],
      meta: { total_pages: 0, current_page: page }
    };
  },

  async getPotentialCashflowAccounts(userId: string) {
    const mockData = loadMockData('cashflow_potential_accounts.json');
    return mockData.accounts || [];
  },
};
