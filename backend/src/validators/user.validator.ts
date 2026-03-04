import { z } from 'zod';

export const registerSchema = z.object({
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

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password cannot exceed 32 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  role: z.enum(['Job Seeker', 'Employer']),
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email').toLowerCase().trim(),

  password: z.string().min(1, 'Password is required'),

  role: z.enum(['Job Seeker', 'Employer']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;