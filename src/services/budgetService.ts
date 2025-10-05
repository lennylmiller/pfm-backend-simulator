import * as fs from 'fs';
import * as path from 'path';

const MOCK_DATA_PATH = '/Users/LenMiller/code/banno/responsive-tiles/src/api/data';

function loadMockData(filename: string) {
  const filePath = path.join(MOCK_DATA_PATH, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

let budgetIdCounter = 300;
const budgetStore: Map<string, any> = new Map();

export const budgetService = {
  async getBudgets(userId: string, startDate?: string, endDate?: string) {
    const mockData = loadMockData('budgets.json');

    let budgets = mockData.budgets;

    if (startDate || endDate) {
      budgets = budgets.filter((budget: any) => {
        const budgetDate = new Date(budget.year, budget.month - 1);

        if (startDate) {
          const start = new Date(startDate);
          if (budgetDate < start) return false;
        }

        if (endDate) {
          const end = new Date(endDate);
          if (budgetDate > end) return false;
        }

        return true;
      });
    }

    return {
      budgets,
      meta: mockData.meta,
    };
  },

  async getBudgetById(userId: string, budgetId: string) {
    const mockData = loadMockData('budgets.json');
    return mockData.budgets.find((b: any) => b.id === parseInt(budgetId));
  },

  async createBudget(userId: string, data: any) {
    const newBudget = {
      id: budgetIdCounter++,
      month: data.month || new Date().getMonth() + 1,
      year: data.year || new Date().getFullYear(),
      name: data.name,
      state: 'under',
      spent: 0,
      budget_amount: data.budget_amount,
      tag_names: data.tag_names || [],
      links: {
        accounts: data.accounts || [],
      },
    };

    budgetStore.set(newBudget.id.toString(), newBudget);
    return newBudget;
  },

  async updateBudget(userId: string, budgetId: string, data: any) {
    const mockData = loadMockData('budgets.json');
    const budget = mockData.budgets.find((b: any) => b.id === parseInt(budgetId));

    if (!budget) {
      const stored = budgetStore.get(budgetId);
      if (stored) {
        Object.assign(stored, data);
        return stored;
      }
      throw new Error('Budget not found');
    }

    Object.assign(budget, {
      name: data.name !== undefined ? data.name : budget.name,
      budget_amount: data.budget_amount !== undefined ? data.budget_amount : budget.budget_amount,
      tag_names: data.tag_names !== undefined ? data.tag_names : budget.tag_names,
    });

    return budget;
  },

  async deleteBudget(userId: string, budgetId: string) {
    budgetStore.delete(budgetId);
    return;
  },
};
