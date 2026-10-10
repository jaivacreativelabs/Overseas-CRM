import { apiClient } from '../../../services/api-client';
import { Application, ApplicationStatus } from '../../../types';

export interface CreateApplicationPayload {
  universityId: string;
  universityName: string;
  courseId: string;
  courseTitle: string;
  country: string;
  intake: string;
  applicationNumber?: string;
  portalUsername?: string;
  portalPassword?: string;
  notes?: string;
}

export interface UpdateApplicationStatusPayload {
  status: ApplicationStatus;
  rejectionReason?: string;
  decisionDate?: string | Date;
  notes?: string;
}

export const applicationService = {
  async getAllApplications(status?: ApplicationStatus): Promise<Application[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const res = await apiClient.get<Application[]>('/applications', params);
    return res.data || [];
  },

  async getApplicationsForLead(leadId: string): Promise<Application[]> {
    const res = await apiClient.get<Application[]>(`/applications/lead/${leadId}`);
    return res.data || [];
  },

  async getApplicationById(id: string): Promise<Application> {
    const res = await apiClient.get<Application>(`/applications/${id}`);
    return res.data;
  },

  async createApplication(leadId: string, payload: CreateApplicationPayload): Promise<Application> {
    const res = await apiClient.post<Application>(`/applications/lead/${leadId}`, payload);
    return res.data;
  },

  async updateApplicationStatus(id: string, payload: UpdateApplicationStatusPayload): Promise<Application> {
    const res = await apiClient.put<Application>(`/applications/${id}/status`, payload);
    return res.data;
  },
};
