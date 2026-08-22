import * as z from 'zod'

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z
  .object({
    fullName: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    contactNumber: z.string().optional(),
    city: z.string().optional(),
    companyName: z.string().optional(),
    address: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or Username is required')
})
