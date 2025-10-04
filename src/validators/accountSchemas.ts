/**
 * Account Validation Schemas
 * Zod schemas for validating account creation and update requests
 */

import { z } from 'zod';

// Account Type enum values
const accountTypeValues = [
  'checking',
  'savings',
  'credit_card',
  'loan',
  'investment',
  'other'
] as const;

// Aggregation Type enum values
const aggregationTypeValues = [
  'cashedge',
  'finicity',
  'manual',
  'plaid',
  'mx'
] as const;

// =============================================================================
// ACCOUNT SCHEMAS
// =============================================================================

export const AccountCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  display_name: z.string().max(255).optional(),
  account_type: z.enum(accountTypeValues).default('checking'),
  aggregation_type: z.enum(aggregationTypeValues).default('manual'),
  balance: z.string().regex(/^-?\d+(\.\d{2})?$/, 'Must be a decimal with 2 places').default('0.00'),
  number: z.string().optional(),
  description: z.string().optional(),
  include_in_networth: z.boolean().default(true),
  include_in_cashflow: z.boolean().default(true),
  include_in_expenses: z.boolean().default(true),
  include_in_budget: z.boolean().default(true),
  include_in_goals: z.boolean().default(true),
  include_in_dashboard: z.boolean().default(true),
  ordering: z.number().int().default(0)
});

export const AccountUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  display_name: z.string().max(255).optional(),
  include_in_networth: z.boolean().optional(),
  include_in_cashflow: z.boolean().optional(),
  include_in_expenses: z.boolean().optional(),
  include_in_budget: z.boolean().optional(),
  include_in_goals: z.boolean().optional(),
  include_in_dashboard: z.boolean().optional(),
  ordering: z.number().int().optional()
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateAccountCreate(data: unknown): any {
  try {
    return AccountCreateSchema.parse(data);
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

export function validateAccountUpdate(data: unknown): any {
  try {
    return AccountUpdateSchema.parse(data);
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
