import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150, 'Title cannot exceed 150 characters'),
  content: z.string().min(10, 'Post content must be at least 10 characters'),
  tags: z.array(z.string()).optional().default([]),
});

export const createReplySchema = z.object({
  content: z.string().min(2, 'Reply content must be at least 2 characters'),
  parentId: z.string().optional().nullable(),
});
