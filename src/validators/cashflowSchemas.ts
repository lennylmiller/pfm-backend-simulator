/**
 * Cashflow Validation Schemas
 * Zod schemas for validating cashflow bills, incomes, and events
 */

import { z } from 'zod';

// Recurrence type enum
const recurrenceValues = ['monthly', 'biweekly', 'weekly'] as const;

// Event type enum
const eventTypeValues = ['income', 'expense'] as const;

// =============================================================================
// BILL SCHEMAS
// =============================================================================

export const BillCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  amount: z.string().regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places'),
  due_date: z.number().int().min(1, 'Due date must be between 1-31').max(31, 'Due date must be between 1-31'),
  recurrence: z.enum(recurrenceValues).default('monthly'),
  category_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional(),
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional()
});

export const BillUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  amount: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  due_date: z.number().int().min(1).max(31).optional(),
  recurrence: z.enum(recurrenceValues).optional(),
  category_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional().nullable(),
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional().nullable()
});

// =============================================================================
// INCOME SCHEMAS
// =============================================================================

export const IncomeCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  amount: z.string().regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places'),
  receive_date: z.number().int().min(1, 'Receive date must be between 1-31').max(31, 'Receive date must be between 1-31'),
  recurrence: z.enum(recurrenceValues).default('monthly'),
  category_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional(),
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional()
});

export const IncomeUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  amount: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  receive_date: z.number().int().min(1).max(31).optional(),
  recurrence: z.enum(recurrenceValues).optional(),
  category_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional().nullable(),
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional().nullable()
});

// =============================================================================
// EVENT SCHEMAS
// =============================================================================

export const EventUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  amount: z.string().regex(/^-?\d+(\.\d{2})?$/).optional(),
  event_date: z.string().datetime('Must be a valid ISO 8601 datetime').optional(),
  event_type: z.enum(eventTypeValues).optional(),
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional().nullable(),
  processed: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

// =============================================================================
// CASHFLOW SUMMARY SCHEMAS
// =============================================================================

export const CashflowSettingsSchema = z.object({
  auto_categorize: z.boolean().optional(),
  show_projections: z.boolean().optional(),
  projection_days: z.number().int().min(30).max(365).optional()
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateBillCreate(data: unknown): any {
  try {
    return BillCreateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}

export function validateBillUpdate(data: unknown): any {
  try {
    return BillUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}

export function validateIncomeCreate(data: unknown): any {
  try {
    return IncomeCreateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}

export function validateIncomeUpdate(data: unknown): any {
  try {
    return IncomeUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}

export function validateEventUpdate(data: unknown): any {
  try {
    return EventUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}

export function validateCashflowSettings(data: unknown): any {
  try {
    return CashflowSettingsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw validationError;
    }
    throw error;
  }
}
