import { randomUUID } from 'crypto'
import { InjectRedis } from '@nestjs-modules/ioredis'
import { HttpException, HttpStatus, Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@vivy-common/config'
import Redis from 'ioredis'
import { Subject } from 'rxjs'
import { AiModelService } from '../ai-model/ai-model.service'
import { buildFastOutfitPlan } from './ai/fast-outfit-plan'
import { generateOutfitImage, generateOutfitPlan, MissingOpenAIConfigError, OutfitAiConfig } from './ai/openai'
import { generateOutfitVariantResults } from './outfit-generation-runner'
import { persistOutfitImage } from './outfit-image-storage'
import { OutfitRecordsService } from './outfit-records.service'
import type { GenerateOutfitTaskSnapshot, OutfitGeneration, OutfitInput, OutfitPlan } from './types/outfit'

const taskTtlMs = 60 * 60 * 1000
const defaultOutfitVariantCount = 1
const maxOutfitVariantCount = 4
interface DailyQuotaReservation {
  imageCount: number
  key: string
}

const variantDirections = [
  {
    title: '通勤简约风',
    tag: '通勤风',
    prompt: 'clean office-ready styling, refined minimal layers, practical tote bag, calm confident posture',
  },
  {
    title: '休闲松弛风',
    tag: '休闲风',
    prompt: 'relaxed weekend styling, soft casual pieces, comfortable shoes, natural daylight lifestyle mood',
  },
  {
    title: '约会精致风',
    tag: '约会风',
    prompt: 'polished date outfit, elegant silhouette, romantic but wearable details, warm editorial lighting',
  },
  {
    title: '轻潮街拍风',
    tag: '街拍风',
    prompt: 'modern street style, sharper accessories, confident full-body fashion editorial composition',
  },
]

@Injectable()
export class OutfitGenerationTasksService implements OnModuleDestroy {
  private readonly logger = new Logger(OutfitGenerationTasksService.name)
  private readonly tasks = new Map<string, GenerateOutfitTaskSnapshot>()
  private readonly streams = new Map<string, Subject<GenerateOutfitTaskSnapshot>>()
  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly config: ConfigService,
    private readonly aiModelService: AiModelService,
    private readonly outfitRecordsService: OutfitRecordsService,
    @InjectRedis()
    private readonly redis: Redis
  ) {}

  async create(input: OutfitInput, userId: number) {
    if (!userId) {
      throw new HttpException('请先登录后再生成穿搭方案。', HttpStatus.UNAUTHORIZED)
    }
    const imageCount = normalizeVariantCount(input.generationCount)
    this.logger.log({
      event: 'outfit.task.create.start',
      imageCount,
      imageModel: input.imageModel,
      source: input.userPhotoDataUrl ? 'photo' : 'keyword',
      userId,
    })
    const quotaReservation = await this.consumeDailyGenerationQuota(imageCount, userId)

    const now = new Date().toISOString()
    const task: GenerateOutfitTaskSnapshot = {
      taskId: randomUUID(),
      status: 'queued',
      progress: 5,
      message: '任务已创建，等待生成。',
      createdAt: now,
      updatedAt: now,
    }

    this.tasks.set(task.taskId, task)
    this.logger.log({
      event: 'outfit.task.create.queued',
      imageCount,
      taskId: task.taskId,
      userId,
    })
    void this.run(task.taskId, input, quotaReservation, userId)

    return task
  }

  get(taskId: string) {
    return this.tasks.get(taskId) ?? null
  }

  stream(taskId: string) {
    let stream = this.streams.get(taskId)
    if (!stream || stream.closed) {
      stream = new Subject<GenerateOutfitTaskSnapshot>()
      this.streams.set(taskId, stream)
    }

    return stream.asObservable()
  }

  onModuleDestroy() {
    this.cleanupTimers.forEach((timer) => clearTimeout(timer))
    this.cleanupTimers.clear()
    this.streams.forEach((stream) => stream.complete())
    this.streams.clear()
  }

  private async run(taskId: string, input: OutfitInput, quotaReservation: DailyQuotaReservation, userId: number) {
    const startedAt = Date.now()
    try {
      this.logger.log({
        event: 'outfit.task.run.start',
        imageModel: input.imageModel,
        source: input.userPhotoDataUrl ? 'photo' : 'keyword',
        taskId,
        userId,
      })
      this.update(taskId, {
        status: 'running',
        progress: 18,
        message: input.userPhotoDataUrl ? '正在分析照片和穿搭偏好。' : '正在生成穿搭方案。',
      })

      const aiConfig = await this.getAiConfig(input)
      this.logger.log({
        event: 'outfit.task.ai_config.loaded',
        keywordImageModel: aiConfig.keywordImageModel,
        photoImageModel: aiConfig.photoImageModel,
        selectedImageModel: input.imageModel,
        taskId,
        textModel: aiConfig.textModel,
      })
      const plan = input.userPhotoDataUrl
        ? await generateOutfitPlan(input, aiConfig, { source: 'photo', taskId })
        : buildFastOutfitPlan(input)
      this.logger.log({
        event: 'outfit.task.plan.ready',
        planSource: input.userPhotoDataUrl ? 'ai' : 'fast',
        taskId,
        title: plan.outfitTitle,
      })

      this.update(taskId, {
        status: 'running',
        progress: 44,
        message: '正在拆解场景和风格，生成多套方案。',
      })

      const variants = buildOutfitVariants(plan, input)
      const { userPhotoDataUrl, ...safeInput } = input
      const now = new Date().toISOString()
      this.logger.log({
        event: 'outfit.task.variants.ready',
        taskId,
        totalCount: variants.length,
      })

      this.update(taskId, {
        status: 'running',
        progress: 48,
        message: `正在生成 ${variants.length} 套穿搭图片。`,
      })

      const results = await generateOutfitVariantResults({
        aiConfig,
        input,
        now,
        safeInput,
        taskId,
        variants,
        imageGenerator: generateOutfitImage,
        onVariantStart: ({ index, title, totalCount }) => {
          this.logger.log({
            event: 'outfit.task.variant.image.start',
            index,
            taskId,
            title,
            totalCount,
          })
        },
        onVariantComplete: ({ imageLength, index, title, totalCount }) => {
          this.logger.log({
            event: 'outfit.task.variant.image.complete',
            imageLength,
            index,
            taskId,
            title,
            totalCount,
          })
        },
        onProgress: ({ message, progress }) => {
          this.logger.log({
            event: 'outfit.task.progress',
            message,
            progress,
            taskId,
          })
          this.update(taskId, {
            status: 'running',
            progress,
            message,
          })
        },
      })

      if (userPhotoDataUrl) {
        this.logger.log({
          event: 'outfit.task.user_photo.persist.start',
          taskId,
        })
        const userPhotoUrl = await persistOutfitImage(userPhotoDataUrl, this.config)
        results.forEach((result) => {
          result.userPhotoUrl = userPhotoUrl
        })
        this.logger.log({
          event: 'outfit.task.user_photo.persist.complete',
          taskId,
        })
      }
      const generationDurationMs = Date.now() - startedAt
      results.forEach((result) => {
        result.generationDurationMs = generationDurationMs
      })
      this.logger.log({
        event: 'outfit.task.records.persist.start',
        elapsedMs: generationDurationMs,
        resultCount: results.length,
        taskId,
        userId,
      })
      const savedResults = await this.persistGeneratedRecords(results, userId)
      this.logger.log({
        event: 'outfit.task.records.persist.complete',
        savedCount: savedResults.length,
        taskId,
        userId,
      })

      this.update(taskId, {
        status: 'succeeded',
        progress: 100,
        message: `已生成 ${savedResults.length} 套穿搭方案，并已保存到衣橱。`,
        result: savedResults[0],
        results: savedResults,
      })
      this.logger.log({
        elapsedMs: Date.now() - startedAt,
        event: 'outfit.task.run.succeeded',
        savedCount: savedResults.length,
        taskId,
        userId,
      })
      this.scheduleCleanup(taskId)
    } catch (error) {
      this.logger.warn({
        elapsedMs: Date.now() - startedAt,
        event: 'outfit.task.run.failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
        taskId,
      })
      await this.refundDailyGenerationQuota(quotaReservation)
      this.update(taskId, {
        status: 'failed',
        progress: 100,
        message: '生成失败。',
        error: this.getGenerationErrorMessage(error),
      })
      this.scheduleCleanup(taskId)
    }
  }

  private async persistGeneratedRecords(results: OutfitGeneration[] = [], userId: number): Promise<OutfitGeneration[]> {
    const savedResults: OutfitGeneration[] = []
    for (const [index, generation] of results.entries()) {
      this.logger.log({
        event: 'outfit.task.record.persist.start',
        generationId: generation.id,
        index: index + 1,
        taskId: generation.taskId,
        userId,
      })
      savedResults.push(
        await this.outfitRecordsService.create(
          {
            source: generation.source || (generation.userPhotoUsed ? 'photo' : 'keyword'),
            generation,
          },
          userId
        )
      )
      this.logger.log({
        event: 'outfit.task.record.persist.complete',
        generationId: generation.id,
        index: index + 1,
        recordId: savedResults[savedResults.length - 1]?.id,
        taskId: generation.taskId,
        userId,
      })
    }

    return savedResults
  }

  private update(taskId: string, patch: Partial<Omit<GenerateOutfitTaskSnapshot, 'taskId' | 'createdAt'>>) {
    const current = this.tasks.get(taskId)
    if (!current) {
      this.logger.warn({
        event: 'outfit.task.update.missing_task',
        taskId,
      })
      return
    }

    const next: GenerateOutfitTaskSnapshot = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    }

    this.tasks.set(taskId, next)
    this.streams.get(taskId)?.next(next)
    this.logger.log({
      event: 'outfit.task.update',
      progress: next.progress,
      status: next.status,
      taskId,
    })

    if (next.status === 'succeeded' || next.status === 'failed') {
      this.streams.get(taskId)?.complete()
    }
  }

  private getGenerationErrorMessage(error: unknown) {
    if (error instanceof MissingOpenAIConfigError) return error.message

    const message = error instanceof Error ? error.message : '生成失败，请稍后再试。'
    if (/rate limit|429/i.test(message)) return '图片模型当前限流，请稍后再试。'
    if (/upstream request failed|model_not_found|no available channel|503|502/i.test(message)) {
      return '当前生图模型通道不可用，请在后台切换到支持照片换搭的图片模型或服务商。'
    }
    if (/timeout|timed out|abort|aborted|connection error|fetch failed|socket hang up|terminated|ECONNRESET|UND_ERR_SOCKET/i.test(message)) {
      return '图片服务连接失败或响应超时，请稍后重试或在后台切换可用的生图模型。'
    }

    return message
  }

  private async getAiConfig(input: OutfitInput): Promise<OutfitAiConfig> {
    return {
      ...this.config.get<OutfitAiConfig>('outfitAi', {}),
      ...(await this.aiModelService.getH5RuntimeConfig(input.imageModel, Boolean(input.userPhotoDataUrl))),
    }
  }

  private async consumeDailyGenerationQuota(imageCount: number, userId: number): Promise<DailyQuotaReservation> {
    const dailyLimit = await this.aiModelService.getH5DailyFreeGenerationLimit()
    if (dailyLimit <= 0) {
      throw new HttpException('今日免费生成图片数已用完，请明天再试。', HttpStatus.TOO_MANY_REQUESTS)
    }
    if (imageCount > dailyLimit) {
      throw new HttpException(`每天最多免费生成 ${dailyLimit} 张图片，请减少生成张数。`, HttpStatus.TOO_MANY_REQUESTS)
    }

    const key = this.getDailyQuotaKey(userId)
    const usedCount = await this.redis.incrby(key, imageCount)
    if (usedCount === imageCount) {
      await this.redis.expire(key, secondsUntilTomorrow())
    }

    if (usedCount > dailyLimit) {
      await this.redis.decrby(key, imageCount)
      throw new HttpException('今日剩余免费生成图片数不足，请减少生成张数或明天再试。', HttpStatus.TOO_MANY_REQUESTS)
    }

    return { imageCount, key }
  }

  private async refundDailyGenerationQuota(reservation: DailyQuotaReservation) {
    await this.redis.decrby(reservation.key, reservation.imageCount)
  }

  private getDailyQuotaKey(userId: number) {
    return `cloudwear:h5:generation-quota:${getTodayKey()}:user:${userId}`
  }

  private scheduleCleanup(taskId: string) {
    const currentTimer = this.cleanupTimers.get(taskId)
    if (currentTimer) clearTimeout(currentTimer)

    const timer = setTimeout(() => {
      const task = this.tasks.get(taskId)
      if (!task) return

      const age = Date.now() - new Date(task.updatedAt).getTime()
      if (age >= taskTtlMs) {
        this.tasks.delete(taskId)
        this.streams.get(taskId)?.complete()
        this.streams.delete(taskId)
        this.cleanupTimers.delete(taskId)
      }
    }, taskTtlMs)

    this.cleanupTimers.set(taskId, timer)
  }
}

