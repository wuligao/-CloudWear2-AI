import { z } from 'zod'

export const outfitInputSchema = z.object({
  season: z.string().trim().min(1).max(10),
  temperature: z.coerce.number().int().min(-30).max(50),
  weather: z.string().trim().min(1).max(20),
  location: z.string().trim().min(1).max(80),
  occasion: z.string().trim().min(1).max(40),
  style: z.string().trim().min(1).max(80),
  colorPreference: z.string().trim().max(40).optional(),
  genderPreference: z.string().trim().max(40).optional(),
  imageModel: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional(),
  generationCount: z.coerce.number().int().min(1).max(4).optional(),
  userPhotoDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/)
    .max(9_000_000)
    .optional(),
})

export const outfitItemSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  material: z.string().min(1),
  reason: z.string().min(1),
})

export const outfitPlanSchema = z.object({
  outfitTitle: z.string().min(1),
  summary: z.string().min(1),
  styleTags: z.array(z.string().min(1)).min(1).max(6),
  temperatureAdvice: z.string().min(1),
  occasionReason: z.string().min(1),
  items: z.array(outfitItemSchema).min(3).max(8),
  imagePrompt: z.string().min(40).max(2000),
})

export const outfitPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'outfitTitle',
    'summary',
    'styleTags',
    'temperatureAdvice',
    'occasionReason',
    'items',
    'imagePrompt',
  ],
  properties: {
    outfitTitle: { type: 'string' },
    summary: { type: 'string' },
    styleTags: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: { type: 'string' },
    },
    temperatureAdvice: { type: 'string' },
    occasionReason: { type: 'string' },
    items: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'name', 'color', 'material', 'reason'],
        properties: {
          category: { type: 'string' },
          name: { type: 'string' },
          color: { type: 'string' },
          material: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
    imagePrompt: { type: 'string' },
  },
} as const
