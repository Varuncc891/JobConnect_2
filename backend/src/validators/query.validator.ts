import { z } from 'zod';

const toInt = (defaultVal: number) =>
  z
    .string()
    .optional()
    .default(String(defaultVal))
    .transform((val) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? defaultVal : parsed;
    });

export const jobQuerySchema = z.object({
  page: toInt(1).pipe(z.number().min(1, 'Page must be at least 1')),
  limit: toInt(20).pipe(z.number().min(1).max(100, 'Limit cannot exceed 100')),

  category: z.string().optional().transform((val) => val?.trim()),
  city: z.string().optional().transform((val) => val?.trim()),
  country: z.string().optional().transform((val) => val?.trim()),

  minSalary: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) || undefined : undefined))
    .pipe(z.number().positive('Salary must be positive').optional()),

  maxSalary: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) || undefined : undefined))
    .pipe(z.number().positive('Salary must be positive').optional()),

  sortBy: z.enum(['newest', 'oldest', 'salary-high', 'salary-low']).optional().default('newest'),
});

export type JobQueryParams = z.infer<typeof jobQuerySchema>;