import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subject: z.string().min(2, 'Subject is required'),
  department: z.enum(['CS', 'IT', 'EC', 'EE', 'ME', 'CE', 'Other']),
  year: z.string().or(z.number()).transform((val) => Number(val)),
  semester: z.string().or(z.number()).transform((val) => Number(val)),
});
