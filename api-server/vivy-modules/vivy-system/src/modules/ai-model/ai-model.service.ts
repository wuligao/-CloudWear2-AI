import OpenAI from 'openai'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ConfigService } from '@vivy-common/config'
import { BaseIsEnum, BaseStatusEnum, ServiceException } from '@vivy-common/core'
import { Repository } from 'typeorm'
import { generateImageFromPrompt } from '../outfit/ai/openai'
import { persistOutfitImage } from '../outfit/outfit-image-storage'
import {
  CreateAiModelItemDto,
  CreateAiModelProviderDto,
  TestConnectionDto,
  TestModelDto,
  UpdateAiAppModelConfigDto,
  UpdateAiModelItemDto,
  UpdateAiModelProviderDto,
} from './dto/ai-model.dto'
import { AiAppModelConfig } from './entities/ai-app-model-config.entity'
import { AiModelItem } from './entities/ai-model-item.entity'
import { AiModelProvider } from './entities/ai-model-provider.entity'
import {
  defaultH5OutfitOptions,
  H5LoginHeroImageConfig,
  H5LoginPoemConfig,
  H5OutfitOptionConfig,
  mergeH5OutfitOptions,
  normalizeDailyFreeGenerationLimit,
} from './h5-outfit-options'
import {
  buildH5HomeLookBriefs,
  buildH5HomeLookImagePrompt,
  type H5HomeLookBrief,
} from './h5-home-refresh'

export interface AiModelProviderVo
  extends Omit<AiModelProvider, 'apiKey' | 'models'> {
  apiKeyMasked?: string
  hasApiKey: boolean
  models: AiModelItem[]
}

export interface H5RuntimeModelConfig {
  textApiKey?: string
  textBaseUrl?: string
  textModel?: string
  keywordImageApiKey?: string
  keywordImageBaseUrl?: string
  keywordImageModel?: string
  photoImageApiKey?: string
  photoImageBaseUrl?: string
  photoImageModel?: string
}

export interface H5AppModelConfigVo
  extends Omit<AiAppModelConfig, 'optionConfig'> {
  options: H5OutfitOptionConfig
}

const h5OutfitAppCode = 'h5_outfit'
const h5OutfitAppName = 'H5穿搭生成'
const h5HomeRefreshIntervalMs = 1000 * 60 * 30
const h5HomeRefreshRunningMessage = '首页图文与图片正在生成，完成后会自动更新，请稍后刷新查看。'
const h5LoginRefreshRunningMessage = '登录页封面图与底部文案正在生成，完成后会自动更新，请稍后刷新查看。'

interface GeneratedH5HomeContent {
  kicker?: string
  titleLine1?: string
  titleLine2?: string
  subtitle?: string
  primaryAction?: string
  secondaryAction?: string
  lensText?: string
  backgroundAlt?: string
  homeCategories?: string[]
  inspirationKeywords?: string[]
  homeLooks?: unknown
  imagePrompt?: string
  backgroundImage?: string
}

interface GeneratedH5LoginHeroBrief {
  alt?: string
  imagePrompt?: string
}

interface GeneratedH5LoginContent {
  heroImages?: GeneratedH5LoginHeroBrief[]
  poems?: H5LoginPoemConfig[]
}

