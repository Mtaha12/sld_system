import { z } from 'zod';

export const contactSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
  
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address')
    .max(100, 'Email address is too long'),
  
  subject: z
    .string({ required_error: 'Please select or enter an inquiry topic' })
    .trim()
    .min(3, 'Topic / subject must be at least 3 characters'),
  
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must not exceed 2,000 characters'),
});
