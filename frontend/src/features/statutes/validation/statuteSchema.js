import * as z from 'zod';

export const statuteBlockSchema = z.object({
  id: z.any().optional(),
  sectionHeading: z.string().optional().default(''),
  fromDate: z.union([z.date(), z.string()]).nullable().optional(),
  toDate: z.union([z.date(), z.string()]).nullable().optional(),
  detail: z.string().optional().default(''),
  attachments: z.array(z.any()).optional().default([]),
});

export const statuteSchema = z.object({
  srNumber: z.string().optional().default(''),
  department: z.string().optional().default('tax'),
  chapter: z.string().optional().default(''),


  law: z.string().optional().default(''),
  section: z.string().optional().default(''),
  heading: z.string().optional().default(''),
  blocks: z.array(statuteBlockSchema).optional().default([]),
});
