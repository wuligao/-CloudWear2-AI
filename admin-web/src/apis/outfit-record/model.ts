export interface OutfitRecordModel extends BaseBusinessEntity {
  recordId: number
  userId?: number
  generationId?: string
  taskId?: string
  source: 'keyword' | 'photo' | string
  recordStatus: 'running' | 'succeeded' | 'failed' | string
  outfitTitle: string
  summary: string
  imageUrl: string
  totalCount: number
  successCount: number
  failedCount: number
  season: string
  temperature: number
  weather: string
  location: string
  occasion: string
  style: string
  colorPreference?: string
  genderPreference?: string
  imageModel?: string
  styleTags: string
  items: string
  inputSnapshot?: string
  temperatureAdvice: string
  occasionReason: string
  imagePrompt: string
  userPhotoUsed: boolean | number
  userPhotoUrl?: string
  generatedAt: string
  userName?: string
  nickName?: string
  avatar?: string
  resultImages?: string[]
  failReason?: string
}

export interface ListOutfitRecordParams extends PaginateParams {
  source?: 'all' | 'keyword' | 'photo'
  status?: 'all' | 'running' | 'succeeded' | 'failed'
  userPhotoUsed?: string
  keyword?: string
  createTime?: string[]
}
