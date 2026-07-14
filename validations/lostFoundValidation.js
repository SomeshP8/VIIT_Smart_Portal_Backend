import { z } from 'zod';

export const createLostItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  location: z.string().min(2, 'Location is required'),
  date: z.string().optional().or(z.date().optional()),
  type: z.enum(['lost', 'found']),
});

export const claimItemSchema = z.object({
  message: z.string().min(10, 'Please explain in detail why this item is yours (at least 10 characters)'),
});

export const updateClaimStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});
