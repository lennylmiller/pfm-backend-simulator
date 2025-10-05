import { z } from 'zod';

export const TransactionCreateSchema = z.object({
  account_id: z.union([z.string(), z.number()]),
  amount: z.string().regex(/^-?\d+(\.\d{2})?$/, 'Amount must be a decimal with 2 places'),
  posted_at: z.string().datetime(),
  transacted_at: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
  merchant_name: z.string().max(255).optional(),
  nickname: z.string().max(255).optional(),
  primary_tag_id: z.union([z.string(), z.number()]).optional(),
});

export function validateTransactionCreate(data: any) {
  return TransactionCreateSchema.parse(data);
}
