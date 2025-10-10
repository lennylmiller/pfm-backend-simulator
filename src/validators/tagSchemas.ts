/**
 * Tag Validation Schemas
 * Zod schemas for tag request validation
 */

import { z } from 'zod';

// =============================================================================
// CREATE TAG SCHEMA
// =============================================================================

export const TagCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(255, 'Tag name must be 255 characters or less'),
  parent_tag_id: z
    .union([z.string(), z.number()])
    .transform((val) => BigInt(val))
    .optional(),
});

// =============================================================================
// UPDATE TAG SCHEMA
// =============================================================================

export const TagUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => BigInt(val)),
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(255, 'Tag name must be 255 characters or less'),
});

// =============================================================================
// BULK OPERATIONS SCHEMA
// =============================================================================

export const BulkTagOperationsSchema = z.object({
  create: z.array(TagCreateSchema).optional(),
  update: z.array(TagUpdateSchema).optional(),
  delete: z.array(z.union([z.string(), z.number()]).transform((val) => BigInt(val))).optional(),
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateTagCreate(data: any): z.infer<typeof TagCreateSchema> {
  const result = TagCreateSchema.safeParse(data);

  if (!result.success) {
    const error: any = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = result.error.format();
    throw error;
  }

  return result.data;
}

export function validateTagUpdate(data: any): z.infer<typeof TagUpdateSchema> {
  const result = TagUpdateSchema.safeParse(data);

  if (!result.success) {
    const error: any = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = result.error.format();
    throw error;
  }

  return result.data;
}

export function validateBulkTagOperations(data: any): z.infer<typeof BulkTagOperationsSchema> {
  const result = BulkTagOperationsSchema.safeParse(data);

  if (!result.success) {
    const error: any = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = result.error.format();
    throw error;
  }

  return result.data;
}
