/**
 * Alert Validation Schemas
 * Zod schemas for validating all 6 alert types with flexible JSON conditions
 */

import { z } from 'zod';

// =============================================================================
// ENUMS AND BASE TYPES
// =============================================================================

const alertTypeValues = [
  'account_threshold',
  'goal',
  'merchant_name',
  'spending_target',
  'transaction_limit',
  'upcoming_bill'
] as const;

const comparisonOperators = ['less_than', 'greater_than', 'equal_to'] as const;

// =============================================================================
// BASE ALERT SCHEMAS
// =============================================================================

export const AlertBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  email_delivery: z.boolean().default(true),
  sms_delivery: z.boolean().default(false)
});

// =============================================================================
// ACCOUNT THRESHOLD ALERT
// =============================================================================

export const AccountThresholdAlertSchema = AlertBaseSchema.extend({
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  threshold: z.string().regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places'),
  direction: z.enum(['below', 'above'])
});

// =============================================================================
// GOAL ALERT
// =============================================================================

export const GoalAlertSchema = AlertBaseSchema.extend({
  goal_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  milestone_percentage: z.number().int().min(0).max(100)
});

// =============================================================================
// MERCHANT NAME ALERT
// =============================================================================

export const MerchantNameAlertSchema = AlertBaseSchema.extend({
  merchant_pattern: z.string().min(1, 'Merchant pattern is required'),
  match_type: z.enum(['exact', 'contains']).default('contains')
});

// =============================================================================
// SPENDING TARGET ALERT
// =============================================================================

export const SpendingTargetAlertSchema = AlertBaseSchema.extend({
  budget_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  threshold_percentage: z.number().int().min(0).max(200)
});

// =============================================================================
// TRANSACTION LIMIT ALERT
// =============================================================================

export const TransactionLimitAlertSchema = AlertBaseSchema.extend({
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional(),
  amount: z.string().regex(/^\d+(\.\d{2})?$/, 'Must be a decimal with 2 places')
});

// =============================================================================
// UPCOMING BILL ALERT
// =============================================================================

export const UpcomingBillAlertSchema = AlertBaseSchema.extend({
  bill_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  days_before: z.number().int().min(1).max(30)
});

// =============================================================================
// GENERIC ALERT UPDATE SCHEMA
// =============================================================================

export const AlertUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  conditions: z.record(z.any()).optional(),
  email_delivery: z.boolean().optional(),
  sms_delivery: z.boolean().optional(),
  active: z.boolean().optional()
});

// =============================================================================
// ALERT DESTINATION SCHEMA
// =============================================================================

export const AlertDestinationSchema = z.object({
  email: z.string().email('Must be a valid email').optional(),
  sms: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number').optional()
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function createValidationError(zodError: z.ZodError): Error {
  const validationError: any = new Error('Validation failed');
  validationError.name = 'ValidationError';
  validationError.errors = zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  return validationError;
}

export function validateAccountThresholdAlert(data: unknown): z.infer<typeof AccountThresholdAlertSchema> {
  try {
    return AccountThresholdAlertSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }
    throw error;
  }
}

export function validateGoalAlert(data: unknown): z.infer<typeof GoalAlertSchema> {
  try {
    return GoalAlertSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }
    throw error;
  }
}

export function validateMerchantNameAlert(data: unknown): z.infer<typeof MerchantNameAlertSchema> {
  try {
    return MerchantNameAlertSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }
    throw error;
  }
}

export function validateSpendingTargetAlert(data: unknown): z.infer<typeof SpendingTargetAlertSchema> {
  try {
    return SpendingTargetAlertSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }
    throw error;
  }
}

export function validateTransactionLimitAlert(data: unknown): z.infer<typeof TransactionLimitAlertSchema> {
  try {
    return TransactionLimitAlertSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }
    throw error;
  }
}

export function validateUpcomingBillAlert(data: unknown): z.infer<typeof UpcomingBillAlertSchema> {
  try {
    return UpcomingBillAlertSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }
    throw error;
  }
}

export function validateAlertUpdate(data: unknown): z.infer<typeof AlertUpdateSchema> {
  try {
    return AlertUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }
    throw error;
  }
}

export function validateAlertDestination(data: unknown): z.infer<typeof AlertDestinationSchema> {
  try {
    return AlertDestinationSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }
    throw error;
  }
}
