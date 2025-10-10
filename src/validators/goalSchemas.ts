/**
 * Goal Validation Schemas
 * Zod schemas for validating payoff and savings goal requests
 */

import { z } from 'zod';

// =============================================================================
// PAYOFF GOAL SCHEMAS
// =============================================================================

export const PayoffGoalCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  current_value: z.string().regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places'),
  account_id: z.union([z.string(), z.number()]).transform((val) => BigInt(val)),
  target_completion_on: z.string().optional(),
  monthly_contribution: z
    .string()
    .regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places')
    .optional(),
  image_name: z.string().optional(),
  image_url: z.string().url('Must be a valid URL').optional(),
});

export const PayoffGoalUpdateSchema = PayoffGoalCreateSchema.partial();

// =============================================================================
// SAVINGS GOAL SCHEMAS
// =============================================================================

export const SavingsGoalCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  target_value: z.string().regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places'),
  current_value: z
    .string()
    .regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places')
    .optional(),
  account_id: z
    .union([z.string(), z.number()])
    .transform((val) => BigInt(val))
    .optional(),
  target_completion_on: z.string().optional(),
  monthly_contribution: z
    .string()
    .regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places')
    .optional(),
  image_name: z.string().optional(),
  image_url: z.string().url('Must be a valid URL').optional(),
});

export const SavingsGoalUpdateSchema = SavingsGoalCreateSchema.partial();

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validatePayoffGoal(data: unknown, options: { partial?: boolean } = {}): any {
  const schema = options.partial ? PayoffGoalUpdateSchema : PayoffGoalCreateSchema;

  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw validationError;
    }
    throw error;
  }
}

export function validateSavingsGoal(data: unknown, options: { partial?: boolean } = {}): any {
  const schema = options.partial ? SavingsGoalUpdateSchema : SavingsGoalCreateSchema;

  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: any = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw validationError;
    }
    throw error;
  }
}
