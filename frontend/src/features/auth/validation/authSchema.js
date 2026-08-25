import * as z from 'zod'

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    username: z.string().min(1, 'Username is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    contactNumber: z.string().optional(),
    city: z.string().optional(),
    companyName: z.string().optional(),
    address: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or Username is required')
})
