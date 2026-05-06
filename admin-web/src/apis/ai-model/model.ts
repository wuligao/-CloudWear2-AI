export type AiModelType = 'multimodal' | 'text' | 'image' | 'embedding'

export interface AiModelItem {
  modelPk: number
  providerId: number
  modelName: string
  modelId: string
  modelType: AiModelType
  contextLength?: string
  isDefault: string
  status: string
  remark?: string
}

export interface AiModelProvider {
  providerId: number
  providerName: string
  providerCode: string
  baseUrl: string
  apiKeyMasked?: string
  hasApiKey: boolean
  defaultModelId?: string
  iconText?: string
  color: string
  status: string
  remark?: string
  models: AiModelItem[]
}

export interface CreateAiModelProviderParams {
  providerName: string
  providerCode?: string
  baseUrl: string
  apiKey?: string
  defaultModelId?: string
  iconText?: string
  color?: string
  status?: string
  remark?: string
}

export type UpdateAiModelProviderParams = Partial<CreateAiModelProviderParams>

export interface CreateAiModelItemParams {
  modelName: string
  modelId: string
  modelType: AiModelType
  contextLength?: string
  isDefault?: string
  status?: string
  remark?: string
}

export type UpdateAiModelItemParams = Partial<CreateAiModelItemParams>

export interface AiModelConnectionTestParams {
  baseUrl?: string
  apiKey?: string
  modelId?: string
}

export interface AiModelConnectionTestResult {
  success: boolean
  latencyMs: number
  checkedAt: string
  modelCount: number
  message: string
}

export interface AiModelTestParams {
  providerId: number
  modelId?: string
  testType: Exclude<AiModelType, 'multimodal'>
  prompt: string
}

export interface AiModelTestResult {
  success: boolean
  latencyMs: number
  tokenUsage: number
  output: string
  imageUrl?: string
}

export interface AiAppModelConfig {
  configId: number
  appCode: string
  appName: string
  textProviderId?: number
  textModelPk?: number
  keywordImageProviderId?: number
  keywordImageModelPk?: number
  photoImageProviderId?: number
  photoImageModelPk?: number
  status: string
  options: H5OutfitOptionConfig
  remark?: string
}

export interface H5OutfitOptionItem {
  label: string
  value?: string | number
  image?: string
  icon?: string
  color?: string
  group?: string
  supportsPhotoInput?: boolean
}

export interface H5LoginConfig {
  heroImage: string
  heroAlt: string
  heroImages: H5LoginHeroImageConfig[]
  brandTitle: string
  subtitle: string
  poems: H5LoginPoemConfig[]
  phonePasswordEnabled: boolean
  registerEnabled: boolean
  wechatEnabled: boolean
  guestEnabled: boolean
}

export interface H5LoginHeroImageConfig {
  image: string
  alt: string
}

export interface H5LoginPoemConfig {
  kicker: string
  line1: string
  line2: string
  footer: string
}

export interface H5HomeHeroConfig {
  kicker: string
  titleLine1: string
  titleLine2: string
  subtitle: string
  primaryAction: string
  secondaryAction: string
  lensText: string
  backgroundImage: string
  backgroundAlt: string
  generatedAt?: string
}

export interface H5HomeDailyRefreshConfig {
  enabled: boolean
  refreshHour: number
  lastRefreshDateKey?: string
  lastRefreshAt?: string
  lastError?: string
  isRefreshing?: boolean
  runningMessage?: string
}

export interface H5LoginDailyRefreshConfig {
  enabled: boolean
  refreshHour: number
  lastRefreshDateKey?: string
  lastRefreshAt?: string
  lastError?: string
  isRefreshing?: boolean
  runningMessage?: string
}

export interface H5ChatAssistantConfig {
  enabled: boolean
  welcomeMessage: string
  quickPrompts: string[]
  useStyleProfile: boolean
  useRecentRecords: boolean
  dailyLimit: number
  maxHistoryMessages: number
}

export interface H5OutfitOptionConfig {
  dailyFreeGenerationLimit: number
  tomorrowRecommendationStartHour: number
  login: H5LoginConfig
  homeHero: H5HomeHeroConfig
  homeDailyRefresh: H5HomeDailyRefreshConfig
  loginDailyRefresh: H5LoginDailyRefreshConfig
  chatAssistant: H5ChatAssistantConfig
  inspirationKeywords: string[]
  homeCategories: string[]
  homeLooks: H5OutfitOptionItem[]
  seasons: H5OutfitOptionItem[]
  weathers: H5OutfitOptionItem[]
  temperatures: H5OutfitOptionItem[]
  locations: H5OutfitOptionItem[]
  styles: H5OutfitOptionItem[]
  scenes: H5OutfitOptionItem[]
  colors: H5OutfitOptionItem[]
  items: H5OutfitOptionItem[]
  imageModels: H5OutfitOptionItem[]
  generationCounts: H5OutfitOptionItem[]
}

export interface UpdateAiAppModelConfigParams {
  textModelPk?: number
  keywordImageModelPk?: number
  photoImageModelPk?: number
  status?: string
  options?: H5OutfitOptionConfig
  remark?: string
}
