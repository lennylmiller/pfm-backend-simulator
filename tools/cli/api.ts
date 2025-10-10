/**
 * API Client for PFM Backend Simulator CLI
 * Handles HTTP requests with authentication and logging
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
const chalk = require('chalk');

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private showRequests: boolean = true;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }

      if (this.showRequests) {
        console.log(chalk.cyan('\n📤 REQUEST:'));
        console.log(chalk.gray(`${config.method?.toUpperCase()} ${config.url}`));
        if (config.data) {
          console.log(chalk.gray('Body:'), JSON.stringify(config.data, null, 2));
        }
      }

      return config;
    });

    // Response interceptor to log responses
    this.client.interceptors.response.use(
      (response) => {
        if (this.showRequests) {
          console.log(chalk.green('\n✅ RESPONSE:'));
          console.log(chalk.gray(`Status: ${response.status}`));
          console.log(JSON.stringify(response.data, null, 2));
        }
        return response;
      },
      (error) => {
        if (this.showRequests) {
          console.log(chalk.red('\n❌ ERROR:'));
          console.log(chalk.gray(`Status: ${error.response?.status || 'Network Error'}`));
          if (error.response?.data) {
            console.log(JSON.stringify(error.response.data, null, 2));
          } else {
            console.log(error.message);
          }
        }
        throw error;
      }
    );
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  toggleRequestLogging(show: boolean) {
    this.showRequests = show;
  }

  // Generic HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.post<{ token?: string; user?: any }>('/api/v2/auth/login', { email, password });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  // Accounts
  async getAccounts(userId: string) {
    return this.get(`/api/v2/users/${userId}/accounts`);
  }

  async getAccount(userId: string, accountId: string) {
    return this.get(`/api/v2/users/${userId}/accounts/${accountId}`);
  }

  async createAccount(userId: string, account: any) {
    return this.post(`/api/v2/users/${userId}/accounts`, { account });
  }

  // Transactions
  async getTransactions(userId: string, params?: any) {
    return this.get(`/api/v2/users/${userId}/transactions`, { params });
  }

  async createTransaction(userId: string, transaction: any) {
    return this.post(`/api/v2/users/${userId}/transactions`, { transaction });
  }

  // Budgets
  async getBudgets(userId: string, params?: any) {
    return this.get(`/api/v2/users/${userId}/budgets`, { params });
  }

  async getBudget(userId: string, budgetId: string) {
    return this.get(`/api/v2/users/${userId}/budgets/${budgetId}`);
  }

  async createBudget(userId: string, budget: any) {
    return this.post(`/api/v2/users/${userId}/budgets`, { budget });
  }

  async updateBudget(userId: string, budgetId: string, budget: any) {
    return this.put(`/api/v2/users/${userId}/budgets/${budgetId}`, { budget });
  }

  async deleteBudget(userId: string, budgetId: string) {
    return this.delete(`/api/v2/users/${userId}/budgets/${budgetId}`);
  }

  // Goals
  async getGoals(userId: string) {
    return this.get(`/api/v2/users/${userId}/goals`);
  }

  async createGoal(userId: string, goal: any) {
    return this.post(`/api/v2/users/${userId}/goals`, { goal });
  }

  // Alerts
  async getAlerts(userId: string) {
    return this.get(`/api/v2/users/${userId}/alerts`);
  }

  // Notifications
  async getNotifications(userId: string) {
    return this.get(`/api/v2/users/${userId}/notifications`);
  }

  // Cashflow
  async getBills(userId: string) {
    return this.get(`/api/v2/users/${userId}/cashflow/bills`);
  }

  async getIncomes(userId: string) {
    return this.get(`/api/v2/users/${userId}/cashflow/incomes`);
  }

  async getEvents(userId: string, params?: any) {
    return this.get(`/api/v2/users/${userId}/cashflow/events`, { params });
  }

  // Expenses
  async getExpenses(userId: string, params: any) {
    return this.get(`/api/v2/users/${userId}/expenses`, { params });
  }
}
