import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  body: z.string().min(5, 'Announcement body must be at least 5 characters'),
  targetDepartments: z.array(z.string()).optional().default(['All']),
  targetYears: z.array(z.coerce.number()).optional().default([0]),
  isPinned: z.coerce.boolean().optional().default(false),
});
