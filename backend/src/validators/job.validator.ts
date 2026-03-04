import { z } from 'zod';

const salaryField = z
  .union([z.string(), z.number()])
  .transform((val) => (val === '' ? undefined : Number(val)))
  .refine((val) => val === undefined || val > 0, 'Salary must be positive')
  .optional();

const salaryRefinement = (data: any) => {
  const hasFixed = !!data.fixedSalary;
  const hasRange = !!data.salaryFrom && !!data.salaryTo;
  return (hasFixed || hasRange) && !(hasFixed && hasRange);
};

export const postJobSchema = z
  .object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(100),
    description: z.string().min(30, 'Description must be at least 30 characters').max(5000),
    category: z.string().min(2).max(50),
    country: z.string().min(2).max(50),
    city: z.string().min(2).max(50),
    location: z.string().min(10, 'Location must be at least 10 characters').max(200),
    fixedSalary: salaryField,
    salaryFrom: salaryField,
    salaryTo: salaryField,
  })
  .refine(salaryRefinement, {
    message: 'Provide either fixed salary OR salary range (from-to), not both',
    path: ['salary'],
  });

export const updateJobSchema = z
  .object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(30).max(5000).optional(),
    category: z.string().min(2).max(50).optional(),
    country: z.string().min(2).max(50).optional(),
    city: z.string().min(2).max(50).optional(),
    location: z.string().min(10).max(200).optional(),
    fixedSalary: salaryField,
    salaryFrom: salaryField,
    salaryTo: salaryField,
    expired: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const hasFixed = !!data.fixedSalary;
      const hasRange = !!data.salaryFrom && !!data.salaryTo;
      if (!hasFixed && !hasRange && !data.salaryFrom && !data.salaryTo) return true;
      return (hasFixed || hasRange) && !(hasFixed && hasRange);
    },
    {
      message: 'Provide either fixed salary OR salary range (from-to), not both',
      path: ['salary'],
    }
  );

export type PostJobInput = z.infer<typeof postJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;