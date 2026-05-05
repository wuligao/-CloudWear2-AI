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

const optionalLongText = (max = 260) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

const stylePhotoTypeSchema = z.enum(['fullBody', 'face', 'makeupFree'])

const stylePhotoSchema = z.object({
  url: z.string().trim().max(1000),
  updatedAt: z.string().trim().max(80).optional(),
})

const styleAnalysisItemSchema = z.object({
  title: optionalLongText(80),
  points: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
  advice: optionalLongText(220),
})

const styleAnalysisReportSchema = z
  .object({
    bodyFeature: styleAnalysisItemSchema.optional(),
    skinFeature: styleAnalysisItemSchema.optional(),
    facialFeature: styleAnalysisItemSchema.optional(),
    hairFeature: styleAnalysisItemSchema.optional(),
    colorSeason: styleAnalysisItemSchema.optional(),
    stylePositioning: styleAnalysisItemSchema.optional(),
  })
  .optional()

const recommendedColorSchema = z.object({
  label: z.string().trim().min(1).max(20),
  value: z.string().trim().min(1).max(40),
})

const recommendedStyleSchema = z.object({
  label: z.string().trim().min(1).max(30),
  description: z.string().trim().max(100).optional(),
  imageUrl: z.string().trim().max(1000).optional(),
})

const feedbackGenerationItemSchema = z.object({
  category: optionalText(80),
  name: optionalText(120),
})

export const h5StyleProfileFeedbackSchema = z.object({
  feedback: z.string().trim().min(1).max(40),
  generation: z.object({
    outfitTitle: optionalLongText(160),
    summary: optionalLongText(500),
    style: optionalText(160),
    colorPreference: optionalText(80),
    occasion: optionalText(120),
    styleTags: textListSchema,
    items: z.array(feedbackGenerationItemSchema).max(12).optional().default([]),
    photoMode: z
      .object({
        id: optionalText(80),
        label: optionalText(80),
        prompt: optionalLongText(200),
      })
      .optional(),
    recommendationContext: z
      .object({
        title: optionalText(120),
        sourceLabel: optionalText(120),
      })
      .optional(),
  }),
})

export type H5StyleProfileFeedbackDto = z.infer<typeof h5StyleProfileFeedbackSchema>

export const h5StyleProfileQuerySchema = h5ProfileOverviewQuerySchema

export const h5StyleProfileSchema = z.object({
  genderPreference: optionalText(40),
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
  basePhotos: z
    .object({
      fullBody: stylePhotoSchema.optional(),
      face: stylePhotoSchema.optional(),
      makeupFree: stylePhotoSchema.optional(),
    })
    .optional(),
  analysisReport: styleAnalysisReportSchema,
  recommendedColors: z.array(recommendedColorSchema).max(12).optional(),
  recommendedStyles: z.array(recommendedStyleSchema).max(10).optional(),
  analysisUpdatedAt: z.string().trim().max(80).optional(),
})

export type H5StyleProfileDto = z.infer<typeof h5StyleProfileSchema>

export const h5StyleProfilePhotoAnalysisSchema = z.object({
  photoType: stylePhotoTypeSchema,
  photoDataUrl: z
    .string()
    .trim()
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/, '照片格式不支持。')
    .max(8_500_000, '上传照片不能超过 6MB。'),
})

export type H5StyleProfilePhotoAnalysisDto = z.infer<typeof h5StyleProfilePhotoAnalysisSchema>

export class AdminH5StyleProfileQueryDto {
  /** 绑定用户ID */
  @Allow()
  userId?: string

  /** 用户或风格关键词 */
  @Allow()
  keyword?: string
}
