import { apiClient } from '../../../services/api-client';
import { CounsellingFeeDetail, CounsellingFeeSummary, CounsellingFeeType } from '../../../types';

export interface SetCounsellingFeePayload {
  feeType: CounsellingFeeType;
  description?: string;
  totalFee: number;
  currency?: string;
  notes?: string;
}

export interface RecordCounsellingFeePaymentPayload {
  amount: number;
  paidOn?: string;
  mode?: string;
  reference?: string;
  note?: string;
}

export const counsellingFeeService = {
  async getSummaries(leadIds: string[]): Promise<CounsellingFeeSummary[]> {
    if (!leadIds || leadIds.length === 0) return [];
    const res = await apiClient.get<CounsellingFeeSummary[]>('/counselling-fees/summaries', {
      leadIds: leadIds.join(','),
    });
    return res.data || [];
  },

  async getByLeadId(leadId: string): Promise<CounsellingFeeDetail> {
    const res = await apiClient.get<CounsellingFeeDetail>(`/counselling-fees/lead/${leadId}`);
    return res.data;
  },

  async setFee(leadId: string, payload: SetCounsellingFeePayload): Promise<CounsellingFeeDetail> {
    const res = await apiClient.put<CounsellingFeeDetail>(`/counselling-fees/lead/${leadId}`, payload);
    return res.data;
  },

  async recordPayment(
    leadId: string,
    payload: RecordCounsellingFeePaymentPayload
  ): Promise<CounsellingFeeDetail> {
    const res = await apiClient.post<CounsellingFeeDetail>(`/counselling-fees/lead/${leadId}/payments`, payload);
    return res.data;
  },
};