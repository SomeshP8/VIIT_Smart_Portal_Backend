import { z } from 'zod';

export const createClubSchema = z.object({
  name: z.string().min(3, 'Club name must be at least 3 characters'),
  description: z.string().min(10, 'Club description must be at least 10 characters'),
});

export const createEventSchema = z.object({
  title: z.string().min(5, 'Event title must be at least 5 characters'),
  description: z.string().min(10, 'Event description must be at least 10 characters'),
  date: z.string().min(1, 'Event date and time are required'),
  venue: z.string().min(2, 'Event venue is required'),
  clubId: z.string().min(1, 'Host club ID is required'),
  capacity: z.string().or(z.number()).transform((val) => {
    const num = Number(val);
    if (isNaN(num)) return 100; // default fallback
    return num;
  }),
});
