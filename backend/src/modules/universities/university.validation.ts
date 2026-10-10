import { z } from 'zod';

export const createUniversitySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'University name is required'),
    country: z.string().min(1, 'Country is required'),
    state: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    website: z.string().optional(),
    ranking: z.number().optional().nullable(),
    customComment: z.string().max(60, 'Custom comment cannot exceed 60 characters').optional(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    description: z.string().optional(),
    galleryPhotos: z.array(z.string()).optional(),
    overview: z.string().optional(),
    campusFacilities: z.array(z.string()).optional(),
    establishedYear: z.number().optional().nullable(),
    acceptanceRate: z.string().optional(),
    averageTuitionFee: z.string().optional(),
    scholarshipInfo: z.string().optional(),
    accommodationInfo: z.string().optional(),
    generalRequirements: z.string().optional(),
  }),
});

export const updateUniversitySchema = z.object({
  params: z.object({
    id: z.string().optional(),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    website: z.string().optional(),
    ranking: z.number().optional().nullable(),
    customComment: z.string().max(60, 'Custom comment cannot exceed 60 characters').optional(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    description: z.string().optional(),
    galleryPhotos: z.array(z.string()).optional(),
    overview: z.string().optional(),
    campusFacilities: z.array(z.string()).optional(),
    establishedYear: z.number().optional().nullable(),
    acceptanceRate: z.string().optional(),
    averageTuitionFee: z.string().optional(),
    scholarshipInfo: z.string().optional(),
    accommodationInfo: z.string().optional(),
    generalRequirements: z.string().optional(),
  }),
});
