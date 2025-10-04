/**
 * Transaction Validation Schemas
 * Zod schemas for validating transaction creation and update requests
 */

import { z } from 'zod';

// Transaction Type enum values
const transactionTypeValues = ['debit', 'credit'] as const;

// =============================================================================
// TRANSACTION SCHEMAS
// =============================================================================

export const TransactionCreateSchema = z.object({
  account_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  amount: z.string().regex(/^-?\d+(\.\d{2})?$/, 'Must be a decimal with 2 places'),
  transaction_type: z.enum(transactionTypeValues).optional(),
  posted_at: z.string().datetime('Must be a valid ISO 8601 datetime'),
  transacted_at: z.string().datetime('Must be a valid ISO 8601 datetime').optional(),
  description: z.string().optional(),
  original_description: z.string().optional(),
  nickname: z.string().optional(),
  merchant_name: z.string().optional(),
  primary_tag_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional(),
  check_number: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const TransactionUpdateSchema = z.object({
  nickname: z.string().optional(),
  primary_tag_id: z.union([z.string(), z.number()]).transform(val => BigInt(val)).optional().nullable(),
  metadata: z.record(z.any()).optional()
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateTransactionCreate(data: unknown): any {
  try {
    return TransactionCreateSchema.parse(data);
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

export function validateTransactionUpdate(data: unknown): any {
  try {
    return TransactionUpdateSchema.parse(data);
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
