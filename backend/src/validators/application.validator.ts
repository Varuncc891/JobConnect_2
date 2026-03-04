import { z } from 'zod';

export const postApplicationSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(30, 'Name cannot exceed 30 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),

  email: z.string().email('Please provide a valid email').toLowerCase().trim(),

  phone: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .pipe(z.string().regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')),

  address: z.string().min(5, 'Address must be at least 5 characters').max(200),

  coverLetter: z.string().min(10, 'Cover letter must be at least 10 characters').max(2000),

  jobId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid job ID format'),
});

export type PostApplicationInput = z.infer<typeof postApplicationSchema>;