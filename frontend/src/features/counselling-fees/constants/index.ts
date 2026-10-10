import { CounsellingFeeStatus, CounsellingFeeType } from '../../../types';

export const COUNSELLING_FEE_CURRENCIES = ['INR', 'USD', 'AED', 'GBP', 'EUR', 'AUD', 'CAD', 'SGD'];

export const COUNSELLING_FEE_PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'NET_BANKING', label: 'Net Banking' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

export const COUNSELLING_FEE_TYPES = [
  { value: CounsellingFeeType.COUNSELLING_FEE, label: 'Counselling Fee' },
  { value: CounsellingFeeType.PROFILE_EVALUATION_FEE, label: 'Profile Evaluation Fee' },
  { value: CounsellingFeeType.APPLICATION_ASSISTANCE_FEE, label: 'Application Assistance Fee' },
  { value: CounsellingFeeType.OTHER, label: 'Other' },
];

export const COUNSELLING_FEE_STATUS_META: Record<
  CounsellingFeeStatus,
  { label: string; variant: 'neutral' | 'success' | 'danger' }
> = {
  [CounsellingFeeStatus.NOT_SET]: { label: 'Not Set', variant: 'neutral' },
  [CounsellingFeeStatus.NOT_PAID]: { label: 'Not Paid', variant: 'danger' },
  [CounsellingFeeStatus.PAID]: { label: 'Paid', variant: 'success' },
};

export const EMPTY_COUNSELLING_FEE_SUMMARY = {
  leadId: '',
  isSet: false,
  currency: 'INR',
  totalFee: 0,
  amountPaid: 0,
  outstanding: 0,
  status: CounsellingFeeStatus.NOT_SET,
  paymentCount: 0,
};

export const formatCurrency = (amount: number, currency?: string): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  return currency ? `${currency} ${formatted}` : formatted;
};

export const formatDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};