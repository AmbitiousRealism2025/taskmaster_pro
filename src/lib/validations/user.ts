import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  hashedPassword: z.string().optional()
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional()
})

export type CreateUser = z.infer<typeof createUserSchema>
export type UpdateUser = z.infer<typeof updateUserSchema>