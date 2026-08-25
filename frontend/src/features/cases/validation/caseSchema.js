import * as z from 'zod';

export const caseSchema = z.object({
  srNumber: z.string().min(1, 'SR # is required'),
  dated: z.union([z.date(), z.string()]).nullable().optional(),
  department: z.string().min(1, 'Department is required').default('tax'),
  status: z.string().min(1, 'Status is required').default('active'),
  court: z.string().optional().default(''),
  caseNumber: z.string().optional().default(''),
  judges: z.string().optional().default(''),
  petitioners: z.string().optional().default(''),
  lawyers: z.string().optional().default(''),
  headNote: z.string().optional().default(''),
  references: z.string().optional().default(''),
  principleLaw: z.string().optional().default(''),
  judgment: z.string().optional().default(''),
  publications: z.array(z.object({
    id: z.any().optional(),
    year: z.string().optional().default(''),
    vol: z.string().optional().default(''),
    mag: z.string().optional().default('sld'),
    page: z.string().optional().default(''),
    month: z.string().optional().default('may'),
  })).optional().default([]),
  laws: z.array(z.object({
    id: z.any().optional(),
    lawStatute: z.string().optional().default(''),
    section: z.string().optional().default(''),
  })).optional().default([]),
  attachments: z.array(z.any()).optional().default([]),
});
