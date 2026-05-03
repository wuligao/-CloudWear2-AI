import OpenAI, { toFile } from 'openai'
import { Logger } from '@nestjs/common'
import type { ImagesResponse } from 'openai/resources/images'
import type { OutfitInput, OutfitPlan } from '../types/outfit'
import { defaultImageModel } from './image-models'
import { buildOutfitUserPrompt, outfitSystemPrompt } from './prompts'
import { buildPhotoStyleGuidePrompt } from './photo-style-guide'
import { outfitPlanJsonSchema, outfitPlanSchema } from './schema'

const userPhotoMaxBytes = 6 * 1024 * 1024
const defaultImageBaseUrl = 'https://api.bltcy.ai/v1'
const defaultImageRequestTimeoutMs = 5 * 60 * 1000
const defaultImageRetryCount = 1
const defaultImageRetryDelayMs = 1500
const aiLogger = new Logger('OutfitOpenAI')

export interface OutfitAiTraceContext {
  index?: number
  source?: 'keyword' | 'photo'
  taskId?: string
  title?: string
  totalCount?: number
}

export interface OutfitAiConfig {
  textApiKey?: string
  textBaseUrl?: string
  textModel?: string
  imageApiKey?: string
  imageBaseUrl?: string
  imageModel?: string
  keywordImageApiKey?: string
  keywordImageBaseUrl?: string
  keywordImageModel?: string
  photoImageApiKey?: string
  photoImageBaseUrl?: string
  photoImageModel?: string
  apiKey?: string
  baseUrl?: string
}

export type StyleProfilePhotoType = 'fullBody' | 'face' | 'makeupFree'

export interface StyleProfileAnalysisInput {
  photoType: StyleProfilePhotoType
  photoDataUrl: string
  currentProfile?: {
    height?: string
    weight?: string
    clothingSize?: string
    shoeSize?: string
    favoriteStyles?: string[]
    favoriteColors?: string[]
    avoidColors?: string[]
    commonOccasions?: string[]
    elementPreferences?: string[]
    fitPreferences?: string[]
    notes?: string
  }
}

export interface StyleProfileAnalysisResult {
  analysisReport: {
    bodyFeature: StyleProfileAnalysisItem
    skinFeature: StyleProfileAnalysisItem
    facialFeature: StyleProfileAnalysisItem
    hairFeature: StyleProfileAnalysisItem
    colorSeason: StyleProfileAnalysisItem
    stylePositioning: StyleProfileAnalysisItem
  }
  recommendedColors: Array<{ label: string; value: string }>
  recommendedStyles: Array<{ label: string; description: string; imageUrl?: string }>
  profileUpdates: {
    favoriteStyles: string[]
    favoriteColors: string[]
    avoidColors: string[]
    elementPreferences: string[]
    fitPreferences: string[]
    notes: string
  }
}

export interface StyleProfileAnalysisItem {
  title: string
  points: string[]
  advice: string
}

export class MissingOpenAIConfigError extends Error {
  constructor(target: '文本' | '图片') {
    super(`缺少 ${target} AI 配置。请在后台 H5 模型配置或 api-server 环境变量中配置后再生成穿搭。`)
    this.name = 'MissingOpenAIConfigError'
  }
}

function createOpenAIClient(target: 'text' | 'keyword-image' | 'photo-image', config: OutfitAiConfig = {}) {
  const apiKey =
    target === 'text'
      ? config.textApiKey || config.apiKey || process.env.OPENAI_TEXT_API_KEY || process.env.OPENAI_API_KEY
      : target === 'photo-image'
        ? config.photoImageApiKey || config.imageApiKey || config.apiKey || process.env.OPENAI_IMAGE_API_KEY || process.env.OPENAI_API_KEY
        : config.keywordImageApiKey || config.imageApiKey || config.apiKey || process.env.OPENAI_IMAGE_API_KEY || process.env.OPENAI_API_KEY
  const baseURL =
    target === 'text'
      ? config.textBaseUrl || config.baseUrl || process.env.OPENAI_TEXT_BASE_URL || process.env.OPENAI_BASE_URL
      : target === 'photo-image'
        ? config.photoImageBaseUrl || config.imageBaseUrl || process.env.OPENAI_IMAGE_BASE_URL || defaultImageBaseUrl
        : config.keywordImageBaseUrl || config.imageBaseUrl || process.env.OPENAI_IMAGE_BASE_URL || defaultImageBaseUrl

  if (!apiKey) {
    throw new MissingOpenAIConfigError(target === 'text' ? '文本' : '图片')
  }

  return new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
    maxRetries: target === 'text' ? undefined : 0,
    timeout: target === 'text' ? undefined : getImageRequestTimeoutMs(),
  })
}

