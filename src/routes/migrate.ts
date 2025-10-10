import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fetch from 'isomorphic-fetch';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AccountState, AccountType, AggregationType, GoalType, AlertType } from '@prisma/client';

const router = Router();

interface MigrateConfig {
  apiKey: string;
  partnerDomain: string;
  pcid: string;
  partnerId: string;
}

/**
 * Generate JWT token for Geezeo API authentication
 */
function generateJWT(config: MigrateConfig): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 15 * 60; // 15 minutes

  return jwt.sign(
    {
      iss: config.partnerId,
      aud: config.partnerDomain,
      sub: config.pcid,
      iat,
      exp,
    },
    config.apiKey
  );
}

/**
 * Fetch data from Geezeo API
 */
async function fetchFromGeezeo(
  config: MigrateConfig,
  token: string,
  endpoint: string
): Promise<any> {
  const baseUrl = `https://${config.partnerDomain}/api/v2`;
  const url = `${baseUrl}${endpoint}`;

  logger.info(`Fetching from Geezeo API: ${endpoint}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Geezeo API error (${response.status}): ${text}`);
  }

  return await response.json();
}

/**
 * Send SSE progress update
 */
function sendProgress(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Test connection to Geezeo API
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const config = req.body as MigrateConfig;
    const token = generateJWT(config);

    // Try to fetch current user to verify connection
    const userData = await fetchFromGeezeo(config, token, '/users/current');

    res.json({
      success: true,
      user: userData.user,
    });
  } catch (error: any) {
    logger.error('Migration test connection failed:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Start migration process with SSE progress streaming
 */
router.post('/start', async (req: Request, res: Response) => {
  const { apiKey, partnerDomain, pcid, partnerId, entities } = req.body;

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  const config: MigrateConfig = { apiKey, partnerDomain, pcid, partnerId };

  try {
    const token = generateJWT(config);
    await runMigration(config, token, entities, res);
    sendProgress(res, { status: 'complete' });
  } catch (error: any) {
    logger.error('Migration failed:', error);
    sendProgress(res, { error: error.message });
  } finally {
    res.end();
  }
});

/**
 * Main migration orchestration
 */
async function runMigration(
  config: MigrateConfig,
  token: string,
  entities: Record<string, boolean>,
  res: Response
) {
  const userId = config.pcid;
  const partnerId = BigInt(config.partnerId);

  // 1. Import User
  if (entities.user) {
    sendProgress(res, { entity: 'user', status: 'fetching' });
    try {
      const data = await fetchFromGeezeo(config, token, '/users/current');
      const user = data.user;

      await prisma.user.upsert({
        where: { id: BigInt(userId) },
        update: {
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          updatedAt: new Date(),
        },
        create: {
          id: BigInt(userId),
          partnerId,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          hashedPassword: '', // Empty password for imported users
        },
      });

      sendProgress(res, {
        entity: 'user',
        status: 'entity_complete',
        message: `Imported user: ${user.email}`,
      });
    } catch (error: any) {
      sendProgress(res, {
        entity: 'user',
        status: 'entity_error',
        message: error.message,
      });
    }
  }

  // 2. Import Accounts
  if (entities.accounts) {
    sendProgress(res, { entity: 'accounts', status: 'fetching' });
    try {
      const data = await fetchFromGeezeo(config, token, `/users/${userId}/accounts/all`);
      const accounts = data.accounts || [];

      sendProgress(res, { entity: 'accounts', status: 'inserting', total: accounts.length });

      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];

        await prisma.account.upsert({
          where: { id: BigInt(account.id) },
          update: {
            name: account.name,
            displayName: account.display_name,
            accountType: (account.account_type as AccountType) || AccountType.checking,
            balance: account.balance || '0',
            state: (account.state as AccountState) || AccountState.active,
            aggregationType:
              (account.aggregation_type as AggregationType) || AggregationType.manual,
            includeInNetworth: account.include_in_networth ?? true,
            includeInCashflow: account.include_in_cashflow ?? true,
            updatedAt: new Date(),
          },
          create: {
            id: BigInt(account.id),
            userId: BigInt(userId),
            partnerId,
            name: account.name,
            displayName: account.display_name,
            number: account.number || '',
            referenceId: account.reference_id || '',
            accountType: (account.account_type as AccountType) || AccountType.checking,
            displayAccountType: account.display_account_type || account.account_type,
            balance: account.balance || '0',
            state: (account.state as AccountState) || AccountState.active,
            aggregationType:
              (account.aggregation_type as AggregationType) || AggregationType.manual,
            includeInNetworth: account.include_in_networth ?? true,
            includeInCashflow: account.include_in_cashflow ?? true,
            includeInExpenses: account.include_in_expenses ?? true,
          },
        });

        if ((i + 1) % 10 === 0 || i === accounts.length - 1) {
          sendProgress(res, {
            entity: 'accounts',
            status: 'inserting',
            progress: i + 1,
            total: accounts.length,
          });
        }
      }

      sendProgress(res, {
        entity: 'accounts',
        status: 'entity_complete',
        message: `Imported ${accounts.length} accounts`,
      });
    } catch (error: any) {
      sendProgress(res, {
        entity: 'accounts',
        status: 'entity_error',
        message: error.message,
      });
    }
  }

  // 3. Import Transactions
  if (entities.transactions) {
    sendProgress(res, { entity: 'transactions', status: 'fetching' });
    try {
      const data = await fetchFromGeezeo(
        config,
        token,
        `/users/${userId}/transactions/search?untagged=0`
      );
      const transactions = data.transactions || [];

      sendProgress(res, {
        entity: 'transactions',
        status: 'inserting',
        total: transactions.length,
      });

      for (let i = 0; i < transactions.length; i++) {
        const txn = transactions[i];

        await prisma.transaction.upsert({
          where: { id: BigInt(txn.id) },
          update: {
            nickname: txn.nickname,
            originalDescription: txn.original_name,
            amount: txn.amount || '0',
            postedAt: txn.posted_at ? new Date(txn.posted_at) : new Date(),
            updatedAt: new Date(),
          },
          create: {
            id: BigInt(txn.id),
            accountId: BigInt(txn.account_id),
            userId: BigInt(userId),
            nickname: txn.nickname,
            originalDescription: txn.original_name,
            referenceId: txn.reference_id || '',
            amount: txn.amount || '0',
            balance: txn.balance || '0',
            postedAt: txn.posted_at ? new Date(txn.posted_at) : new Date(),
            transactedAt: txn.transacted_at ? new Date(txn.transacted_at) : null,
          },
        });

        if ((i + 1) % 50 === 0 || i === transactions.length - 1) {
          sendProgress(res, {
            entity: 'transactions',
            status: 'inserting',
            progress: i + 1,
            total: transactions.length,
          });
        }
      }

      sendProgress(res, {
        entity: 'transactions',
        status: 'entity_complete',
        message: `Imported ${transactions.length} transactions`,
      });
    } catch (error: any) {
      sendProgress(res, {
        entity: 'transactions',
        status: 'entity_error',
        message: error.message,
      });
    }
  }

  // 4. Import Budgets
  if (entities.budgets) {
    sendProgress(res, { entity: 'budgets', status: 'fetching' });
    try {
      const data = await fetchFromGeezeo(config, token, `/users/${userId}/budgets`);
      const budgets = data.budgets || [];

      sendProgress(res, { entity: 'budgets', status: 'inserting', total: budgets.length });

      for (let i = 0; i < budgets.length; i++) {
        const budget = budgets[i];

        await prisma.budget.upsert({
          where: { id: BigInt(budget.id) },
          update: {
            name: budget.name,
            budgetAmount: budget.budget_amount || '0',
            showOnDashboard: budget.show_on_dashboard ?? true,
            updatedAt: new Date(),
          },
          create: {
            id: BigInt(budget.id),
            userId: BigInt(userId),
            name: budget.name,
            budgetAmount: budget.budget_amount || '0',
            showOnDashboard: budget.show_on_dashboard ?? true,
          },
        });

        sendProgress(res, {
          entity: 'budgets',
          status: 'inserting',
          progress: i + 1,
          total: budgets.length,
        });
      }

      sendProgress(res, {
        entity: 'budgets',
        status: 'entity_complete',
        message: `Imported ${budgets.length} budgets`,
      });
    } catch (error: any) {
      sendProgress(res, {
        entity: 'budgets',
        status: 'entity_error',
        message: error.message,
      });
    }
  }

  // 5. Import Goals (Savings + Payoff)
  if (entities.goals) {
    sendProgress(res, { entity: 'goals', status: 'fetching' });
    try {
      let totalGoals = 0;

      // Fetch savings goals
      const savingsData = await fetchFromGeezeo(config, token, `/users/${userId}/savings_goals`);
      const savingsGoals = savingsData.savings_goals || [];

      // Fetch payoff goals
      const payoffData = await fetchFromGeezeo(config, token, `/users/${userId}/payoff_goals`);
      const payoffGoals = payoffData.payoff_goals || [];

      const allGoals = [...savingsGoals, ...payoffGoals];
      sendProgress(res, { entity: 'goals', status: 'inserting', total: allGoals.length });

      // Insert savings goals
      for (let i = 0; i < savingsGoals.length; i++) {
        const goal = savingsGoals[i];

        await prisma.goal.upsert({
          where: { id: BigInt(goal.id) },
          update: {
            name: goal.name,
            goalType: GoalType.savings,
            targetAmount: goal.goal_amount || '0',
            currentAmount: goal.current_amount || '0',
            updatedAt: new Date(),
          },
          create: {
            id: BigInt(goal.id),
            userId: BigInt(userId),
            name: goal.name,
            goalType: GoalType.savings,
            targetAmount: goal.goal_amount || '0',
            currentAmount: goal.current_amount || '0',
          },
        });
        totalGoals++;
        sendProgress(res, {
          entity: 'goals',
          status: 'inserting',
          progress: totalGoals,
          total: allGoals.length,
        });
      }

      // Insert payoff goals
      for (let i = 0; i < payoffGoals.length; i++) {
        const goal = payoffGoals[i];

        await prisma.goal.upsert({
          where: { id: BigInt(goal.id) },
          update: {
            name: goal.name,
            goalType: GoalType.payoff,
            targetAmount: goal.balance || '0',
            currentAmount: goal.current_balance || '0',
            updatedAt: new Date(),
          },
          create: {
            id: BigInt(goal.id),
            userId: BigInt(userId),
            name: goal.name,
            goalType: GoalType.payoff,
            targetAmount: goal.balance || '0',
            currentAmount: goal.current_balance || '0',
          },
        });
        totalGoals++;
        sendProgress(res, {
          entity: 'goals',
          status: 'inserting',
          progress: totalGoals,
          total: allGoals.length,
        });
      }

      sendProgress(res, {
        entity: 'goals',
        status: 'entity_complete',
        message: `Imported ${totalGoals} goals`,
      });
    } catch (error: any) {
      sendProgress(res, {
        entity: 'goals',
        status: 'entity_error',
        message: error.message,
      });
    }
  }

  // 6. Import Alerts
  if (entities.alerts) {
    sendProgress(res, { entity: 'alerts', status: 'fetching' });
    try {
      const data = await fetchFromGeezeo(config, token, `/users/${userId}/alerts`);
      const alerts = data.alerts || [];

      sendProgress(res, { entity: 'alerts', status: 'inserting', total: alerts.length });

      for (let i = 0; i < alerts.length; i++) {
        const alert = alerts[i];

        await prisma.alert.upsert({
          where: { id: BigInt(alert.id) },
          update: {
            name: alert.name,
            alertType: (alert.alert_type as AlertType) || AlertType.account_threshold,
            active: alert.is_active ?? true,
            updatedAt: new Date(),
          },
          create: {
            id: BigInt(alert.id),
            userId: BigInt(userId),
            name: alert.name,
            alertType: (alert.alert_type as AlertType) || AlertType.account_threshold,
            active: alert.is_active ?? true,
          },
        });

        sendProgress(res, {
          entity: 'alerts',
          status: 'inserting',
          progress: i + 1,
          total: alerts.length,
        });
      }

      sendProgress(res, {
        entity: 'alerts',
        status: 'entity_complete',
        message: `Imported ${alerts.length} alerts`,
      });
    } catch (error: any) {
      sendProgress(res, {
        entity: 'alerts',
        status: 'entity_error',
        message: error.message,
      });
    }
  }

  // 7. Import Tags
  if (entities.tags) {
    sendProgress(res, { entity: 'tags', status: 'fetching' });
    try {
      const data = await fetchFromGeezeo(config, token, `/users/${userId}/tags`);
      const tags = data.tags || [];

      sendProgress(res, { entity: 'tags', status: 'inserting', total: tags.length });

      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];

        if (tag.id) {
          // If tag has an ID from Geezeo, upsert it
          await prisma.tag.upsert({
            where: { id: BigInt(tag.id) },
            update: {
              name: tag.display_name || tag.name,
              updatedAt: new Date(),
            },
            create: {
              id: BigInt(tag.id),
              partnerId,
              userId: BigInt(userId),
              name: tag.display_name || tag.name,
            },
          });
        } else {
          // Otherwise just create a new tag
          await prisma.tag.create({
            data: {
              partnerId,
              userId: BigInt(userId),
              name: tag.display_name || tag.name,
            },
          });
        }

        sendProgress(res, {
          entity: 'tags',
          status: 'inserting',
          progress: i + 1,
          total: tags.length,
        });
      }

      sendProgress(res, {
        entity: 'tags',
        status: 'entity_complete',
        message: `Imported ${tags.length} tags`,
      });
    } catch (error: any) {
      sendProgress(res, {
        entity: 'tags',
        status: 'entity_error',
        message: error.message,
      });
    }
  }
}

export default router;
