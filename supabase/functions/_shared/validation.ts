import { z } from 'npm:zod@3';

export const PROPERTY_TYPES = ['Apartment', 'Villa', 'Independent House', 'Plot'] as const;

export const propertyCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  locality: z.string().trim().min(2).max(80),
  price_inr: z.number().positive(),
  price_per_sqft: z.number().positive(),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(20),
  area_sqft: z.number().positive(),
  property_type: z.string().trim().min(2).max(40),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  listed_on: z.string().optional(),
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