function buildOutfitVariants(plan: OutfitPlan, input: OutfitInput): OutfitPlan[] {
  const variantCount = normalizeVariantCount(input.generationCount)
  const selectedPhrases = splitPhrases(`${input.occasion} ${input.style}`).slice(0, variantCount)
  return variantDirections.slice(0, variantCount).map((direction, index) => {
    const userPhrase = selectedPhrases[index]
    const tag = userPhrase || direction.tag
    const title = userPhrase ? `${userPhrase}穿搭方案` : `${direction.title}方案`
    return {
      ...plan,
      outfitTitle: title,
      summary: `${plan.summary} 这套偏向${tag}，适合在${input.occasion}中展示更明确的风格辨识度。`,
      styleTags: Array.from(new Set([tag, direction.tag, ...plan.styleTags])).slice(0, 6),
      imagePrompt: [
        plan.imagePrompt,
        `Variant ${index + 1}: ${direction.prompt}.`,
        `Make this image clearly different from other variants while staying faithful to: ${input.style}, ${input.occasion}.`,
      ].join(' '),
    }
  })
}

function normalizeVariantCount(value?: number) {
  if (!Number.isFinite(value)) return defaultOutfitVariantCount
  return Math.min(maxOutfitVariantCount, Math.max(1, Math.round(Number(value))))
}

function splitPhrases(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[，,、\s]+/)
        .map((phrase) => phrase.trim())
        .filter(Boolean)
    )
  )
}

function getTodayKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function secondsUntilTomorrow() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setHours(24, 0, 0, 0)
  return Math.max(60, Math.ceil((tomorrow.getTime() - now.getTime()) / 1000))
}
