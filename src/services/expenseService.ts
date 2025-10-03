import * as fs from 'fs';
import * as path from 'path';

const MOCK_DATA_PATH = '/Users/LenMiller/code/banno/responsive-tiles/src/api/data';

function loadMockData(filename: string) {
  const filePath = path.join(MOCK_DATA_PATH, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export const expenseService = {
  async getExpenses(userId: string, filters: {
    beginOn?: string;
    endOn?: string;
    threshold?: number;
  }) {
    const mockData = loadMockData('expenses.json');

    let expenses = mockData.expenses || [];

    // Apply threshold filter if provided
    if (filters.threshold !== undefined) {
      expenses = expenses.filter((expense: any) =>
        parseFloat(expense.amount) >= filters.threshold!
      );
    }

    return expenses;
  }
};