export async function generateOutfitPlan(
  input: OutfitInput,
  config: OutfitAiConfig = {},
  trace: OutfitAiTraceContext = {}
): Promise<OutfitPlan> {
  const startedAt = Date.now()
  const client = createOpenAIClient('text', config)
  const model = config.textModel || process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini'
  aiLogger.log({
    event: 'outfit.ai.plan.request.start',
    model,
    source: input.userPhotoDataUrl ? 'photo' : 'keyword',
    taskId: trace.taskId,
  })
  const response = await client.responses.create({
    model,
    instructions: outfitSystemPrompt,
    input: buildOutfitUserPrompt(input),
    max_output_tokens: 1600,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: 'cloudwear_outfit_plan',
        strict: true,
        schema: outfitPlanJsonSchema,
      },
    },
  })

  const outputText = response.output_text
  if (!outputText) throw new Error('AI 未返回穿搭方案。')

  const plan = outfitPlanSchema.parse(JSON.parse(outputText))
  aiLogger.log({
    elapsedMs: Date.now() - startedAt,
    event: 'outfit.ai.plan.request.complete',
    model,
    taskId: trace.taskId,
    title: plan.outfitTitle,
  })
  return plan
}

export async function analyzeStyleProfilePhoto(
  input: StyleProfileAnalysisInput,
  config: OutfitAiConfig = {}
): Promise<StyleProfileAnalysisResult> {
  const startedAt = Date.now()
  const client = createOpenAIClient('text', config)
  const model = config.textModel || process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini'

  aiLogger.log({
    event: 'outfit.ai.style_profile.analysis.start',
    model,
    photoType: input.photoType,
  })

  const response = await client.responses.create({
    model,
    instructions: styleProfileAnalysisSystemPrompt,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: buildStyleProfileAnalysisPrompt(input),
          },
          {
            type: 'input_image',
            image_url: normalizeUserPhotoDataUrl(input.photoDataUrl),
            detail: 'high',
          },
        ],
      },
    ],
    max_output_tokens: 1800,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: 'cloudwear_style_profile_analysis',
        strict: true,
        schema: styleProfileAnalysisJsonSchema,
      },
    },
  })

  const outputText = response.output_text
  if (!outputText) throw new Error('AI 未返回风格档案分析。')

  const analysis = normalizeStyleProfileAnalysis(JSON.parse(outputText))
  aiLogger.log({
    elapsedMs: Date.now() - startedAt,
    event: 'outfit.ai.style_profile.analysis.complete',
    model,
    photoType: input.photoType,
    recommendedColorCount: analysis.recommendedColors.length,
    recommendedStyleCount: analysis.recommendedStyles.length,
  })
  return analysis
}

