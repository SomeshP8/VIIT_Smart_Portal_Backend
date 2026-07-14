import { z } from 'zod';

export const createComplaintSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['Hostel', 'Classroom', 'Transport', 'Other']),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'resolved']),
  remarks: z.string().min(2, 'Remarks are required when updating status'),
});
