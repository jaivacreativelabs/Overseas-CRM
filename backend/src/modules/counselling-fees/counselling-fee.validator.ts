import { z } from 'zod';
import {
  COUNSELLING_FEE_CURRENCIES,
  COUNSELLING_FEE_PAYMENT_MODES,
  COUNSELLING_FEE_TYPES,
} from './counselling-fee.constants';

const objectIdParam = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

export const counsellingFeeLeadParamSchema = z.object({
  params: z.object({
    leadId: objectIdParam,
  }),
});

export const setCounsellingFeeSchema = counsellingFeeLeadParamSchema.extend({
  body: z.object({
    feeType: z.enum(COUNSELLING_FEE_TYPES),
    description: z.string().trim().max(200, 'Description cannot exceed 200 characters').optional(),
    totalFee: z.coerce
      .number({ invalid_type_error: 'Total counselling fee must be a number' })
      .positive('Total counselling fee must be greater than 0'),
    currency: z.enum(COUNSELLING_FEE_CURRENCIES).optional(),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  }).superRefine((data, context) => {
    if (data.feeType === 'OTHER' && !data.description?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'A description is required for Other fee types',
      });
    }
  }),
});

export const recordCounsellingFeePaymentSchema = counsellingFeeLeadParamSchema.extend({
  body: z.object({
    amount: z.coerce
      .number({ invalid_type_error: 'Payment amount must be a number' })
      .positive('Payment amount must be greater than 0'),
    paidOn: z.string().trim().optional(),
    mode: z.enum(COUNSELLING_FEE_PAYMENT_MODES).optional(),
    reference: z.string().trim().max(120, 'Reference cannot exceed 120 characters').optional(),
    note: z.string().trim().max(500, 'Note cannot exceed 500 characters').optional(),
  }),
});

export const counsellingFeeSummariesSchema = z.object({
  query: z.object({
    leadIds: z.string().trim().optional(),
  }),
});