export async function generateOutfitImage(
  plan: OutfitPlan,
  userPhotoDataUrl?: string,
  imageModel?: string,
  config: OutfitAiConfig = {},
  trace: OutfitAiTraceContext = {}
): Promise<string> {
  const startedAt = Date.now()
  const target = userPhotoDataUrl ? 'photo-image' : 'keyword-image'
  const client = createOpenAIClient(target, config)
  const configuredModel = userPhotoDataUrl ? config.photoImageModel : config.keywordImageModel
  const model = imageModel || configuredModel || config.imageModel || process.env.OPENAI_IMAGE_MODEL || defaultImageModel
  const imageRequestOptions = getImageRequestOptions(model)
  const traceContext = {
    ...trace,
    source: userPhotoDataUrl ? ('photo' as const) : ('keyword' as const),
  }

  aiLogger.log({
    event: 'outfit.ai.image.request.start',
    index: traceContext.index,
    model,
    source: traceContext.source,
    target,
    taskId: traceContext.taskId,
    title: traceContext.title || plan.outfitTitle,
    totalCount: traceContext.totalCount,
  })

  if (userPhotoDataUrl) {
    const prompt = buildPhotoStyleGuidePrompt(plan)
    const imageUrl = shouldUseResponsesImageGeneration(model)
      ? await generateImageFromPhotoWithResponses(
          client,
          getResponsesImagePrimaryModel(config),
          model,
          prompt,
          userPhotoDataUrl,
          '1024x1536',
          'AI 未返回穿搭指南图。',
          traceContext
        )
      : await generateImageFromPhotoWithImagesEdit(client, model, prompt, userPhotoDataUrl, imageRequestOptions, traceContext)

    aiLogger.log({
      elapsedMs: Date.now() - startedAt,
      event: 'outfit.ai.image.request.complete',
      imageLength: imageUrl.length,
      index: traceContext.index,
      model,
      source: traceContext.source,
      taskId: traceContext.taskId,
    })
    return imageUrl
  }

  const imageUrl = await generateImageFromPrompt(
    client,
    model,
    plan.imagePrompt,
    '1024x1024',
    'AI 未返回穿搭图片。',
    traceContext
  )
  aiLogger.log({
    elapsedMs: Date.now() - startedAt,
    event: 'outfit.ai.image.request.complete',
    imageLength: imageUrl.length,
    index: traceContext.index,
    model,
    source: traceContext.source,
    taskId: traceContext.taskId,
  })
  return imageUrl
}

export async function generateImageFromPrompt(
  client: OpenAI,
  model: string,
  prompt: string,
  size: '1024x1024' | '1024x1536' | '1536x1024',
  emptyMessage: string,
  trace: OutfitAiTraceContext = {}
): Promise<string> {
  if (shouldUseResponsesImageGeneration(model)) {
    return generateImageFromPromptWithResponsesStream(client, model, prompt, size, emptyMessage, trace)
  }

  aiLogger.log({
    event: 'outfit.ai.image.images_api.start',
    model,
    size,
    taskId: trace.taskId,
  })
  const imageResponse = await runImageRequestWithRetry(
    () =>
      client.images.generate({
        model,
        prompt,
        size,
        ...getImageRequestOptions(model),
      }),
    trace
  )

  const imageUrl = readGeneratedImageUrl(imageResponse, emptyMessage)
  aiLogger.log({
    event: 'outfit.ai.image.images_api.complete',
    imageLength: imageUrl.length,
    model,
    size,
    taskId: trace.taskId,
  })
  return imageUrl
}

async function generateImageFromPromptWithResponsesStream(
  client: OpenAI,
  model: string,
  prompt: string,
  size: '1024x1024' | '1024x1536' | '1536x1024',
  emptyMessage: string,
  trace: OutfitAiTraceContext
) {
  aiLogger.log({
    event: 'outfit.ai.image.responses_stream.start',
    model,
    size,
    taskId: trace.taskId,
  })
  const image = await runImageRequestWithRetry(
    async () => {
      const stream = await client.responses.create({
        model,
        input: prompt,
        tools: [
          {
            type: 'image_generation',
            model,
            size,
            output_format: 'png',
          },
        ],
        tool_choice: { type: 'image_generation' },
        store: false,
        stream: true,
      })
      return readResponseGeneratedImageUrlFromStream(stream, trace)
    },
    trace
  )
  if (image) {
    aiLogger.log({
      event: 'outfit.ai.image.responses_stream.complete',
      imageLength: image.length,
      model,
      size,
      taskId: trace.taskId,
    })
    return `data:image/png;base64,${image}`
  }
  throw new Error(emptyMessage)
}

