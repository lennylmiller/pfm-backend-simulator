/**
 * Cashflow Controller
 * HTTP handlers for cashflow bills, incomes, events, and summary
 */

import { Request, Response } from 'express';
import * as cashflowService from '../services/cashflowService';
import {
  validateBillCreate,
  validateBillUpdate,
  validateIncomeCreate,
  validateIncomeUpdate,
  validateEventUpdate,
  validateCashflowSettings
} from '../validators/cashflowSchemas';
import {
  serializeBill,
  serializeIncome,
  serializeEvent,
  serializeCashflowSummary
} from '../utils/serializers';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// CASHFLOW SUMMARY
// =============================================================================

/**
 * GET /api/v2/users/:userId/cashflow
 * Get cashflow summary with totals and averages
 */
export async function getCashflowSummary(req: Request, res: Response): Promise<void> {
  try {
    const userId = BigInt(req.context!.userId);
    const summary = await cashflowService.getCashflowSummary(userId);
    res.json({ cashflow: serializeCashflowSummary(summary) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/cashflow
 * Update cashflow settings
 */
export async function updateCashflowSettings(req: Request, res: Response): Promise<void> {
  try {
    const userId = BigInt(req.context!.userId);
    const validated = validateCashflowSettings(req.body);
    // Settings are currently static in serializer
    // Future: persist settings in user preferences
    const summary = await cashflowService.getCashflowSummary(userId);
    res.json({ cashflow: serializeCashflowSummary(summary) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// =============================================================================
// BILLS
// =============================================================================

/**
 * GET /api/v2/users/:userId/cashflow/bills
 * List all bills for user
 */
export async function listBills(req: Request, res: Response): Promise<void> {
  try {
    const userId = BigInt(req.context!.userId);
    const bills = await cashflowService.getAllBills(userId);
    res.json({ bills: bills.map(serializeBill) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v2/users/:userId/cashflow/bills
 * Create a new bill
 */
export async function createBill(req: Request, res: Response): Promise<void> {
  try {
    const userId = BigInt(req.context!.userId);
    const validated = validateBillCreate(req.body);
    const bill = await cashflowService.createBill(userId, {
      name: validated.name,
      amount: validated.amount,
      dueDate: validated.due_date,
      recurrence: validated.recurrence,
      categoryId: validated.category_id,
      accountId: validated.account_id
    });
    res.status(201).json({ bill: serializeBill(bill) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * PUT /api/v2/users/:userId/cashflow/bills/:id
 * Update a bill
 */
export async function updateBill(req: Request, res: Response): Promise<void> {
  try {
    const billId = BigInt(req.params.id);
    const validated = validateBillUpdate(req.body);

    const bill = await cashflowService.updateBill(BigInt(req.context!.userId), billId, {
      name: validated.name,
      amount: validated.amount,
      dueDate: validated.due_date,
      recurrence: validated.recurrence,
      categoryId: validated.category_id,
      accountId: validated.account_id
    });

    if (!bill) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    res.json({ bill: serializeBill(bill) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /api/v2/users/:userId/cashflow/bills/:id
 * Delete a bill (soft delete)
 */
export async function deleteBill(req: Request, res: Response): Promise<void> {
  try {
    const billId = BigInt(req.params.id);
    const deleted = await cashflowService.deleteBill(BigInt(req.context!.userId), billId);

    if (!deleted) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/cashflow/bills/:id/stop
 * Stop a bill (deactivate)
 */
export async function stopBill(req: Request, res: Response): Promise<void> {
  try {
    const billId = BigInt(req.params.id);
    const bill = await cashflowService.stopBill(BigInt(req.context!.userId), billId);

    if (!bill) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    res.json({ bill: serializeBill(bill) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =============================================================================
// INCOMES
// =============================================================================

/**
 * GET /api/v2/users/:userId/cashflow/incomes
 * List all incomes for user
 */
export async function listIncomes(req: Request, res: Response): Promise<void> {
  try {
    const incomes = await cashflowService.getAllIncomes(BigInt(req.context!.userId));
    res.json({ incomes: incomes.map(serializeIncome) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v2/users/:userId/cashflow/incomes
 * Create a new income
 */
export async function createIncome(req: Request, res: Response): Promise<void> {
  try {
    const validated = validateIncomeCreate(req.body);
    const income = await cashflowService.createIncome(BigInt(req.context!.userId), {
      name: validated.name,
      amount: validated.amount,
      receiveDate: validated.receive_date,
      recurrence: validated.recurrence,
      categoryId: validated.category_id,
      accountId: validated.account_id
    });
    res.status(201).json({ income: serializeIncome(income) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * PUT /api/v2/users/:userId/cashflow/incomes/:id
 * Update an income
 */
export async function updateIncome(req: Request, res: Response): Promise<void> {
  try {
    const incomeId = BigInt(req.params.id);
    const validated = validateIncomeUpdate(req.body);

    const income = await cashflowService.updateIncome(BigInt(req.context!.userId), incomeId, {
      name: validated.name,
      amount: validated.amount,
      receiveDate: validated.receive_date,
      recurrence: validated.recurrence,
      categoryId: validated.category_id,
      accountId: validated.account_id
    });

    if (!income) {
      res.status(404).json({ error: 'Income not found' });
      return;
    }

    res.json({ income: serializeIncome(income) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /api/v2/users/:userId/cashflow/incomes/:id
 * Delete an income (soft delete)
 */
export async function deleteIncome(req: Request, res: Response): Promise<void> {
  try {
    const incomeId = BigInt(req.params.id);
    const deleted = await cashflowService.deleteIncome(BigInt(req.context!.userId), incomeId);

    if (!deleted) {
      res.status(404).json({ error: 'Income not found' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/cashflow/incomes/:id/stop
 * Stop an income (deactivate)
 */
export async function stopIncome(req: Request, res: Response): Promise<void> {
  try {
    const incomeId = BigInt(req.params.id);
    const income = await cashflowService.stopIncome(BigInt(req.context!.userId), incomeId);

    if (!income) {
      res.status(404).json({ error: 'Income not found' });
      return;
    }

    res.json({ income: serializeIncome(income) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * GET /api/v2/users/:userId/cashflow/events
 * List projected cashflow events (90 days)
 */
export async function listEvents(req: Request, res: Response): Promise<void> {
  try {
    const events = await cashflowService.getCashflowEvents(BigInt(req.context!.userId), false);
    res.json({ events: events.map(serializeEvent) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/v2/users/:userId/cashflow/events/:id
 * Update a cashflow event
 */
export async function updateEvent(req: Request, res: Response): Promise<void> {
  try {
    const eventId = BigInt(req.params.id);
    const validated = validateEventUpdate(req.body);

    const event = await cashflowService.updateCashflowEvent(BigInt(req.context!.userId), eventId, {
      name: validated.name,
      amount: validated.amount ? new Decimal(validated.amount) : undefined,
      eventDate: validated.event_date ? new Date(validated.event_date) : undefined,
      eventType: validated.event_type,
      accountId: validated.account_id,
      processed: validated.processed,
      metadata: validated.metadata
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json({ event: serializeEvent(event) });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message, details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /api/v2/users/:userId/cashflow/events/:id
 * Delete a cashflow event
 */
export async function deleteEvent(req: Request, res: Response): Promise<void> {
  try {
    const eventId = BigInt(req.params.id);
    const deleted = await cashflowService.deleteCashflowEvent(BigInt(req.context!.userId), eventId);

    if (!deleted) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
