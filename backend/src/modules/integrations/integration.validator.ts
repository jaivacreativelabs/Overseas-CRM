import { z } from 'zod';

const objectId = z.string().min(1, 'A valid ID is required');

export const connectProviderSchema = z.object({
  params: z.object({
    providerId: z.string().min(1),
  }),
  body: z.object({
    credentials: z.record(z.string(), z.any()).optional(),
    settings: z.record(z.string(), z.any()).optional(),
  }),
});

export const providerIdSchema = z.object({
  params: z.object({
    providerId: z.string().min(1),
  }),
});

export const saveMetaFormMappingSchema = z.object({
  body: z.object({
    formId: z.string().trim().min(1, 'Form ID is required'),
    formName: z.string().trim().min(1, 'Form name is required'),
    campaignId: z.string().optional(),
    campaignName: z.string().trim().optional(),
    branchId: objectId,
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const simulateMetaLeadSchema = z.object({
  body: z.object({
    formId: z.string().optional(),
    formName: z.string().optional(),
    campaignName: z.string().optional(),
    name: z.string().trim().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().trim().min(6, 'Valid phone is required'),
    preferredCountry: z.string().optional(),
    targetCourse: z.string().optional(),
  }),
});

export const createWorkflowSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Workflow name is required'),
    description: z.string().optional(),
    trigger: z.enum([
      'lead.created',
      'student.created',
      'counselling.scheduled',
      'counselling.approaching',
      'profile.verified',
      'shortlist.updated',
      'document.requested',
      'document.uploaded',
      'document.reviewed',
      'application.submitted',
      'application.rejected',
      'offer.received',
      'offer.issued',
      'offer.signed_uploaded',
      'offer.accepted',
      'offer.rejected',
      'payment.requested',
      'payment.proof_uploaded',
      'payment.success',
      'visa.updated',
      'travel.updated',
      'departure.recorded',
      'arrival.confirmed',
      'orientation.invited',
      'branch.created',
    ]),
    actions: z
      .array(
        z.object({
          actionType: z.enum(['SEND_EMAIL', 'SEND_WHATSAPP', 'SEND_SMS', 'CREATE_TASK', 'UPDATE_CRM_FIELD', 'OUTGOING_WEBHOOK']),
          providerId: z.string().optional(),
          config: z.record(z.string(), z.any()).optional(),
        })
      )
      .min(1, 'At least one action is required'),
    conditions: z
      .array(
        z.object({
          field: z.string(),
          operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than']),
          value: z.string(),
        })
      )
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const objectIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const importCSVSchema = z.object({
  body: z.object({
    csvText: z.string().min(1, 'CSV text is required'),
  }),
});

export const generateAIDraftSchema = z.object({
  body: z.object({
    purpose: z.string().optional(),
    studentName: z.string().optional(),
    customPrompt: z.string().optional(),
    studentId: z.string().optional(),
  }),
});