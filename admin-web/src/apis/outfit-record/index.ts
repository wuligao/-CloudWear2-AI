import { request } from '@umijs/max'
import { RequestEnum } from '@/enums/httpEnum'
import type { ListOutfitRecordParams, OutfitRecordModel } from './model'
export * from './model'

export function listOutfitRecord(params: ListOutfitRecordParams) {
  return request<Pagination<OutfitRecordModel>>('/outfit-records', {
    method: RequestEnum.GET,
    params,
  })
}

export function deleteOutfitRecord(recordId: React.Key) {
  return request(`/outfit-records/${recordId}`, {
    method: RequestEnum.DELETE,
  })
}
