import * as fs from 'fs';
import * as path from 'path';

const MOCK_DATA_PATH = '/Users/LenMiller/code/banno/responsive-tiles/src/api/data';

function loadMockData(filename: string) {
  const filePath = path.join(MOCK_DATA_PATH, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const transactionStore: Map<string, any> = new Map();

export const transactionService = {
  async searchTransactions(userId: string, filters: {
    query?: string;
    untagged?: boolean;
    tags?: string[];
    beginOn?: string;
    endOn?: string;
  }) {
    // Load transactions from account transactions mock data
    const accountTxData = loadMockData('accountTransactions.json');

    // Get all transactions from all pages
    let allTransactions: any[] = [];
    Object.values(accountTxData).forEach((page: any) => {
      if (page.transactions) {
        allTransactions = allTransactions.concat(page.transactions);
      }
    });

    let transactions = [...allTransactions];

    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      transactions = transactions.filter((tx: any) =>
        tx.memo?.toLowerCase().includes(query) ||
        tx.nickname?.toLowerCase().includes(query) ||
        tx.original_name?.toLowerCase().includes(query)
      );
    }

    if (filters.untagged) {
      transactions = transactions.filter((tx: any) => !tx.tags || tx.tags.length === 0);
    }

    if (filters.tags && filters.tags.length > 0) {
      transactions = transactions.filter((tx: any) =>
        tx.tags && tx.tags.some((tag: any) => filters.tags?.includes(tag.name))
      );
    }

    if (filters.beginOn) {
      const beginDate = new Date(filters.beginOn);
      transactions = transactions.filter((tx: any) =>
        new Date(tx.posted_at) >= beginDate
      );
    }

    if (filters.endOn) {
      const endDate = new Date(filters.endOn);
      transactions = transactions.filter((tx: any) =>
        new Date(tx.posted_at) <= endDate
      );
    }

    return {
      transactions,
      meta: {
        total_pages: 1,
        current_page: 1
      }
    };
  },

  async updateTransaction(userId: string, transactionId: string, data: any, repeat: boolean = false) {
    const accountTxData = loadMockData('accountTransactions.json');

    // Find transaction in mock data
    let transaction: any = null;
    for (const page of Object.values(accountTxData)) {
      const tx = (page as any).transactions?.find((t: any) => t.id === transactionId);
      if (tx) {
        transaction = tx;
        break;
      }
    }

    if (!transaction) {
      transaction = transactionStore.get(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
    }

    // Update transaction
    if (data.tags !== undefined) {
      transaction.tags = data.tags;
    }
    if (data.nickname !== undefined) {
      transaction.nickname = data.nickname;
    }

    transactionStore.set(transactionId, transaction);
    return transaction;
  },

  async deleteTransaction(userId: string, transactionId: string) {
    transactionStore.delete(transactionId);
    return;
  }
};