async function generateImageFromPhotoWithResponses(
  client: OpenAI,
  responsesModel: string,
  imageModel: string,
  prompt: string,
  userPhotoDataUrl: string,
  size: '1024x1024' | '1024x1536' | '1536x1024',
  emptyMessage: string,
  trace: OutfitAiTraceContext
) {
  aiLogger.log({
    event: 'outfit.ai.image.responses_edit.start',
    imageModel,
    responsesModel,
    size,
    taskId: trace.taskId,
  })
  const normalizedPhotoDataUrl = normalizeUserPhotoDataUrl(userPhotoDataUrl)
  const image = await runImageRequestWithRetry(async () => {
    const stream = await client.responses.create({
      model: responsesModel,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt,
            },
            {
              type: 'input_image',
              image_url: normalizedPhotoDataUrl,
              detail: 'high',
            },
          ],
        },
      ],
      tools: [
        {
          type: 'image_generation',
          model: imageModel,
          action: 'edit',
          size,
          output_format: 'png',
        },
      ],
      tool_choice: { type: 'image_generation' },
      store: false,
      stream: true,
    })
    return readResponseGeneratedImageUrlFromStream(stream, trace)
  }, trace)

  if (image) {
    aiLogger.log({
      event: 'outfit.ai.image.responses_edit.complete',
      imageLength: image.length,
      imageModel,
      responsesModel,
      size,
      taskId: trace.taskId,
    })
    return `data:image/png;base64,${image}`
  }
  throw new Error(emptyMessage)
}

async function generateImageFromPhotoWithImagesEdit(
  client: OpenAI,
  model: string,
  prompt: string,
  userPhotoDataUrl: string,
  imageRequestOptions: ReturnType<typeof getImageRequestOptions>,
  trace: OutfitAiTraceContext
) {
  aiLogger.log({
    event: 'outfit.ai.image.images_edit.start',
    model,
    size: '1024x1536',
    taskId: trace.taskId,
  })
  const imageFile = await dataUrlToFile(userPhotoDataUrl)
  const imageResponse = await runImageRequestWithRetry(
    () =>
      client.images.edit({
        model,
        image: imageFile,
        prompt,
        size: '1024x1536',
        ...getImageEditRequestOptions(model),
        ...imageRequestOptions,
      }),
    trace
  )

  const imageUrl = readGeneratedImageUrl(imageResponse, 'AI 未返回穿搭指南图。')
  aiLogger.log({
    event: 'outfit.ai.image.images_edit.complete',
    imageLength: imageUrl.length,
    model,
    taskId: trace.taskId,
  })
  return imageUrl
}

function getResponsesImagePrimaryModel(config: OutfitAiConfig) {
  return config.textModel || process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini'
}

const styleProfileAnalysisSystemPrompt = [
  '你是云裳 AI 的专业穿搭风格顾问。',
  '你只根据照片中可见且适合用于穿搭建议的外观信息做分析，例如身形比例、肤色倾向、五官风格、发型发质观感、适配色彩和穿搭风格。',
  '不要推断或编造精确身高、体重、年龄、健康、族裔、身份等敏感或不可可靠判断的信息。',
  '如果照片不适合某项分析，用“待补充照片确认”表达，并给出需要补充的照片类型。',
  '输出必须是中文，语气简洁、具体、可用于穿搭推荐。',
].join('\n')

const styleProfileAnalysisItemJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'points', 'advice'],
  properties: {
    title: { type: 'string' },
    points: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
    advice: { type: 'string' },
  },
} as const

const styleProfileAnalysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['analysisReport', 'recommendedColors', 'recommendedStyles', 'profileUpdates'],
  properties: {
    analysisReport: {
      type: 'object',
      additionalProperties: false,
      required: ['bodyFeature', 'skinFeature', 'facialFeature', 'hairFeature', 'colorSeason', 'stylePositioning'],
      properties: {
        bodyFeature: styleProfileAnalysisItemJsonSchema,
        skinFeature: styleProfileAnalysisItemJsonSchema,
        facialFeature: styleProfileAnalysisItemJsonSchema,
        hairFeature: styleProfileAnalysisItemJsonSchema,
        colorSeason: styleProfileAnalysisItemJsonSchema,
        stylePositioning: styleProfileAnalysisItemJsonSchema,
      },
    },
    recommendedColors: {
      type: 'array',
      minItems: 6,
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
    recommendedStyles: {
      type: 'array',
      minItems: 4,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'description', 'imageUrl'],
        properties: {
          label: { type: 'string' },
          description: { type: 'string' },
          imageUrl: { type: 'string' },
        },
      },
    },
    profileUpdates: {
      type: 'object',
      additionalProperties: false,
      required: ['favoriteStyles', 'favoriteColors', 'avoidColors', 'elementPreferences', 'fitPreferences', 'notes'],
      properties: {
        favoriteStyles: { type: 'array', maxItems: 10, items: { type: 'string' } },
        favoriteColors: { type: 'array', maxItems: 10, items: { type: 'string' } },
        avoidColors: { type: 'array', maxItems: 10, items: { type: 'string' } },
        elementPreferences: { type: 'array', maxItems: 10, items: { type: 'string' } },
        fitPreferences: { type: 'array', maxItems: 10, items: { type: 'string' } },
        notes: { type: 'string' },
      },
    },
  },
} as const

function buildStyleProfileAnalysisPrompt(input: StyleProfileAnalysisInput) {
  const photoTypeLabel: Record<StyleProfilePhotoType, string> = {
    fullBody: '全身照，用于分析身材比例、轮廓和版型建议',
    face: '脸部照，用于分析五官风格、发型观感和整体气质',
    makeupFree: '素颜照，用于分析肤色倾向和色彩适配',
  }

  return [
    `本次照片类型：${photoTypeLabel[input.photoType]}。`,
    '请生成风格档案页面需要的 AI 分析报告，字段要覆盖：身材特征、肤色特征、五官特征、发质特征、个人色彩、风格定位。',
    '推荐色彩请给出 6-10 个适合穿搭的中文色名和 hex 色值。',
    '推荐风格请给出 4-8 个适合用户的风格名称，每个附一句适配说明。imageUrl 如果没有真实图片请返回空字符串。',
    'profileUpdates 用于辅助更新用户偏好，请只写穿搭相关标签，不写精确身高体重。',
    `当前用户已确认档案：${JSON.stringify(input.currentProfile || {})}`,
  ].join('\n')
}

function normalizeStyleProfileAnalysis(value: unknown): StyleProfileAnalysisResult {
  const payload = value && typeof value === 'object' ? (value as Partial<StyleProfileAnalysisResult>) : {}
  return {
    analysisReport: {
      bodyFeature: normalizeStyleProfileAnalysisItem(payload.analysisReport?.bodyFeature),
      skinFeature: normalizeStyleProfileAnalysisItem(payload.analysisReport?.skinFeature),
      facialFeature: normalizeStyleProfileAnalysisItem(payload.analysisReport?.facialFeature),
      hairFeature: normalizeStyleProfileAnalysisItem(payload.analysisReport?.hairFeature),
      colorSeason: normalizeStyleProfileAnalysisItem(payload.analysisReport?.colorSeason),
      stylePositioning: normalizeStyleProfileAnalysisItem(payload.analysisReport?.stylePositioning),
    },
    recommendedColors: normalizeLabelValueList(payload.recommendedColors).slice(0, 10),
    recommendedStyles: normalizeRecommendedStyles(payload.recommendedStyles).slice(0, 8),
    profileUpdates: {
      favoriteStyles: normalizeStringList(payload.profileUpdates?.favoriteStyles).slice(0, 10),
      favoriteColors: normalizeStringList(payload.profileUpdates?.favoriteColors).slice(0, 10),
      avoidColors: normalizeStringList(payload.profileUpdates?.avoidColors).slice(0, 10),
      elementPreferences: normalizeStringList(payload.profileUpdates?.elementPreferences).slice(0, 10),
      fitPreferences: normalizeStringList(payload.profileUpdates?.fitPreferences).slice(0, 10),
      notes: typeof payload.profileUpdates?.notes === 'string' ? payload.profileUpdates.notes.trim().slice(0, 500) : '',
    },
  }
}

