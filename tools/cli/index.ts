#!/usr/bin/env node
/**
 * Interactive CLI for exploring PFM Backend Simulator
 *
 * This tool helps you learn the API by:
 * - Providing an interactive menu system
 * - Showing actual HTTP requests/responses
 * - Guiding you through common workflows
 * - Testing all major features
 */

import * as inquirer from 'inquirer';
const chalk = require('chalk');
import { ApiClient } from './api';
import { parseToken, displayUserContext, getTestUsers, UserContext } from './auth';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

const api = new ApiClient();
let userContext: UserContext | null = null;

// Display banner
function showBanner() {
  console.clear();
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║   PFM Backend Simulator - Learning CLI   ║'));
  console.log(chalk.blue.bold('╔════════════════════════════════════════════╗\n'));
  console.log(chalk.gray('This interactive tool helps you explore the API'));
  console.log(chalk.gray('All HTTP requests and responses are shown for learning\n'));
}

// Authentication menu
async function authMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Authentication:',
      choices: [
        { name: '🔐 Login with test user', value: 'login' },
        { name: '✍️  Login with custom credentials', value: 'custom' },
        { name: '🔑 Use existing JWT token', value: 'token' },
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return;

  if (action === 'login') {
    // Fetch actual test users from database
    console.log(chalk.gray('\n🔍 Loading test users from database...'));
    const testUsers = await getTestUsers();

    if (testUsers.length === 0) {
      await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
      return;
    }

    const { user } = await inquirer.prompt([
      {
        type: 'list',
        name: 'user',
        message: 'Select a test user:',
        choices: testUsers.map((u, i) => ({ name: u.label, value: i })),
      },
    ]);

    const credentials = testUsers[user];
    try {
      console.log(chalk.yellow('\n🔄 Logging in...'));
      const response = await api.login(credentials.email, credentials.password);

      if (response && 'token' in response && response.token) {
        userContext = parseToken(response.token);
        if (userContext) {
          console.log(chalk.green('\n✅ Login successful!'));
          displayUserContext(userContext);
        }
      }
    } catch (error: any) {
      console.log(chalk.red('\n❌ Login failed'));
      if (error.response?.status === 401) {
        console.log(chalk.yellow('\n💡 TIP: Make sure you\'ve run "npm run seed -- generate --clear"'));
      }
    }
  } else if (action === 'custom') {
    const { email, password } = await inquirer.prompt([
      { type: 'input', name: 'email', message: 'Email:' },
      { type: 'password', name: 'password', message: 'Password:', mask: '*' },
    ]);

    try {
      console.log(chalk.yellow('\n🔄 Logging in...'));
      const response = await api.login(email, password);

      if (response && 'token' in response && response.token) {
        userContext = parseToken(response.token);
        if (userContext) {
          console.log(chalk.green('\n✅ Login successful!'));
          displayUserContext(userContext);
        }
      }
    } catch (error) {
      console.log(chalk.red('\n❌ Login failed'));
    }
  } else if (action === 'token') {
    const { token } = await inquirer.prompt([
      { type: 'input', name: 'token', message: 'JWT Token:' },
    ]);

    api.setToken(token);
    userContext = parseToken(token);
    if (userContext) {
      console.log(chalk.green('\n✅ Token set!'));
      displayUserContext(userContext);
    }
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
}

// Accounts menu
async function accountsMenu() {
  if (!userContext) {
    console.log(chalk.red('\n❌ Please login first'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Account Operations:',
      choices: [
        { name: '📋 List all accounts', value: 'list' },
        { name: '🔍 Get specific account', value: 'get' },
        { name: '➕ Create new account', value: 'create' },
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return;

  try {
    if (action === 'list') {
      await api.getAccounts(userContext.userId);
    } else if (action === 'get') {
      const { accountId } = await inquirer.prompt([
        { type: 'input', name: 'accountId', message: 'Account ID:' },
      ]);
      await api.getAccount(userContext.userId, accountId);
    } else if (action === 'create') {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Account name:' },
        {
          type: 'list',
          name: 'account_type',
          message: 'Account type:',
          choices: ['checking', 'savings', 'credit_card', 'loan', 'investment'],
        },
        { type: 'input', name: 'balance', message: 'Initial balance:', default: '1000.00' },
      ]);

      await api.createAccount(userContext.userId, {
        name: answers.name,
        account_type: answers.account_type,
        balance: answers.balance,
        partner_id: userContext.partnerId,
      });

      console.log(chalk.green('\n✅ Account created successfully!'));
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Operation failed'));
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
}

// Budgets menu
async function budgetsMenu() {
  if (!userContext) {
    console.log(chalk.red('\n❌ Please login first'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Budget Operations:',
      choices: [
        { name: '📋 List all budgets', value: 'list' },
        { name: '🔍 Get specific budget', value: 'get' },
        { name: '➕ Create new budget', value: 'create' },
        { name: '✏️  Update budget', value: 'update' },
        { name: '🗑️  Delete budget', value: 'delete' },
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return;

  try {
    if (action === 'list') {
      await api.getBudgets(userContext.userId);
    } else if (action === 'get') {
      const { budgetId } = await inquirer.prompt([
        { type: 'input', name: 'budgetId', message: 'Budget ID:' },
      ]);
      await api.getBudget(userContext.userId, budgetId);
    } else if (action === 'create') {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Budget name:', default: 'Groceries' },
        { type: 'input', name: 'budget_amount', message: 'Budget amount:', default: '500.00' },
        { type: 'input', name: 'month', message: 'Month (1-12):', default: new Date().getMonth() + 1 },
        { type: 'input', name: 'year', message: 'Year:', default: new Date().getFullYear() },
      ]);

      await api.createBudget(userContext.userId, {
        name: answers.name,
        budget_amount: answers.budget_amount,
        month: parseInt(answers.month),
        year: parseInt(answers.year),
        show_on_dashboard: true,
      });

      console.log(chalk.green('\n✅ Budget created successfully!'));
    } else if (action === 'update') {
      const { budgetId } = await inquirer.prompt([
        { type: 'input', name: 'budgetId', message: 'Budget ID to update:' },
      ]);

      const updates = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'New name (leave empty to skip):' },
        { type: 'input', name: 'budget_amount', message: 'New amount (leave empty to skip):' },
      ]);

      const budget: any = {};
      if (updates.name) budget.name = updates.name;
      if (updates.budget_amount) budget.budget_amount = updates.budget_amount;

      await api.updateBudget(userContext.userId, budgetId, budget);
      console.log(chalk.green('\n✅ Budget updated successfully!'));
    } else if (action === 'delete') {
      const { budgetId } = await inquirer.prompt([
        { type: 'input', name: 'budgetId', message: 'Budget ID to delete:' },
      ]);

      const { confirm } = await inquirer.prompt([
        { type: 'confirm', name: 'confirm', message: 'Are you sure?', default: false },
      ]);

      if (confirm) {
        await api.deleteBudget(userContext.userId, budgetId);
        console.log(chalk.green('\n✅ Budget deleted successfully!'));
      }
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Operation failed'));
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
}

// Transactions menu
async function transactionsMenu() {
  if (!userContext) {
    console.log(chalk.red('\n❌ Please login first'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Transaction Operations:',
      choices: [
        { name: '📋 List recent transactions', value: 'list' },
        { name: '📅 List transactions by date range', value: 'date' },
        { name: '➕ Create new transaction', value: 'create' },
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return;

  try {
    if (action === 'list') {
      await api.getTransactions(userContext.userId);
    } else if (action === 'date') {
      const { start_date, end_date } = await inquirer.prompt([
        { type: 'input', name: 'start_date', message: 'Start date (YYYY-MM-DD):', default: '2024-01-01' },
        { type: 'input', name: 'end_date', message: 'End date (YYYY-MM-DD):', default: '2024-12-31' },
      ]);
      await api.getTransactions(userContext.userId, { start_date, end_date });
    } else if (action === 'create') {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'accountId', message: 'Account ID:' },
        { type: 'input', name: 'description', message: 'Description:', default: 'Coffee shop' },
        { type: 'input', name: 'amount', message: 'Amount (negative for debit):', default: '-5.50' },
        { type: 'input', name: 'posted_at', message: 'Date (YYYY-MM-DD):', default: new Date().toISOString().split('T')[0] },
      ]);

      await api.createTransaction(userContext.userId, {
        account_id: answers.accountId,
        description: answers.description,
        amount: answers.amount,
        posted_at: answers.posted_at,
        transaction_type: parseFloat(answers.amount) < 0 ? 'debit' : 'credit',
      });

      console.log(chalk.green('\n✅ Transaction created successfully!'));
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Operation failed'));
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
}

// Other features menu
async function otherFeaturesMenu() {
  if (!userContext) {
    console.log(chalk.red('\n❌ Please login first'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Explore Other Features:',
      choices: [
        { name: '🎯 Goals', value: 'goals' },
        { name: '🔔 Alerts', value: 'alerts' },
        { name: '📬 Notifications', value: 'notifications' },
        { name: '💰 Cashflow (Bills & Income)', value: 'cashflow' },
        { name: '📊 Expenses', value: 'expenses' },
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return;

  try {
    if (action === 'goals') {
      await api.getGoals(userContext.userId);
    } else if (action === 'alerts') {
      await api.getAlerts(userContext.userId);
    } else if (action === 'notifications') {
      await api.getNotifications(userContext.userId);
    } else if (action === 'cashflow') {
      const { subAction } = await inquirer.prompt([
        {
          type: 'list',
          name: 'subAction',
          message: 'Cashflow:',
          choices: [
            { name: 'Bills', value: 'bills' },
            { name: 'Incomes', value: 'incomes' },
            { name: 'Events', value: 'events' },
          ],
        },
      ]);

      if (subAction === 'bills') await api.getBills(userContext.userId);
      else if (subAction === 'incomes') await api.getIncomes(userContext.userId);
      else if (subAction === 'events') await api.getEvents(userContext.userId);
    } else if (action === 'expenses') {
      const { period } = await inquirer.prompt([
        {
          type: 'list',
          name: 'period',
          message: 'Time period:',
          choices: ['week', 'month', 'quarter', 'year'],
        },
      ]);

      await api.getExpenses(userContext.userId, { period });
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Operation failed'));
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
}

// Settings menu
async function settingsMenu() {
  const currentSetting = api['showRequests'] ? 'ON' : 'OFF';

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Settings:',
      choices: [
        { name: `Request/Response Logging: ${chalk.yellow(currentSetting)}`, value: 'toggle' },
        { name: '👤 Show current user context', value: 'context' },
        { name: '🎨 Generate RT Startup command', value: 'tiles-cmd' },
        { name: '🚪 Logout', value: 'logout' },
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'toggle') {
    api.toggleRequestLogging(!api['showRequests']);
    console.log(chalk.green(`\n✅ Request logging ${!api['showRequests'] ? 'enabled' : 'disabled'}`));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  } else if (action === 'context') {
    if (userContext) {
      displayUserContext(userContext);
    } else {
      console.log(chalk.yellow('\n⚠️  Not logged in'));
    }
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  } else if (action === 'tiles-cmd') {
    if (!userContext) {
      console.log(chalk.yellow('\n⚠️  Please login first to generate the command'));
      await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
      return;
    }

    // Generate a new cryptographically secure shared secret (64 bytes = 128 hex chars)
    const apiKey = crypto.randomBytes(64).toString('hex');

    // Generate the responsive-tiles start command (matching exact format from user's example)
    // API_KEY = JWT shared secret (symmetric key used to sign tokens in webpack, verify in backend)
    const command = `API_KEY=${apiKey} PARTNER_DOMAIN='pfm.backend.simulator' PCID=${userContext.userId} ENV=development npm start`;

    console.log(chalk.blue.bold('\n🎨 Responsive Tiles Start Command\n'));
    console.log(chalk.gray('Copy and run this command in the responsive-tiles directory:'));
    console.log(chalk.gray('~/code/banno/responsive-tiles\n'));
    console.log(chalk.green(command));
    console.log(chalk.gray('\nHow it works:'));
    console.log(chalk.gray('  • API_KEY = Newly generated JWT shared secret (128-char hex)'));
    console.log(chalk.gray('  • Frontend uses this secret to sign tokens in webpack'));
    console.log(chalk.gray('  • You must update backend JWT_SECRET to match this key'));
    console.log(chalk.gray('  • PARTNER_DOMAIN = pfm.backend.simulator (JWT audience claim)'));
    console.log(chalk.gray(`  • PCID = ${userContext.userId} (JWT subject claim)`));
    console.log(chalk.gray('  • ENV = development\n'));
    console.log(chalk.yellow('⚠️  IMPORTANT: Update backend .env with:'));
    console.log(chalk.yellow(`JWT_SECRET=${apiKey}\n`));
    console.log(chalk.gray('💡 Note: Ensure /etc/hosts has this entry:'));
    console.log(chalk.gray('127.0.0.1 pfm.backend.simulator\n'));

    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  } else if (action === 'logout') {
    api.clearToken();
    userContext = null;
    console.log(chalk.green('\n✅ Logged out'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  }
}

// Main menu
async function mainMenu() {
  while (true) {
    showBanner();

    if (userContext) {
      console.log(chalk.green(`✅ Logged in as User ${userContext.userId}\n`));
    } else {
      console.log(chalk.yellow('⚠️  Not logged in\n'));
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔐 Authentication', value: 'auth' },
          { name: '💳 Accounts', value: 'accounts' },
          { name: '💰 Budgets', value: 'budgets' },
          { name: '📝 Transactions', value: 'transactions' },
          { name: '🌟 Other Features', value: 'other' },
          { name: '⚙️  Settings', value: 'settings' },
          { name: '❌ Exit', value: 'exit' },
        ],
      },
    ]);

    switch (action) {
      case 'auth':
        await authMenu();
        break;
      case 'accounts':
        await accountsMenu();
        break;
      case 'budgets':
        await budgetsMenu();
        break;
      case 'transactions':
        await transactionsMenu();
        break;
      case 'other':
        await otherFeaturesMenu();
        break;
      case 'settings':
        await settingsMenu();
        break;
      case 'exit':
        console.log(chalk.blue('\n👋 Thanks for using the PFM CLI!\n'));
        process.exit(0);
    }
  }
}

// Start the CLI
async function start() {
  try {
    showBanner();

    console.log(chalk.yellow('📋 Quick Start Guide:\n'));
    console.log(chalk.gray('1. Make sure the server is running: npm run dev'));
    console.log(chalk.gray('2. Make sure you\'ve seeded data: npm run seed'));
    console.log(chalk.gray('3. Login with a test user'));
    console.log(chalk.gray('4. Explore the API features!\n'));

    const { ready } = await inquirer.prompt([
      { type: 'confirm', name: 'ready', message: 'Ready to start?', default: true },
    ]);

    if (ready) {
      await mainMenu();
    } else {
      console.log(chalk.blue('\n👋 See you later!\n'));
    }
  } catch (error: any) {
    if (error.message.includes('User force closed')) {
      console.log(chalk.blue('\n\n👋 Goodbye!\n'));
      process.exit(0);
    }
    throw error;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.blue('\n\n👋 Goodbye!\n'));
  process.exit(0);
});

start();
