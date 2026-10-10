import { UserRole } from '../../config/constants';

export enum CounsellingFeeStatus {
  NOT_SET = 'NOT_SET',
  NOT_PAID = 'NOT_PAID',
  PAID = 'PAID',
}

export const COUNSELLING_FEE_TYPES = [
  'COUNSELLING_FEE',
  'PROFILE_EVALUATION_FEE',
  'APPLICATION_ASSISTANCE_FEE',
  'OTHER',
] as const;

export type CounsellingFeeType = (typeof COUNSELLING_FEE_TYPES)[number];

export const COUNSELLING_FEE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.COUNSELLOR];

export const COUNSELLING_FEE_DEFAULT_CURRENCY = 'INR';

export const COUNSELLING_FEE_CURRENCIES = ['INR', 'USD', 'AED', 'GBP', 'EUR', 'AUD', 'CAD', 'SGD'] as const;

export const COUNSELLING_FEE_PAYMENT_MODES = [
  'CASH',
  'UPI',
  'NET_BANKING',
  'BANK_TRANSFER',
  'CHEQUE',
  'CARD',
  'OTHER',
] as const;

export const COUNSELLING_FEE_ENTITY_TYPE = 'CounsellingFee';

export const COUNSELLING_FEE_ACTIONS = {
  SET: 'SET_COUNSELLING_FEE',
  PAYMENT_RECORDED: 'RECORD_COUNSELLING_FEE_PAYMENT',
} as const;

export const COUNSELLING_FEE_ACTIVITY_ACTIONS = {
  SET: 'COUNSELLING_FEE_SET',
  PAYMENT_RECORDED: 'COUNSELLING_FEE_PAYMENT_RECORDED',
} as const;