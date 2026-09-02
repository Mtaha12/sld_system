import * as z from 'zod';

export const notificationBlockSchema = z.object({
  id: z.any().optional(),
  date: z.union([z.date(), z.string()]).nullable().optional(),
  detail: z.string().optional().default(''),
  attachments: z.array(z.any()).optional().default([]),
});

const validDepartments = ['circular', 'corporate', 'general order', 'judge order', 'letter', 'notification', 'other'];
const validSubDepartments = ['federal', 'provincial'];

export const notificationSchema = z.object({
  srNumber: z.string().optional().default(''),
  department: z.enum(validDepartments).default('notification'),
  subDepartment: z.enum(validSubDepartments).default('federal'),
  year: z.string().min(1, 'Year is required'),
  number: z.string().min(1, 'Number is required'),
  sroNumber: z.string().min(1, 'SRO # is required'),
  subject: z.string().optional().default(''),

  lawStatute: z.string().optional().default(''),
  section: z.string().optional().default(''),
  blocks: z.array(notificationBlockSchema).optional().default([]),
});