function normalizeStyleProfileAnalysisItem(item: unknown): StyleProfileAnalysisItem {
  const value = item && typeof item === 'object' ? (item as Partial<StyleProfileAnalysisItem>) : {}
  return {
    title: typeof value.title === 'string' ? value.title.trim().slice(0, 80) : '待补充照片确认',
    points: normalizeStringList(value.points).slice(0, 4),
    advice: typeof value.advice === 'string' ? value.advice.trim().slice(0, 220) : '',
  }
}

function normalizeLabelValueList(items: unknown) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => (item && typeof item === 'object' ? (item as { label?: unknown; value?: unknown }) : null))
    .filter((item): item is { label?: unknown; value?: unknown } => Boolean(item))
    .map((item) => ({
      label: typeof item.label === 'string' ? item.label.trim().slice(0, 20) : '',
      value: typeof item.value === 'string' ? item.value.trim().slice(0, 40) : '',
    }))
    .filter((item) => item.label && item.value)
}

function normalizeRecommendedStyles(items: unknown) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) =>
      item && typeof item === 'object'
        ? (item as { label?: unknown; description?: unknown; imageUrl?: unknown })
        : null
    )
    .filter((item): item is { label?: unknown; description?: unknown; imageUrl?: unknown } => Boolean(item))
    .map((item) => ({
      label: typeof item.label === 'string' ? item.label.trim().slice(0, 30) : '',
      description: typeof item.description === 'string' ? item.description.trim().slice(0, 100) : '',
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.trim().slice(0, 1000) : '',
    }))
    .filter((item) => item.label)
}

function normalizeStringList(items: unknown) {
  if (!Array.isArray(items)) return []
  return Array.from(
    new Set(
      items
        .map((item) => (typeof item === 'string' ? item.trim().slice(0, 40) : ''))
        .filter(Boolean)
    )
  )
}

function getImageRequestOptions(model: string) {
  if (isGptImageModel(model)) {
    return { output_format: 'png' as const }
  }

  return { response_format: 'b64_json' as const }
}

function getImageEditRequestOptions(model: string) {
  if (supportsHighInputFidelity(model)) {
    return { input_fidelity: 'high' as const }
  }

  return {}
}

function getImageRequestTimeoutMs() {
  const timeoutMs = Number(process.env.OPENAI_IMAGE_TIMEOUT_MS)
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) return timeoutMs

  return defaultImageRequestTimeoutMs
}

function getImageRetryCount() {
  const retryCount = Number(process.env.OPENAI_IMAGE_RETRY_COUNT)
  if (Number.isInteger(retryCount) && retryCount >= 0) return retryCount

  return defaultImageRetryCount
}

async function runImageRequestWithRetry<T>(
  request: () => Promise<T>,
  trace: OutfitAiTraceContext = {}
): Promise<T> {
  const maxAttempts = getImageRetryCount() + 1
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      aiLogger.log({
        attempt,
        event: 'outfit.ai.image.upstream.attempt',
        maxAttempts,
        taskId: trace.taskId,
      })
      return await request()
    } catch (error) {
      lastError = error
      aiLogger.warn({
        attempt,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
        event: 'outfit.ai.image.upstream.attempt_failed',
        maxAttempts,
        retryable: isRetryableImageError(error),
        status: getErrorStatus(error),
        taskId: trace.taskId,
      })
      if (attempt >= maxAttempts || !isRetryableImageError(error)) break
      await sleep(defaultImageRetryDelayMs * attempt)
    }
  }

  throw lastError
}

function isRetryableImageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const status = getErrorStatus(error)
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''
  const cause = error && typeof error === 'object' && 'cause' in error ? (error as { cause?: unknown }).cause : null
  const causeMessage = cause instanceof Error ? cause.message : ''
  const retrySignal = `${message} ${code} ${causeMessage}`

  return (
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    /timeout|timed out|abort|aborted|connection error|fetch failed|socket hang up|terminated|ECONNRESET|UND_ERR_SOCKET|stream_read_error|stream read/i.test(
      retrySignal
    )
  )
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return 0
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : 0
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isGptImageModel(model: string) {
  return model.startsWith('gpt-image') || model === 'chatgpt-image-latest'
}

