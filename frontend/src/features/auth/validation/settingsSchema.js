import * as z from 'zod';

export const profileSettingsSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string().min(1, 'Username is required'),
  contactNumber: z.string().optional().default(''),
  city: z.string().optional().default('Karachi'),
  companyName: z.string().optional().default(''),
  address: z.string().optional().default(''),
});

export const addEmailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});
