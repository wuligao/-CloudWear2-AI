import { z } from 'zod'

export const h5ChatCreateSessionSchema = z.object({
  title: z.string().trim().max(80).optional(),
})

export const h5ChatSendMessageSchema = z.object({
  content: z.string().trim().min(1).max(500),
})

export type H5ChatCreateSessionDto = z.infer<typeof h5ChatCreateSessionSchema>
export type H5ChatSendMessageDto = z.infer<typeof h5ChatSendMessageSchema>
