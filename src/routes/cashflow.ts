/**
 * Cashflow Routes
 * Routes for cashflow bills, incomes, events, and summary
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as cashflowController from '../controllers/cashflowController';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// =============================================================================
// CASHFLOW SUMMARY
// =============================================================================

// GET /api/v2/users/:userId/cashflow - Get cashflow summary
router.get('/users/:userId/cashflow', cashflowController.getCashflowSummary);

// PUT /api/v2/users/:userId/cashflow - Update cashflow settings
router.put('/users/:userId/cashflow', cashflowController.updateCashflowSettings);

// =============================================================================
// BILLS
// =============================================================================

// GET /api/v2/users/:userId/cashflow/bills - List all bills
router.get('/users/:userId/cashflow/bills', cashflowController.listBills);

// POST /api/v2/users/:userId/cashflow/bills - Create a bill
router.post('/users/:userId/cashflow/bills', cashflowController.createBill);

// PUT /api/v2/users/:userId/cashflow/bills/:id - Update a bill
router.put('/users/:userId/cashflow/bills/:id', cashflowController.updateBill);

// DELETE /api/v2/users/:userId/cashflow/bills/:id - Delete a bill
router.delete('/users/:userId/cashflow/bills/:id', cashflowController.deleteBill);

// PUT /api/v2/users/:userId/cashflow/bills/:id/stop - Stop a bill
router.put('/users/:userId/cashflow/bills/:id/stop', cashflowController.stopBill);

// =============================================================================
// INCOMES
// =============================================================================

// GET /api/v2/users/:userId/cashflow/incomes - List all incomes
router.get('/users/:userId/cashflow/incomes', cashflowController.listIncomes);

// POST /api/v2/users/:userId/cashflow/incomes - Create an income
router.post('/users/:userId/cashflow/incomes', cashflowController.createIncome);

// PUT /api/v2/users/:userId/cashflow/incomes/:id - Update an income
router.put('/users/:userId/cashflow/incomes/:id', cashflowController.updateIncome);

// DELETE /api/v2/users/:userId/cashflow/incomes/:id - Delete an income
router.delete('/users/:userId/cashflow/incomes/:id', cashflowController.deleteIncome);

// PUT /api/v2/users/:userId/cashflow/incomes/:id/stop - Stop an income
router.put('/users/:userId/cashflow/incomes/:id/stop', cashflowController.stopIncome);

// =============================================================================
// EVENTS
// =============================================================================

// GET /api/v2/users/:userId/cashflow/events - List projected events
router.get('/users/:userId/cashflow/events', cashflowController.listEvents);

// PUT /api/v2/users/:userId/cashflow/events/:id - Update an event
router.put('/users/:userId/cashflow/events/:id', cashflowController.updateEvent);

// DELETE /api/v2/users/:userId/cashflow/events/:id - Delete an event
router.delete('/users/:userId/cashflow/events/:id', cashflowController.deleteEvent);

export default router;
