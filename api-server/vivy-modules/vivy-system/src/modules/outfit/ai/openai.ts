import OpenAI, { toFile } from 'openai'
import type { ImagesResponse } from 'openai/resources/images'
import type { OutfitInput, OutfitPlan } from '../types/outfit'
import { defaultImageModel } from './image-models'
import { buildOutfitUserPrompt, outfitSystemPrompt } from './prompts'
import { buildPhotoStyleGuidePrompt } from './photo-style-guide'
import { outfitPlanJsonSchema, outfitPlanSchema } from './schema'

const userPhotoMaxBytes = 6 * 1024 * 1024
const defaultImageBaseUrl = 'https://api.bltcy.ai/v1'

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
  })
}

export async function generateOutfitPlan(
  input: OutfitInput,
  config: OutfitAiConfig = {}
): Promise<OutfitPlan> {
  const client = createOpenAIClient('text', config)
  const response = await client.responses.create({
    model: config.textModel || process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini',
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

  return outfitPlanSchema.parse(JSON.parse(outputText))
}

export async function generateOutfitImage(
  plan: OutfitPlan,
  userPhotoDataUrl?: string,
  imageModel?: string,
  config: OutfitAiConfig = {}
): Promise<string> {
  const target = userPhotoDataUrl ? 'photo-image' : 'keyword-image'
  const client = createOpenAIClient(target, config)
  const configuredModel = userPhotoDataUrl ? config.photoImageModel : config.keywordImageModel
  const model = imageModel || configuredModel || config.imageModel || process.env.OPENAI_IMAGE_MODEL || defaultImageModel
  const imageRequestOptions = getImageRequestOptions(model)

  if (userPhotoDataUrl) {
    const imageFile = await dataUrlToFile(userPhotoDataUrl)
    const imageResponse = await client.images.edit({
      model,
      image: imageFile,
      prompt: buildPhotoStyleGuidePrompt(plan),
      size: '1024x1536',
      ...getImageEditRequestOptions(model),
      ...imageRequestOptions,
    })

    return readGeneratedImageUrl(imageResponse, 'AI 未返回穿搭指南图。')
  }

  const imageResponse = await client.images.generate({
    model,
    prompt: plan.imagePrompt,
    size: '1024x1024',
    ...imageRequestOptions,
  })

  return readGeneratedImageUrl(imageResponse, 'AI 未返回穿搭图片。')
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

function isGptImageModel(model: string) {
  return model.startsWith('gpt-image') || model === 'chatgpt-image-latest'
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

async function dataUrlToFile(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/)
  if (!match) throw new Error('上传照片格式不正确。')

  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1]
  const extension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1]
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.byteLength > userPhotoMaxBytes) {
    throw new Error('上传照片不能超过 6MB。')
  }

  return toFile(buffer, `user-photo.${extension}`, { type: mimeType })
}
