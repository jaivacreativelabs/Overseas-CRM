import { z } from 'zod';
import { LeadSource, LeadStatus, StudentStage } from '../../config/constants';

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(6, 'Valid phone number is required'),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    targetCountry: z.string().optional(),
    targetCourse: z.string().optional(),
    targetIntake: z.string().optional(),
    budget: z.string().optional(),
    source: z.nativeEnum(LeadSource).optional(),
    counsellorId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateLeadSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    passportNumber: z.string().optional(),
    targetCountry: z.string().optional(),
    targetCourse: z.string().optional(),
    targetIntake: z.string().optional(),
    budget: z.string().optional(),
    source: z.nativeEnum(LeadSource).optional(),
    counsellorId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const recordContactAttemptSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    method: z.enum(['PHONE', 'WHATSAPP', 'EMAIL', 'IN_PERSON']),
    outcome: z.enum(['CONNECTED', 'NO_ANSWER', 'BUSY', 'SWITCHED_OFF', 'CALLBACK_REQUESTED', 'INVALID_NUMBER', 'WRONG_NUMBER']),
    notes: z.string().optional(),
    callbackDate: z.string().optional(),
    callbackTime: z.string().optional(),
  }),
});

export const scheduleCounsellingSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    scheduledDate: z.string().min(1, 'Date is required'),
    scheduledTime: z.string().min(1, 'Time is required'),
    googleMeetLink: z.string().optional(),
    notes: z.string().optional(),
    counsellorId: z.string().optional(),
  }),
});

export const updateCounsellingAttendanceSchema = z.object({
  params: z.object({
    id: z.string(),
    sessionId: z.string(),
  }),
  body: z.object({
    attendance: z.enum(['ATTENDED', 'ABSENT']),
    status: z.enum(['COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED']).optional(),
    discussionSummary: z.string().optional(),
    recommendedCountries: z.array(z.string()).optional(),
    nextSteps: z.string().optional(),
  }),
});

export const convertInterestedSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const closeLostSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    reason: z.string().min(3, 'Closed lost reason is required'),
  }),
});
