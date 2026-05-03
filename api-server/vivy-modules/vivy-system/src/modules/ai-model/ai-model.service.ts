import OpenAI from 'openai'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BaseIsEnum, BaseStatusEnum, ServiceException } from '@vivy-common/core'
import { Repository } from 'typeorm'
import { generateImageFromPrompt } from '../outfit/ai/openai'
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
  H5OutfitOptionConfig,
  mergeH5OutfitOptions,
  normalizeDailyFreeGenerationLimit,
} from './h5-outfit-options'

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

@Injectable()
export class AiModelService {
  constructor(
    @InjectRepository(AiModelProvider)
    private readonly providerRepository: Repository<AiModelProvider>,
    @InjectRepository(AiModelItem)
    private readonly modelRepository: Repository<AiModelItem>,
    @InjectRepository(AiAppModelConfig)
    private readonly appConfigRepository: Repository<AiAppModelConfig>
  ) {}

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
    return this.toH5ConfigVo(config)
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
