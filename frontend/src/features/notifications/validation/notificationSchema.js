import * as z from 'zod';

export const notificationBlockSchema = z.object({
  id: z.any().optional(),
  date: z.union([z.date(), z.string()]).nullable().optional(),
  detail: z.string().optional().default(''),
  attachments: z.array(z.any()).optional().default([]),
});

export const notificationSchema = z.object({
  srNumber: z.string().optional().default(''),
  department: z.string().trim().min(1, 'Department is required').default('notification'),
  subDepartment: z.string().trim().min(1, 'Sub Department is required').default('federal'),
  year: z.coerce.string().trim().min(1, 'Year is required'),
  number: z.coerce.string().trim().min(1, 'Number is required'),
  sroNumber: z.string().trim().min(1, 'SRO # is required'),
  subject: z.string().optional().default(''),
  lawStatute: z.string().optional().default(''),
  section: z.string().optional().default(''),
  laws: z.array(z.object({
    lawStatute: z.string().optional().default(''),
    section: z.string().optional().default(''),
  })).optional().default([]),
  blocks: z.array(notificationBlockSchema).optional().default([]),
});