@Injectable()
export class AiModelService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiModelService.name)
  private homeRefreshTimer?: NodeJS.Timeout
  private homeRefreshRunning = false
  private loginRefreshRunning = false

  constructor(
    @InjectRepository(AiModelProvider)
    private readonly providerRepository: Repository<AiModelProvider>,
    @InjectRepository(AiModelItem)
    private readonly modelRepository: Repository<AiModelItem>,
    @InjectRepository(AiAppModelConfig)
    private readonly appConfigRepository: Repository<AiAppModelConfig>,
    private readonly configService: ConfigService
  ) {}

  onModuleInit() {
    this.homeRefreshTimer = setInterval(() => {
      void this.refreshH5ScheduledContentIfNeeded('interval').catch((error) => {
        this.logger.warn({
          event: 'h5.daily_refresh.interval_failed',
          error: this.toSafeErrorMessage(error),
        })
      })
    }, h5HomeRefreshIntervalMs)
    this.homeRefreshTimer.unref?.()
  }

  onModuleDestroy() {
    if (this.homeRefreshTimer) clearInterval(this.homeRefreshTimer)
  }

  async listProviders(): Promise<AiModelProviderVo[]> {
    const providers = await this.providerRepository
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.models', 'models')
      .addSelect('provider.apiKey')
      .orderBy('provider.providerId', 'ASC')
      .addOrderBy('models.modelPk', 'ASC')
      .getMany()

    return providers.map((provider) => this.toProviderVo(provider))
  }

  async infoProvider(providerId: number): Promise<AiModelProviderVo> {
    return this.toProviderVo(await this.getProviderWithSecret(providerId))
  }

  async addProvider(provider: CreateAiModelProviderDto): Promise<void> {
    const providerCode = provider.providerCode || this.slugify(provider.providerName)
    const exists = await this.providerRepository.findOneBy({ providerCode })
    if (exists) throw new ServiceException('服务商编码已存在')

    const created = this.providerRepository.create({
      ...provider,
      providerCode,
      color: provider.color || 'slate',
      status: provider.status ?? BaseStatusEnum.NORMAL,
    })
    await this.providerRepository.insert(created)
  }

  async updateProvider(providerId: number, provider: UpdateAiModelProviderDto): Promise<void> {
    const current = await this.getProviderWithSecret(providerId)
    const nextApiKey =
      provider.apiKey && !this.isMaskedApiKey(provider.apiKey) ? provider.apiKey : current.apiKey

    await this.providerRepository.update(providerId, {
      ...provider,
      apiKey: nextApiKey,
    })
  }

  async deleteProvider(providerId: number): Promise<void> {
    await this.providerRepository.delete(providerId)
  }

  async addModel(providerId: number, model: CreateAiModelItemDto): Promise<void> {
    await this.ensureProvider(providerId)
    const exists = await this.modelRepository.findOneBy({ providerId, modelId: model.modelId })
    if (exists) throw new ServiceException('模型ID已存在')

    if (model.isDefault === BaseIsEnum.YES) {
      await this.clearDefaultModel(providerId)
      await this.providerRepository.update(providerId, { defaultModelId: model.modelId })
    }
    await this.modelRepository.insert({
      ...model,
      providerId,
      status: model.status ?? BaseStatusEnum.NORMAL,
      isDefault: model.isDefault ?? BaseIsEnum.NO,
    })
  }

  async updateModel(providerId: number, modelPk: number, model: UpdateAiModelItemDto): Promise<void> {
    const current = await this.modelRepository.findOneBy({ providerId, modelPk })
    if (!current) throw new ServiceException('模型不存在')

    if (model.modelId && model.modelId !== current.modelId) {
      const exists = await this.modelRepository.findOneBy({ providerId, modelId: model.modelId })
      if (exists) throw new ServiceException('模型ID已存在')
    }

    if (model.isDefault === BaseIsEnum.YES) {
      await this.clearDefaultModel(providerId)
      await this.providerRepository.update(providerId, { defaultModelId: model.modelId || current.modelId })
    }
    await this.modelRepository.update({ providerId, modelPk }, model)
  }

  async deleteModel(providerId: number, modelPk: number): Promise<void> {
    const model = await this.modelRepository.findOneBy({ providerId, modelPk })
    if (!model) throw new ServiceException('模型不存在')

    await this.modelRepository.delete({ providerId, modelPk })
    if (model.isDefault === BaseIsEnum.YES) {
      const nextModel = await this.modelRepository.findOne({
        where: { providerId, status: BaseStatusEnum.NORMAL },
        order: { modelPk: 'ASC' },
      })
      if (nextModel) {
        await this.modelRepository.update(
          { providerId, modelPk: nextModel.modelPk },
          { isDefault: BaseIsEnum.YES }
        )
      }
      await this.providerRepository.update(providerId, { defaultModelId: nextModel?.modelId || '' })
    }
  }

  async setDefaultModel(providerId: number, modelPk: number): Promise<void> {
    const model = await this.modelRepository.findOneBy({ providerId, modelPk })
    if (!model) throw new ServiceException('模型不存在')

    await this.clearDefaultModel(providerId)
    await this.modelRepository.update({ providerId, modelPk }, { isDefault: BaseIsEnum.YES })
    await this.providerRepository.update(providerId, { defaultModelId: model.modelId })
  }

  async testConnection(providerId: number, dto: TestConnectionDto = {}) {
    const provider = await this.getProviderWithSecret(providerId)
    const client = this.createClient(provider, dto)
    const startedAt = Date.now()
    try {
      const models = await client.models.list()

      return {
        success: true,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        modelCount: models.data?.length ?? 0,
        message: `成功连接到 ${provider.providerName} API`,
      }
    } catch (error) {
      throw new ServiceException(`连接测试失败：${this.toSafeErrorMessage(error)}`)
    }
  }

  async testModel(dto: TestModelDto) {
    const provider = await this.getProviderWithSecret(Number(dto.providerId))
    const modelId = dto.modelId || provider.defaultModelId
    if (!modelId) throw new ServiceException('请先配置默认模型')

    const client = this.createClient(provider)
    const startedAt = Date.now()

    if (dto.testType === 'embedding') {
      const response = await client.embeddings.create({
        model: modelId,
        input: dto.prompt,
      })
      const embedding = response.data?.[0]?.embedding ?? []
      return {
        success: true,
        latencyMs: Date.now() - startedAt,
        tokenUsage: response.usage?.total_tokens ?? 0,
        output: `[${embedding.slice(0, 5).map((value) => Number(value).toFixed(3)).join(', ')}, ...] 向量维度：${embedding.length}`,
      }
    }

    if (dto.testType === 'image') {
      const imageUrl = await generateImageFromPrompt(client, modelId, dto.prompt, '1024x1024', '模型未返回图片')

      return {
        success: true,
        latencyMs: Date.now() - startedAt,
        tokenUsage: 0,
        imageUrl,
        output: '图片生成成功',
      }
    }

    const response = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: dto.prompt }],
      temperature: 0.7,
    })

    return {
      success: true,
      latencyMs: Date.now() - startedAt,
      tokenUsage: response.usage?.total_tokens ?? 0,
      output: response.choices?.[0]?.message?.content || '模型未返回内容',
    }
  }

  async infoH5Config(): Promise<H5AppModelConfigVo> {
    return this.toH5ConfigVo(await this.ensureH5Config())
  }

  async updateH5Config(config: UpdateAiAppModelConfigDto): Promise<void> {
    const current = await this.ensureH5Config()
    const textModel = await this.getModelForConfig(config.textModelPk, ['text', 'multimodal'])
    const keywordImageModel = await this.getModelForConfig(config.keywordImageModelPk, ['image', 'multimodal'])
    const photoImageModel = await this.getModelForConfig(config.photoImageModelPk, ['image', 'multimodal'])
    const { options, ...modelConfig } = config
    const currentOptions = this.parseH5Options(current.optionConfig)
    const nextOptions = options
      ? mergeH5OutfitOptions({
          ...currentOptions,
          ...options,
          login: {
            ...currentOptions.login,
            ...(options.login || {}),
          },
          homeHero: {
            ...currentOptions.homeHero,
            ...(options.homeHero || {}),
          },
          homeDailyRefresh: {
            ...currentOptions.homeDailyRefresh,
            ...(options.homeDailyRefresh || {}),
          },
          loginDailyRefresh: {
            ...currentOptions.loginDailyRefresh,
            ...(options.loginDailyRefresh || {}),
          },
          chatAssistant: {
            ...currentOptions.chatAssistant,
            ...(options.chatAssistant || {}),
          },
        })
      : currentOptions

    await this.appConfigRepository.update(current.configId, {
      ...modelConfig,
      textProviderId: textModel?.providerId,
      keywordImageProviderId: keywordImageModel?.providerId,
      photoImageProviderId: photoImageModel?.providerId,
      optionConfig: JSON.stringify(nextOptions),
    })
  }

  async publicH5Config(): Promise<H5AppModelConfigVo> {
    const config = await this.ensureH5Config()
    void this.refreshH5ScheduledContentIfNeeded('public-read').catch((error) => {
      this.logger.warn({
        event: 'h5.daily_refresh.public_read_failed',
        error: this.toSafeErrorMessage(error),
      })
    })
    return this.toH5ConfigVo(config)
  }

  async refreshH5HomeContentManually() {
    return this.refreshH5HomeContent({ force: true, source: 'manual' })
  }

  async refreshH5LoginContentManually() {
    return this.refreshH5LoginContent({ force: true, source: 'manual' })
  }

  async getH5RuntimeConfig(selectedImageModel?: string, usePhotoImage = false): Promise<H5RuntimeModelConfig> {
    const config = await this.ensureH5Config()
    if (config.status !== BaseStatusEnum.NORMAL) return {}

    const [text, keywordImage, photoImage] = await Promise.all([
      this.getRuntimeModel(config.textModelPk),
      this.getRuntimeModel(config.keywordImageModelPk),
      this.getRuntimeModel(config.photoImageModelPk),
    ])
    const selectedImage = selectedImageModel
      ? await this.getRuntimeImageModelByModelId(selectedImageModel, this.parseH5Options(config.optionConfig))
      : undefined
    const resolvedKeywordImage = selectedImage && !usePhotoImage ? selectedImage : keywordImage
    const resolvedPhotoImage = selectedImage && usePhotoImage ? selectedImage : photoImage

    return {
      textApiKey: text?.provider.apiKey,
      textBaseUrl: text?.provider.baseUrl,
      textModel: text?.model.modelId,
      keywordImageApiKey: resolvedKeywordImage?.provider.apiKey,
      keywordImageBaseUrl: resolvedKeywordImage?.provider.baseUrl,
      keywordImageModel: resolvedKeywordImage?.model.modelId,
      photoImageApiKey: resolvedPhotoImage?.provider.apiKey,
      photoImageBaseUrl: resolvedPhotoImage?.provider.baseUrl,
      photoImageModel: resolvedPhotoImage?.model.modelId,
    }
  }

  async getH5DailyFreeGenerationLimit() {
    const config = await this.ensureH5Config()
    return normalizeDailyFreeGenerationLimit(this.parseH5Options(config.optionConfig).dailyFreeGenerationLimit)
  }

  async isH5GuestLoginEnabled() {
    const config = await this.ensureH5Config()
    if (config.status !== BaseStatusEnum.NORMAL) return false

    return this.parseH5Options(config.optionConfig).login.guestEnabled !== false
  }

  async completeH5Chat(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) {
    const config = await this.ensureH5Config()
    if (config.status !== BaseStatusEnum.NORMAL) throw new ServiceException('H5模型配置已停用')

    const textRuntime = await this.getRuntimeModel(config.textModelPk)
    if (!textRuntime) throw new ServiceException('请先配置可用的 H5 文本模型')

    const client = this.createClient(textRuntime.provider)
    const response = await client.chat.completions.create({
      model: textRuntime.model.modelId,
      messages,
      temperature: 0.6,
    })

    return response.choices?.[0]?.message?.content || ''
  }

  private async refreshH5ScheduledContentIfNeeded(source: string) {
    await this.refreshH5HomeContentIfNeeded(source)
    await this.refreshH5LoginContentIfNeeded(source)
  }

  private async refreshH5HomeContentIfNeeded(source: string) {
    const config = await this.ensureH5Config()
    const options = this.parseH5Options(config.optionConfig)
    if (!options.homeDailyRefresh.enabled) return null
    if (!this.shouldRefreshH5HomeContent(options)) return null

    return this.refreshH5HomeContent({ config, force: false, source })
  }

  private async refreshH5LoginContentIfNeeded(source: string) {
    const config = await this.ensureH5Config()
    const options = this.parseH5Options(config.optionConfig)
    if (!options.loginDailyRefresh.enabled) return null
    if (!this.shouldRefreshH5LoginContent(options)) return null

    return this.refreshH5LoginContent({ config, force: false, source })
  }

  private shouldRefreshH5HomeContent(options: H5OutfitOptionConfig) {
    const now = new Date()
    if (now.getHours() < options.homeDailyRefresh.refreshHour) return false

    return options.homeDailyRefresh.lastRefreshDateKey !== this.buildLocalDateKey(now)
  }

  private shouldRefreshH5LoginContent(options: H5OutfitOptionConfig) {
    const now = new Date()
    if (now.getHours() < options.loginDailyRefresh.refreshHour) return false

    return options.loginDailyRefresh.lastRefreshDateKey !== this.buildLocalDateKey(now)
  }

  private async refreshH5HomeContent({
    config,
    force,
    source,
  }: {
    config?: AiAppModelConfig
    force: boolean
    source: string
  }) {
    if (this.homeRefreshRunning) {
      if (force) {
        const currentConfig = config || (await this.ensureH5Config())
        this.logger.warn({
          event: 'h5.home.daily_refresh.manual_skipped_running',
          source,
        })
        return this.toH5RefreshingConfigVo(currentConfig)
      }
      return null
    }

    this.homeRefreshRunning = true
    let currentConfig: AiAppModelConfig | undefined
    let options: H5OutfitOptionConfig | undefined
    try {
      currentConfig = config || (await this.ensureH5Config())
      options = this.parseH5Options(currentConfig.optionConfig)
      const today = this.buildLocalDateKey()

      if (!force && !this.shouldRefreshH5HomeContent(options)) {
        return this.toH5ConfigVo(currentConfig)
      }

      const generated = await this.generateH5HomeContent(options)
      const nextOptions = mergeH5OutfitOptions({
        ...options,
        homeHero: {
          ...options.homeHero,
          kicker: this.readGeneratedText(generated.kicker, options.homeHero.kicker, 28),
          titleLine1: this.readGeneratedText(generated.titleLine1, options.homeHero.titleLine1, 14),
          titleLine2: this.readGeneratedText(generated.titleLine2, options.homeHero.titleLine2, 14),
          subtitle: this.readGeneratedText(generated.subtitle, options.homeHero.subtitle, 68),
          primaryAction: this.readGeneratedText(generated.primaryAction, options.homeHero.primaryAction, 8),
          secondaryAction: this.readGeneratedText(generated.secondaryAction, options.homeHero.secondaryAction, 8),
          lensText: this.readGeneratedText(generated.lensText, options.homeHero.lensText, 12),
          backgroundImage: generated.backgroundImage,
          backgroundAlt: this.readGeneratedText(generated.backgroundAlt, 'AI 生成穿搭首页背景图', 40),
          generatedAt: new Date().toISOString(),
        },
        homeCategories: this.readGeneratedList(generated.homeCategories, options.homeCategories, 5, 8),
        inspirationKeywords: this.readGeneratedList(generated.inspirationKeywords, options.inspirationKeywords, 6, 12),
        homeLooks: generated.homeLooks,
        homeDailyRefresh: {
          ...options.homeDailyRefresh,
          lastRefreshDateKey: today,
          lastRefreshAt: new Date().toISOString(),
          lastError: '',
        },
      })

      await this.appConfigRepository.update(currentConfig.configId, {
        optionConfig: JSON.stringify(nextOptions),
        updateBy: 'system',
      })
      this.logger.log({
        event: 'h5.home.daily_refresh.succeeded',
        source,
        dateKey: today,
      })
      const refreshed = await this.ensureH5Config()
      return this.toH5ConfigVo(refreshed)
    } catch (error) {
      if (currentConfig && options) {
        const nextOptions = mergeH5OutfitOptions({
          ...options,
          homeDailyRefresh: {
            ...options.homeDailyRefresh,
            lastError: this.toSafeErrorMessage(error),
          },
        })
        await this.appConfigRepository.update(currentConfig.configId, {
          optionConfig: JSON.stringify(nextOptions),
          updateBy: 'system',
        })
      }
      this.logger.warn({
        event: 'h5.home.daily_refresh.failed',
        source,
        error: this.toSafeErrorMessage(error),
      })
      if (force) throw error
      return null
    } finally {
      this.homeRefreshRunning = false
    }
  }

  private async refreshH5LoginContent({
    config,
    force,
    source,
  }: {
    config?: AiAppModelConfig
    force: boolean
    source: string
  }) {
    if (this.loginRefreshRunning) {
      if (force) {
        const currentConfig = config || (await this.ensureH5Config())
        this.logger.warn({
          event: 'h5.login.daily_refresh.manual_skipped_running',
          source,
        })
        return this.toH5LoginRefreshingConfigVo(currentConfig)
      }
      return null
    }

    this.loginRefreshRunning = true
    let currentConfig: AiAppModelConfig | undefined
    let options: H5OutfitOptionConfig | undefined
    try {
      currentConfig = config || (await this.ensureH5Config())
      options = this.parseH5Options(currentConfig.optionConfig)
      const today = this.buildLocalDateKey()

      if (!force && !this.shouldRefreshH5LoginContent(options)) {
        return this.toH5ConfigVo(currentConfig)
      }

      const generated = await this.generateH5LoginContent(options)
      const generatedHeroImages = generated.heroImages || []
      const firstHero = generatedHeroImages[0]
      const nextOptions = mergeH5OutfitOptions({
        ...options,
        login: {
          ...options.login,
          heroImage: firstHero?.image || options.login.heroImage,
          heroAlt: firstHero?.alt || options.login.heroAlt,
          heroImages: generatedHeroImages,
          poems: generated.poems || options.login.poems,
        },
        loginDailyRefresh: {
          ...options.loginDailyRefresh,
          lastRefreshDateKey: today,
          lastRefreshAt: new Date().toISOString(),
          lastError: '',
        },
      })

      await this.appConfigRepository.update(currentConfig.configId, {
        optionConfig: JSON.stringify(nextOptions),
        updateBy: 'system',
      })
      this.logger.log({
        event: 'h5.login.daily_refresh.succeeded',
        source,
        dateKey: today,
      })
      const refreshed = await this.ensureH5Config()
      return this.toH5ConfigVo(refreshed)
    } catch (error) {
      if (currentConfig && options) {
        const nextOptions = mergeH5OutfitOptions({
          ...options,
          loginDailyRefresh: {
            ...options.loginDailyRefresh,
            lastError: this.toSafeErrorMessage(error),
          },
        })
        await this.appConfigRepository.update(currentConfig.configId, {
          optionConfig: JSON.stringify(nextOptions),
          updateBy: 'system',
        })
      }
      this.logger.warn({
        event: 'h5.login.daily_refresh.failed',
        source,
        error: this.toSafeErrorMessage(error),
      })
      if (force) throw error
      return null
    } finally {
      this.loginRefreshRunning = false
    }
  }

  private async generateH5HomeContent(options: H5OutfitOptionConfig) {
    const config = await this.ensureH5Config()
    const [textRuntime, imageRuntime] = await Promise.all([
      this.getRuntimeModel(config.textModelPk),
      this.getRuntimeModel(config.keywordImageModelPk),
    ])
    if (!textRuntime) throw new ServiceException('请先配置可用的 H5 文本模型')
    if (!imageRuntime) throw new ServiceException('请先配置可用的 H5 生图模型')

    const textClient = this.createClient(textRuntime.provider)
    const copy = await this.generateH5HomeCopy(textClient, textRuntime.model.modelId, options)
    const imageClient = this.createClient(imageRuntime.provider)
    const rawImage = await generateImageFromPrompt(
      imageClient,
      imageRuntime.model.modelId,
      copy.imagePrompt || this.buildDefaultH5HomeImagePrompt(copy),
      '1536x1024',
      '首页背景图生成失败',
      { taskId: `h5-home-${this.buildLocalDateKey()}` }
    )
    const backgroundImage = await persistOutfitImage(rawImage, this.configService)
    const homeLooks = await this.generateH5HomeLooks(imageClient, imageRuntime.model.modelId, copy, options)
    return {
      ...copy,
      backgroundImage,
      homeLooks,
    }
  }

  private async generateH5LoginContent(options: H5OutfitOptionConfig) {
    const config = await this.ensureH5Config()
    const [textRuntime, imageRuntime] = await Promise.all([
      this.getRuntimeModel(config.textModelPk),
      this.getRuntimeModel(config.keywordImageModelPk),
    ])
    if (!textRuntime) throw new ServiceException('请先配置可用的 H5 文本模型')
    if (!imageRuntime) throw new ServiceException('请先配置可用的 H5 生图模型')

    const textClient = this.createClient(textRuntime.provider)
    const copy = await this.generateH5LoginCopy(textClient, textRuntime.model.modelId, options)
    const imageClient = this.createClient(imageRuntime.provider)
    const taskIdPrefix = `h5-login-${this.buildLocalDateKey()}`
    const heroImages: H5LoginHeroImageConfig[] = []

    for (const [index, brief] of this.buildH5LoginHeroBriefs(copy).entries()) {
      const rawImage = await generateImageFromPrompt(
        imageClient,
        imageRuntime.model.modelId,
        this.buildH5LoginHeroImagePrompt(brief),
        '1536x1024',
        `登录页封面图「${brief.alt || index + 1}」生成失败`,
        { taskId: `${taskIdPrefix}-${index + 1}` }
      )
      heroImages.push({
        image: await persistOutfitImage(rawImage, this.configService),
        alt: this.readGeneratedText(brief.alt, options.login.heroAlt, 40),
      })
    }

    return {
      heroImages,
      poems: this.buildH5LoginPoems(copy, options),
    }
  }

  private async generateH5HomeLooks(
    client: OpenAI,
    model: string,
    content: GeneratedH5HomeContent,
    options: H5OutfitOptionConfig
  ) {
    const briefs = buildH5HomeLookBriefs(
      content.homeLooks,
      options.homeLooks,
      this.readGeneratedList(content.homeCategories, options.homeCategories, 5, 8),
      this.readGeneratedList(content.inspirationKeywords, options.inspirationKeywords, 6, 12)
    )
    const taskIdPrefix = `h5-home-look-${this.buildLocalDateKey()}`
    const looks = []

    for (const [index, brief] of briefs.entries()) {
      const image = await this.generateH5HomeLookImage(client, model, brief, `${taskIdPrefix}-${index + 1}`)
      looks.push({
        label: brief.label,
        image,
      })
    }

    return looks
  }

  private async generateH5HomeLookImage(client: OpenAI, model: string, brief: H5HomeLookBrief, taskId: string) {
    const rawImage = await generateImageFromPrompt(
      client,
      model,
      buildH5HomeLookImagePrompt(brief),
      '1024x1536',
      `首页图片「${brief.label}」生成失败`,
      { taskId }
    )

    return persistOutfitImage(rawImage, this.configService)
  }

  private async generateH5HomeCopy(
    client: OpenAI,
    model: string,
    options: H5OutfitOptionConfig
  ): Promise<GeneratedH5HomeContent> {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            '你是 CloudWear AI 的时尚内容运营。只允许输出穿搭、服饰、造型、场景着装相关内容。禁止输出美食、旅游攻略、金融、医疗、政治、低俗或非穿搭主题。必须返回严格 JSON，不要 Markdown。',
        },
        {
          role: 'user',
          content: [
            '请为 H5 首页生成当天穿搭主题内容和一张首页背景图提示词。',
            '要求：中文文案自然、有穿搭感；背景图和首页图片必须是时尚穿搭 editorial，不要文字、logo、水印。',
            `现有标签：${options.homeCategories.join('、')}`,
            `现有关键词：${options.inspirationKeywords.join('、')}`,
            'JSON 字段：kicker,titleLine1,titleLine2,subtitle,primaryAction,secondaryAction,lensText,backgroundAlt,homeCategories,inspirationKeywords,imagePrompt,homeLooks。',
            'homeCategories 输出 5 个，inspirationKeywords 输出 6 个。',
            'imagePrompt 用英文，必须描述真人全身穿搭、服装层次、配色、质感、H5 首页背景构图。',
            'homeLooks 输出 4 个对象，每个对象包含 label 和 imagePrompt；imagePrompt 用英文，描述一张 4:5 首页灵感穿搭图片。',
          ].join('\n'),
        },
      ],
      temperature: 0.8,
    })
    return this.parseGeneratedH5HomeContent(response.choices?.[0]?.message?.content || '')
  }

  private async generateH5LoginCopy(
    client: OpenAI,
    model: string,
    options: H5OutfitOptionConfig
  ): Promise<GeneratedH5LoginContent> {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            '你是 CloudWear AI 的登录页视觉与文案运营。只允许输出穿搭、服饰、造型、美学衣橱相关内容。禁止输出美食、旅游攻略、金融、医疗、政治、低俗或非穿搭主题。必须返回严格 JSON，不要 Markdown。',
        },
        {
          role: 'user',
          content: [
            '请为 H5 登录页生成 3 张封面图提示词和 3 组底部文案。',
            '封面图要求：高级、轻盈、符合 AI 穿搭产品气质；图片中不要文字、logo、水印；适合手机登录页顶部横向裁切。',
            '底部文案要求：中文，短句，优雅但不要空泛；可以有诗意，但必须和衣橱、穿搭、风格、变美相关。',
            `当前品牌标题：${options.login.brandTitle}`,
            `当前副标题：${options.login.subtitle}`,
            'JSON 字段：heroImages,poems。',
            'heroImages 输出 3 个对象，每个对象包含 alt 和 imagePrompt；imagePrompt 用英文，描述 fashion editorial login hero image。',
            'poems 输出 3 个对象，每个对象包含 kicker,line1,line2,footer。',
          ].join('\n'),
        },
      ],
      temperature: 0.82,
    })
    return this.parseGeneratedH5LoginContent(response.choices?.[0]?.message?.content || '')
  }

  private parseGeneratedH5HomeContent(content: string): GeneratedH5HomeContent {
    const jsonText = this.extractJsonObject(content)
    if (!jsonText) throw new ServiceException('文本模型未返回有效的首页 JSON 文案')

    let payload: GeneratedH5HomeContent
    try {
      payload = JSON.parse(jsonText) as GeneratedH5HomeContent
    } catch {
      throw new ServiceException('文本模型返回的首页 JSON 文案解析失败')
    }
    const imagePrompt = this.readGeneratedText(payload.imagePrompt, '', 1800)
    if (!imagePrompt || !this.isFashionRelatedText(imagePrompt)) {
      throw new ServiceException('首页背景图提示词不符合穿搭主题约束')
    }
    const textFields = [
      payload.kicker,
      payload.titleLine1,
      payload.titleLine2,
      payload.subtitle,
      ...(payload.homeCategories || []),
      ...(payload.inspirationKeywords || []),
    ]
    if (!textFields.some((item) => this.isFashionRelatedText(item || ''))) {
      throw new ServiceException('首页文案不符合穿搭主题约束')
    }

    return payload
  }

  private parseGeneratedH5LoginContent(content: string): GeneratedH5LoginContent {
    const jsonText = this.extractJsonObject(content)
    if (!jsonText) throw new ServiceException('文本模型未返回有效的登录页 JSON 文案')

    let payload: GeneratedH5LoginContent
    try {
      payload = JSON.parse(jsonText) as GeneratedH5LoginContent
    } catch {
      throw new ServiceException('文本模型返回的登录页 JSON 文案解析失败')
    }

    const heroImages = Array.isArray(payload.heroImages)
      ? payload.heroImages
          .map((item) => this.normalizeGeneratedH5LoginHeroBrief(item))
          .filter((item): item is GeneratedH5LoginHeroBrief => Boolean(item))
          .slice(0, 3)
      : []
    const poems = Array.isArray(payload.poems)
      ? payload.poems
          .map((item) => this.normalizeGeneratedH5LoginPoem(item))
          .filter((item): item is H5LoginPoemConfig => Boolean(item))
          .slice(0, 3)
      : []

    if (!heroImages.length) throw new ServiceException('登录页封面图提示词不符合穿搭主题约束')
    if (!poems.length) throw new ServiceException('登录页底部文案不符合穿搭主题约束')

    return { heroImages, poems }
  }

  private normalizeGeneratedH5LoginHeroBrief(value: unknown): GeneratedH5LoginHeroBrief | null {
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    const alt = this.readGeneratedText(record.alt, 'AI 生成登录页穿搭封面图', 40)
    const imagePrompt = this.readGeneratedText(record.imagePrompt || record.prompt, '', 1600)
    if (!imagePrompt || !this.isFashionRelatedText(`${alt} ${imagePrompt}`)) return null

    return { alt, imagePrompt }
  }

  private normalizeGeneratedH5LoginPoem(value: unknown): H5LoginPoemConfig | null {
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    const poem: H5LoginPoemConfig = {
      kicker: this.readGeneratedText(record.kicker, '', 10),
      line1: this.readGeneratedText(record.line1, '', 16),
      line2: this.readGeneratedText(record.line2, '', 16),
      footer: this.readGeneratedText(record.footer, '', 24),
    }
    if (!this.isFashionRelatedText(`${poem.kicker} ${poem.line1} ${poem.line2} ${poem.footer}`)) return null
    if (!poem.kicker || !poem.line1 || !poem.footer) return null

    return poem
  }

  private buildH5LoginHeroBriefs(content: GeneratedH5LoginContent) {
    return (content.heroImages || []).slice(0, 3)
  }

  private buildH5LoginHeroImagePrompt(brief: GeneratedH5LoginHeroBrief) {
    return [
      'Premium fashion editorial hero image for a mobile AI outfit styling login page.',
      brief.imagePrompt || '',
      'Elegant wardrobe atmosphere, refined fabrics, soft daylight, modern Chinese fashion app aesthetic.',
      'Horizontal mobile hero composition, clean upper area for overlay text, no text, no logo, no watermark.',
    ].join(' ')
  }

  private buildH5LoginPoems(content: GeneratedH5LoginContent, options: H5OutfitOptionConfig) {
    const poems = (content.poems || []).slice(0, 3)
    return poems.length ? poems : options.login.poems
  }

  private extractJsonObject(content: string) {
    const trimmed = content.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
    if (fenced?.startsWith('{') && fenced.endsWith('}')) return fenced

    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
    return ''
  }

  private buildDefaultH5HomeImagePrompt(content: GeneratedH5HomeContent) {
    return [
      'Premium fashion editorial homepage background for an AI outfit styling app.',
      'Full-body stylish model wearing layered daily outfit, refined fabric texture, tasteful color palette.',
      `Theme: ${content.titleLine1 || ''} ${content.titleLine2 || ''}.`,
      'Mobile H5 hero composition, clean negative space on the left, no text, no logo, no watermark.',
    ].join(' ')
  }

  private readGeneratedText(value: unknown, fallback: string, maxLength: number) {
    const text = typeof value === 'string' ? value.trim() : ''
    return (text || fallback).slice(0, maxLength)
  }

  private readGeneratedList(value: unknown, fallback: string[], maxLength: number, itemMaxLength: number) {
    const list = Array.isArray(value)
      ? value.map((item) => String(item || '').trim()).filter(Boolean)
      : []
    const filtered = list.filter((item) => this.isFashionRelatedText(item)).slice(0, maxLength)
    return (filtered.length ? filtered : fallback).map((item) => item.slice(0, itemMaxLength))
  }

  private isFashionRelatedText(value: string) {
    const text = value.toLowerCase()
    return [
      '穿',
      '搭',
      '衣',
      '服',
      '装',
      '造型',
      '风格',
      '通勤',
      '约会',
      '外套',
      '裙',
      '裤',
      '鞋',
      '包',
      'fashion',
      'outfit',
      'styling',
      'wear',
      'clothing',
      'wardrobe',
      'editorial',
    ].some((keyword) => text.includes(keyword))
  }

  private buildLocalDateKey(value = new Date()) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  private async getProviderWithSecret(providerId: number): Promise<AiModelProvider> {
    const provider = await this.providerRepository
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.models', 'models')
      .addSelect('provider.apiKey')
      .where('provider.providerId = :providerId', { providerId })
      .orderBy('models.modelPk', 'ASC')
      .getOne()
    if (!provider) throw new ServiceException('服务商不存在')
    return provider
  }

  private async ensureProvider(providerId: number): Promise<void> {
    const provider = await this.providerRepository.findOneBy({ providerId })
    if (!provider) throw new ServiceException('服务商不存在')
  }

  private async ensureH5Config(): Promise<AiAppModelConfig> {
    let config = await this.appConfigRepository.findOneBy({ appCode: h5OutfitAppCode })
    if (config) return config

    const [textModel, imageModel] = await Promise.all([
      this.modelRepository.findOne({
        where: [
          { modelType: 'text', status: BaseStatusEnum.NORMAL },
          { modelType: 'multimodal', status: BaseStatusEnum.NORMAL },
        ],
        order: { isDefault: 'DESC', modelPk: 'ASC' },
      }),
      this.modelRepository.findOne({
        where: [
          { modelType: 'image', status: BaseStatusEnum.NORMAL },
          { modelType: 'multimodal', status: BaseStatusEnum.NORMAL },
        ],
        order: { isDefault: 'DESC', modelPk: 'ASC' },
      }),
    ])

    const created = this.appConfigRepository.create({
      appCode: h5OutfitAppCode,
      appName: h5OutfitAppName,
      textProviderId: textModel?.providerId,
      textModelPk: textModel?.modelPk,
      keywordImageProviderId: imageModel?.providerId,
      keywordImageModelPk: imageModel?.modelPk,
      photoImageProviderId: imageModel?.providerId,
      photoImageModelPk: imageModel?.modelPk,
      status: BaseStatusEnum.NORMAL,
      optionConfig: JSON.stringify(defaultH5OutfitOptions),
      createBy: 'system',
    })
    await this.appConfigRepository.insert(created)
    config = await this.appConfigRepository.findOneBy({ appCode: h5OutfitAppCode })
    return config
  }

  private toH5ConfigVo(config: AiAppModelConfig): H5AppModelConfigVo {
    const { optionConfig, ...rest } = config
    return {
      ...rest,
      options: this.parseH5Options(optionConfig),
    }
  }

  private toH5RefreshingConfigVo(config: AiAppModelConfig): H5AppModelConfigVo {
    const vo = this.toH5ConfigVo(config)
    return {
      ...vo,
      options: mergeH5OutfitOptions({
        ...vo.options,
        homeDailyRefresh: {
          ...vo.options.homeDailyRefresh,
          isRefreshing: true,
          runningMessage: h5HomeRefreshRunningMessage,
        },
      }),
    }
  }

  private toH5LoginRefreshingConfigVo(config: AiAppModelConfig): H5AppModelConfigVo {
    const vo = this.toH5ConfigVo(config)
    return {
      ...vo,
      options: mergeH5OutfitOptions({
        ...vo.options,
        loginDailyRefresh: {
          ...vo.options.loginDailyRefresh,
          isRefreshing: true,
          runningMessage: h5LoginRefreshRunningMessage,
        },
      }),
    }
  }

  private parseH5Options(optionConfig?: string): H5OutfitOptionConfig {
    if (!optionConfig) return defaultH5OutfitOptions
    try {
      return mergeH5OutfitOptions(JSON.parse(optionConfig))
    } catch {
      throw new ServiceException('H5选项配置格式不正确')
    }
  }

  private async getModelForConfig(modelPk: number | undefined, types: string[]) {
    if (!modelPk) return undefined
    const model = await this.modelRepository.findOneBy({ modelPk: Number(modelPk) })
    if (!model) throw new ServiceException('模型不存在')
    if (!types.includes(model.modelType)) throw new ServiceException('模型类型不匹配')
    return model
  }

  private async getRuntimeModel(modelPk: number | undefined) {
    if (!modelPk) return undefined
    const model = await this.modelRepository.findOneBy({
      modelPk: Number(modelPk),
      status: BaseStatusEnum.NORMAL,
    })
    if (!model) return undefined

    const provider = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect('provider.apiKey')
      .where('provider.providerId = :providerId', { providerId: model.providerId })
      .andWhere('provider.status = :status', { status: BaseStatusEnum.NORMAL })
      .getOne()
    if (!provider) return undefined

    return { model, provider }
  }

  private async getRuntimeImageModelByModelId(modelId: string, options: H5OutfitOptionConfig) {
    const enabledModelIds = new Set(
      (options.imageModels || [])
        .map((option) => String(option.value || '').trim())
        .filter(Boolean)
    )
    if (!enabledModelIds.has(modelId)) {
      throw new ServiceException('所选生图模型未在后台 H5 配置中启用')
    }

    const model = await this.modelRepository.findOne({
      where: [
        { modelId, modelType: 'image', status: BaseStatusEnum.NORMAL },
        { modelId, modelType: 'multimodal', status: BaseStatusEnum.NORMAL },
      ],
      order: { modelPk: 'ASC' },
    })
    if (!model) throw new ServiceException('所选生图模型不可用')

    const provider = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect('provider.apiKey')
      .where('provider.providerId = :providerId', { providerId: model.providerId })
      .andWhere('provider.status = :status', { status: BaseStatusEnum.NORMAL })
      .getOne()
    if (!provider) throw new ServiceException('所选生图模型服务商不可用')

    return { model, provider }
  }

  private createClient(provider: AiModelProvider, override: TestConnectionDto = {}) {
    const apiKey = override.apiKey && !this.isMaskedApiKey(override.apiKey) ? override.apiKey : provider.apiKey
    const baseURL = override.baseUrl || provider.baseUrl
    if (!apiKey) throw new ServiceException('请先配置 API Key')
    if (!baseURL) throw new ServiceException('请先配置 Base URL')

    return new OpenAI({
      apiKey,
      baseURL,
    })
  }

  private toProviderVo(provider: AiModelProvider): AiModelProviderVo {
    const { apiKey, ...safeProvider } = provider
    return {
      ...safeProvider,
      hasApiKey: Boolean(apiKey),
      apiKeyMasked: apiKey ? this.maskApiKey(apiKey) : '',
      models: provider.models ?? [],
    }
  }

  private maskApiKey(apiKey: string) {
    if (apiKey.length <= 10) return '••••••'
    return `${apiKey.slice(0, 3)}${'•'.repeat(12)}${apiKey.slice(-4)}`
  }

  private isMaskedApiKey(apiKey: string) {
    return apiKey.includes('•') || apiKey.includes('*')
  }

  private async clearDefaultModel(providerId: number) {
    await this.modelRepository.update({ providerId }, { isDefault: BaseIsEnum.NO })
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  private toSafeErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    return String(error)
  }
}
