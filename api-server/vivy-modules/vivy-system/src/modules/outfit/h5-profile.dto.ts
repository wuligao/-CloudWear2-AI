import { z } from 'zod'
import { Allow } from 'class-validator'

export const h5ProfileOverviewQuerySchema = z.object({})

export type H5ProfileOverviewQueryDto = z.infer<typeof h5ProfileOverviewQuerySchema>

const optionalText = (max = 80) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

const textListSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(16)
  .optional()
  .transform((items) => Array.from(new Set(items || [])))

export const h5StyleProfileQuerySchema = h5ProfileOverviewQuerySchema

export const h5StyleProfileSchema = z.object({
  height: optionalText(40),
  weight: optionalText(40),
  clothingSize: optionalText(40),
  shoeSize: optionalText(40),
  favoriteStyles: textListSchema,
  favoriteColors: textListSchema,
  avoidColors: textListSchema,
  commonOccasions: textListSchema,
  elementPreferences: textListSchema,
  fitPreferences: textListSchema,
  bodyMetrics: z
    .object({
      shoulder: optionalText(40),
      bust: optionalText(40),
      waist: optionalText(40),
      hip: optionalText(40),
      thigh: optionalText(40),
      calf: optionalText(40),
    })
    .optional(),
  notes: optionalText(500),
})

export type H5StyleProfileDto = z.infer<typeof h5StyleProfileSchema>

export class AdminH5StyleProfileQueryDto {
  /** 绑定用户ID */
  @Allow()
  userId?: string

  /** 用户或风格关键词 */
  @Allow()
  keyword?: string
}
