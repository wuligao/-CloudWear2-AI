import { request } from '@umijs/max'
import { RequestEnum } from '@/enums/httpEnum'
import type { H5StyleArchive, H5StyleProfileUserCard, StyleProfileQueryParams } from './model'
export * from './model'

interface AjaxResponse<T> {
  code?: number
  data?: T
  message?: string
}

export async function queryStyleProfileArchive(params: StyleProfileQueryParams) {
  const response = await request<H5StyleArchive | AjaxResponse<H5StyleArchive>>('/h5-style-profiles/archive', {
    method: RequestEnum.GET,
    params,
  })

  if (isArchiveResponse(response)) return response
  if (isArchiveResponse(response.data)) return response.data

  throw new Error(response.message || '风格档案数据格式不正确。')
}

export async function queryStyleProfileUsers(params: StyleProfileQueryParams) {
  const response = await request<H5StyleProfileUserCard[] | AjaxResponse<H5StyleProfileUserCard[]>>('/h5-style-profiles', {
    method: RequestEnum.GET,
    params,
  })

  if (Array.isArray(response)) return response
  if (Array.isArray(response.data)) return response.data

  throw new Error(response.message || '风格档案用户列表格式不正确。')
}

function isArchiveResponse(value: unknown): value is H5StyleArchive {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'profile' in value &&
      'summary' in value &&
      'stylePreferences' in value,
  )
}
