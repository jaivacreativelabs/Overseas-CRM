import { apiClient } from '../../../services/api-client';
import { Offer, OfferStatus } from '../../../types';

export interface CreateOfferPayload {
  applicationId: string;
  offerType: 'CONDITIONAL' | 'UNCONDITIONAL';
  conditions?: string;
  tuitionFee: number;
  depositAmount: number;
  currency?: string;
  deadlineDate?: string;
  originalOfferUrl?: string;
  originalOfferFileName?: string;
}

export interface ReviewOfferPayload {
  status: OfferStatus.ACCEPTED | OfferStatus.REJECTED;
  notes?: string;
  reviewNotes?: string;
  rejectionReason?: string;
}

export const offerService = {
  async getAllOffers(status?: OfferStatus): Promise<Offer[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const res = await apiClient.get<Offer[]>('/offers', params);
    return res.data || [];
  },

  async getOffersForLead(leadId: string): Promise<Offer[]> {
    const res = await apiClient.get<Offer[]>(`/offers/lead/${leadId}`);
    return res.data || [];
  },

  async uploadOriginalOffer(leadId: string, data: CreateOfferPayload | FormData): Promise<Offer> {
    const res = await apiClient.post<Offer>(`/offers/lead/${leadId}/original`, data);
    return res.data;
  },

  async uploadSignedOffer(offerId: string, data: { signedOfferUrl?: string; signedOfferFileName?: string } | FormData): Promise<Offer> {
    const res = await apiClient.post<Offer>(`/offers/${offerId}/signed`, data);
    return res.data;
  },

  async reviewSignedOffer(offerId: string, payload: ReviewOfferPayload): Promise<Offer> {
    const res = await apiClient.put<Offer>(`/offers/${offerId}/review`, payload);
    return res.data;
  },
};
