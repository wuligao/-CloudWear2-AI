import { z } from 'zod'
import { PaginateDto } from '@vivy-common/core'
import { Allow } from 'class-validator'
import { outfitPhotoModeContextSchema, outfitRecommendationContextSchema, outfitStyleProfileContextSchema } from '../ai/schema'

const outfitItemSchema = z.object({
  category: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  color: z.string().trim().min(1).max(80),
  material: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(500),
})

export const outfitRecordSourceSchema = z.enum(['keyword', 'photo']).optional()

export const createOutfitRecordSchema = z.object({
  source: outfitRecordSourceSchema,
  generation: z.object({
    id: z.string().trim().min(1).max(100),
    taskId: z.string().trim().min(1).max(100).optional(),
    source: z.enum(['keyword', 'photo']).optional(),
    recordStatus: z.enum(['running', 'succeeded', 'failed']).optional(),
    totalCount: z.coerce.number().int().min(1).max(12).optional(),
    successCount: z.coerce.number().int().min(0).max(12).optional(),
    failedCount: z.coerce.number().int().min(0).max(12).optional(),
    generationDurationMs: z.coerce.number().int().min(0).max(30 * 60 * 1000).optional(),
    season: z.string().trim().min(1).max(20),
    temperature: z.coerce.number().int().min(-30).max(50),
    weather: z.string().trim().min(1).max(40),
    location: z.string().trim().min(1).max(120),
    occasion: z.string().trim().min(1).max(120),
    style: z.string().trim().min(1).max(160),
    colorPreference: z.string().trim().max(80).optional(),
    genderPreference: z.string().trim().max(80).optional(),
    imageModel: z.string().trim().max(120).optional(),
    recommendationContext: outfitRecommendationContextSchema.optional(),
    photoMode: outfitPhotoModeContextSchema.optional(),
    styleProfileContext: outfitStyleProfileContextSchema.optional(),
    outfitTitle: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(1000),
    styleTags: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
    temperatureAdvice: z.string().trim().min(1).max(1000),
    occasionReason: z.string().trim().min(1).max(1000),
    items: z.array(outfitItemSchema).min(1).max(12),
    imagePrompt: z.string().trim().min(1).max(3000),
    imageUrl: z
      .string()
      .trim()
      .min(1)
      .max(15_000_000)
      .refine(
        (value) =>
          /^data:image\/(png|jpeg|jpg|webp);base64,/.test(value) ||
          /^https?:\/\//.test(value) ||
          value.startsWith('/uploads/') ||
          value.startsWith('uploads/'),
        '图片地址必须是图片 DataURL、HTTP URL 或本地上传路径。'
      ),
    userPhotoUsed: z.boolean().optional(),
    userPhotoDataUrl: z
      .string()
      .trim()
      .max(15_000_000)
      .refine(
        (value) => !value || /^data:image\/(png|jpeg|jpg|webp);base64,/.test(value),
        '用户上传原图必须是图片 DataURL。'
      )
      .optional(),
    userPhotoUrl: z
      .string()
      .trim()
      .max(1000)
      .refine(
        (value) => !value || /^https?:\/\//.test(value) || value.startsWith('/uploads/') || value.startsWith('uploads/'),
        '用户上传原图地址必须是 HTTP URL 或本地上传路径。'
      )
      .optional(),
    createdAt: z.string().trim().min(1).max(80),
  }),
})

export const outfitRecordListQuerySchema = z.object({
  keyword: z.string().trim().max(100).optional(),
  status: z.enum(['all', 'running', 'succeeded', 'failed']).optional(),
})

export const outfitRecordOwnerSchema = z.object({})

export type CreateOutfitRecordDto = z.infer<typeof createOutfitRecordSchema>
export type OutfitRecordListQueryDto = z.infer<typeof outfitRecordListQuerySchema>
export type OutfitRecordOwnerDto = z.infer<typeof outfitRecordOwnerSchema>

export class AdminOutfitRecordListQueryDto extends PaginateDto {
  /** 生成来源 keyword/photo */
  @Allow()
  source?: 'all' | 'keyword' | 'photo'

  /** 记录状态 running/succeeded/failed */
  @Allow()
  status?: 'all' | 'running' | 'succeeded' | 'failed'

  /** 是否使用用户照片 */
  @Allow()
  userPhotoUsed?: string

  /** 关键词 */
  @Allow()
  keyword?: string

  /** 创建时间范围 */
  @Allow()
  createTime?: string[]
}