function shouldUseResponsesImageGeneration(model: string) {
  return model === 'gpt-image-2'
}

function supportsHighInputFidelity(model: string) {
  return model.startsWith('gpt-image-1') || model === 'gpt-image-2'
}

function readGeneratedImageUrl(imageResponse: ImagesResponse, emptyMessage: string) {
  const image = imageResponse.data?.[0]
  if (image?.b64_json) {
    if (image.b64_json.startsWith('data:image/')) return image.b64_json
    return `data:image/png;base64,${image.b64_json}`
  }
  if (image?.url) return image.url
  throw new Error(emptyMessage)
}

async function readResponseGeneratedImageUrlFromStream(stream: AsyncIterable<unknown>, trace: OutfitAiTraceContext = {}) {
  let image = ''
  let eventCount = 0

  try {
    for await (const event of stream) {
      eventCount += 1
      const nextImage = getResponseImageResultFromStreamEvent(event)
      aiLogger.log({
        event: 'outfit.ai.image.responses_stream.event',
        eventCount,
        eventType: getResponseStreamEventType(event),
        hasImage: Boolean(nextImage),
        taskId: trace.taskId,
      })
      if (nextImage) image = nextImage
    }
  } catch (error) {
    aiLogger.warn({
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      event: 'outfit.ai.image.responses_stream.read_failed',
      eventCount,
      hasImage: Boolean(image),
      taskId: trace.taskId,
    })
    if (image) return image
    throw error
  }

  aiLogger.log({
    event: 'outfit.ai.image.responses_stream.closed',
    eventCount,
    hasImage: Boolean(image),
    taskId: trace.taskId,
  })
  return image
}

function getResponseStreamEventType(event: unknown) {
  if (!event || typeof event !== 'object') return typeof event
  const eventType = (event as { type?: unknown }).type
  if (typeof eventType === 'string') return eventType
  return 'unknown'
}

function getResponseImageResultFromStreamEvent(event: unknown) {
  if (!event || typeof event !== 'object') return ''

  const directResult = (event as { result?: unknown }).result
  if (typeof directResult === 'string') return directResult

  const partialImage = (event as { partial_image_b64?: unknown }).partial_image_b64
  if (typeof partialImage === 'string') return partialImage

  const item = (event as { item?: unknown }).item
  if (item && typeof item === 'object') {
    const result = (item as { type?: unknown; result?: unknown }).result
    if ((item as { type?: unknown }).type === 'image_generation_call' && typeof result === 'string') {
      return result
    }
  }

  const outputItem = (event as { output_item?: unknown }).output_item
  if (outputItem && typeof outputItem === 'object') {
    const result = (outputItem as { type?: unknown; result?: unknown }).result
    if ((outputItem as { type?: unknown }).type === 'image_generation_call' && typeof result === 'string') {
      return result
    }
  }

  const response = (event as { response?: unknown }).response
  if (response && typeof response === 'object') {
    const output = (response as { output?: unknown }).output
    if (Array.isArray(output)) {
      const image = output.find((outputItem) => outputItem?.type === 'image_generation_call' && outputItem.result)
      if (typeof image?.result === 'string') return image.result
    }
  }

  return ''
}

async function dataUrlToFile(dataUrl: string) {
  const { buffer, extension, mimeType } = parseUserPhotoDataUrl(dataUrl)

  return toFile(buffer, `user-photo.${extension}`, { type: mimeType })
}

function normalizeUserPhotoDataUrl(dataUrl: string) {
  const { base64, mimeType } = parseUserPhotoDataUrl(dataUrl)

  return `data:${mimeType};base64,${base64}`
}

function parseUserPhotoDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/)
  if (!match) throw new Error('上传照片格式不正确。')

  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1]
  const extension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1]
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.byteLength > userPhotoMaxBytes) {
    throw new Error('上传照片不能超过 6MB。')
  }

  return {
    base64: match[2],
    buffer,
    extension,
    mimeType,
  }
}
