import * as z from 'zod';

export const notificationBlockSchema = z.object({
  id: z.any().optional(),
  date: z.union([z.date(), z.string()]).nullable().optional(),
  detail: z.string().optional().default(''),
  attachments: z.array(z.any()).optional().default([]),
});

export const notificationSchema = z.object({
  srNumber: z.string().optional().default(''),
  department: z.string().min(1, 'Department is required').default('notifications'),
  subDepartment: z.string().min(1, 'Sub Department is required').default('federal'),
  year: z.string().min(1, 'Year is required'),
  number: z.string().min(1, 'Number is required'),
  sroNumber: z.string().min(1, 'SRO # is required'),
  subject: z.string().optional().default(''),

  lawStatute: z.string().optional().default(''),
  section: z.string().optional().default(''),
  blocks: z.array(notificationBlockSchema).optional().default([]),
});
