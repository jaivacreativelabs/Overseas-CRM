import React from 'react';
import { Badge } from '../../../components/Badge';
import { CounsellingFeeStatus } from '../../../types';
import { COUNSELLING_FEE_STATUS_META } from '../constants';

export const CounsellingFeeStatusPill: React.FC<{ status: CounsellingFeeStatus }> = ({ status }) => {
  const meta = COUNSELLING_FEE_STATUS_META[status] || COUNSELLING_FEE_STATUS_META[CounsellingFeeStatus.NOT_SET];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
};