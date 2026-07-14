import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'admin']).default('student'),
  // Treat empty strings as undefined so admin signup doesn't fail enum validation
  department: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.enum(['CS', 'IT', 'EC', 'EE', 'ME', 'CE', 'Other']).optional()
  ),
  year: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional()
  ),
  semester: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1).max(8).optional()
  ),
  rollNumber: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
}).refine((data) => {
  if (data.role === 'student') {
    return !!data.department && !!data.year && !!data.semester && !!data.rollNumber;
  }
  return true;
}, {
  message: "Students must provide department, year, semester, and roll number",
  path: ["department"],
});


export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
