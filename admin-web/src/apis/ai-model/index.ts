import { request } from '@umijs/max'
import { RequestEnum } from '@/enums/httpEnum'
import type {
  AiAppModelConfig,
  AiModelConnectionTestParams,
  AiModelConnectionTestResult,
  AiModelProvider,
  AiModelTestParams,
  AiModelTestResult,
  CreateAiModelItemParams,
  CreateAiModelProviderParams,
  UpdateAiAppModelConfigParams,
  UpdateAiModelItemParams,
  UpdateAiModelProviderParams,
} from './model'
export * from './model'

export function listAiModelProviders() {
  return request<AiModelProvider[]>('/ai-model/providers', {
    method: RequestEnum.GET,
  })
}

export function infoAiModelProvider(providerId: number) {
  return request<AiModelProvider>(`/ai-model/providers/${providerId}`, {
    method: RequestEnum.GET,
  })
}

export function addAiModelProvider(params: CreateAiModelProviderParams) {
  return request(`/ai-model/providers`, {
    method: RequestEnum.POST,
    data: params,
  })
}

export function updateAiModelProvider(providerId: number, params: UpdateAiModelProviderParams) {
  return request(`/ai-model/providers/${providerId}`, {
    method: RequestEnum.PUT,
    data: params,
  })
}

export function deleteAiModelProvider(providerId: number) {
  return request(`/ai-model/providers/${providerId}`, {
    method: RequestEnum.DELETE,
  })
}

export function addAiModel(providerId: number, params: CreateAiModelItemParams) {
  return request(`/ai-model/providers/${providerId}/models`, {
    method: RequestEnum.POST,
    data: params,
  })
}

export function updateAiModel(providerId: number, modelPk: number, params: UpdateAiModelItemParams) {
  return request(`/ai-model/providers/${providerId}/models/${modelPk}`, {
    method: RequestEnum.PUT,
    data: params,
  })
}

export function deleteAiModel(providerId: number, modelPk: number) {
  return request(`/ai-model/providers/${providerId}/models/${modelPk}`, {
    method: RequestEnum.DELETE,
  })
}

export function setDefaultAiModel(providerId: number, modelPk: number) {
  return request(`/ai-model/providers/${providerId}/models/${modelPk}/default`, {
    method: RequestEnum.PUT,
  })
}

export function testAiModelConnection(providerId: number, params: AiModelConnectionTestParams) {
  return request<AiModelConnectionTestResult>(`/ai-model/providers/${providerId}/test-connection`, {
    method: RequestEnum.POST,
    data: params,
  })
}

export function testAiModel(params: AiModelTestParams) {
  return request<AiModelTestResult>(`/ai-model/test-model`, {
    method: RequestEnum.POST,
    data: params,
  })
}

export function infoH5ModelConfig() {
  return request<AiAppModelConfig>('/ai-model/app-configs/h5-outfit', {
    method: RequestEnum.GET,
  })
}

export function updateH5ModelConfig(params: UpdateAiAppModelConfigParams) {
  return request('/ai-model/app-configs/h5-outfit', {
    method: RequestEnum.PUT,
    data: params,
  })
}

export function refreshH5HomeContent() {
  return request<AiAppModelConfig>('/ai-model/app-configs/h5-outfit/daily-refresh', {
    method: RequestEnum.POST,
  })
}

export function refreshH5LoginContent() {
  return request<AiAppModelConfig>('/ai-model/app-configs/h5-outfit/login-refresh', {
    method: RequestEnum.POST,
  })
}
