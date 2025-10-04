import { z } from 'zod';

export const AccountCreateSchema = z.object({
  name: z.string().min(1).max(255),
  display_name: z.string().max(255).optional(),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'loan', 'investment', 'mortgage', 'line_of_credit', 'other']),
  aggregation_type: z.enum(['cashedge', 'finicity', 'manual', 'plaid', 'mx']).default('manual'),
  balance: z.string().regex(/^-?\d+(\.\d{2})?$/, 'Balance must be a decimal with 2 places'),
  number: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  include_in_networth: z.boolean().default(true),
  include_in_cashflow: z.boolean().default(false),
  include_in_expenses: z.boolean().default(true),
  include_in_budget: z.boolean().default(true),
  include_in_goals: z.boolean().default(true),
  include_in_dashboard: z.boolean().default(true),
  ordering: z.number().int().default(0)
});

export function validateAccountCreate(data: any) {
  return AccountCreateSchema.parse(data);
}
