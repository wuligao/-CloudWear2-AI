export interface AiPromptTemplateModel extends BaseBusinessEntity {
  promptId: number
  promptName: string
  scene: string
  promptType: 'image' | 'text' | 'multimodal' | string
  status: string
  description?: string
  promptContent: string
  usageGuide?: string
  applicableModels: string[]
  usageCount: number
  lastUsedTime?: string
  sortOrder?: number
}

export interface AiPromptTemplateStats {
  total: number
  enabled: number
  disabled: number
  sceneCount: number
  usageCount: number
}

export interface ListAiPromptTemplateParams extends PaginateParams {
  keyword?: string
  scene?: string
  promptType?: string
  status?: string
}

export interface CreateAiPromptTemplateParams {
  promptName: string
  scene: string
  promptType: string
  status?: string
  description?: string
  promptContent: string
  usageGuide?: string
  applicableModels?: string[]
  sortOrder?: number
}

export type UpdateAiPromptTemplateParams = Partial<CreateAiPromptTemplateParams>
