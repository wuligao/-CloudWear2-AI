import { request } from '@umijs/max'
import { RequestEnum } from '@/enums/httpEnum'
import type {
  AiPromptTemplateModel,
  AiPromptTemplateStats,
  CreateAiPromptTemplateParams,
  ListAiPromptTemplateParams,
  UpdateAiPromptTemplateParams,
} from './model'
export * from './model'

export function listAiPromptTemplates(params: ListAiPromptTemplateParams) {
  return request<Pagination<AiPromptTemplateModel>>('/ai-model/prompts', {
    method: RequestEnum.GET,
    params,
  })
}

export function statsAiPromptTemplates() {
  return request<AiPromptTemplateStats>('/ai-model/prompts/stats', {
    method: RequestEnum.GET,
  })
}

export function infoAiPromptTemplate(promptId: number) {
  return request<AiPromptTemplateModel>(`/ai-model/prompts/${promptId}`, {
    method: RequestEnum.GET,
  })
}

export function addAiPromptTemplate(params: CreateAiPromptTemplateParams) {
  return request('/ai-model/prompts', {
    method: RequestEnum.POST,
    data: params,
  })
}

export function updateAiPromptTemplate(promptId: number, params: UpdateAiPromptTemplateParams) {
  return request(`/ai-model/prompts/${promptId}`, {
    method: RequestEnum.PUT,
    data: params,
  })
}

export function updateAiPromptTemplateStatus(promptId: number, status: string) {
  return request(`/ai-model/prompts/${promptId}/status`, {
    method: RequestEnum.PUT,
    data: { status },
  })
}

export function duplicateAiPromptTemplate(promptId: number) {
  return request<AiPromptTemplateModel>(`/ai-model/prompts/${promptId}/duplicate`, {
    method: RequestEnum.POST,
  })
}

export function useAiPromptTemplate(promptId: number) {
  return request<AiPromptTemplateModel>(`/ai-model/prompts/${promptId}/use`, {
    method: RequestEnum.POST,
  })
}

export function deleteAiPromptTemplates(promptIds: Array<number | string>) {
  return request(`/ai-model/prompts/${promptIds.join(',')}`, {
    method: RequestEnum.DELETE,
  })
}
