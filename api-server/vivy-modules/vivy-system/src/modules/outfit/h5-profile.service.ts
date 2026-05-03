import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ConfigService } from '@vivy-common/config'
import { Brackets, Repository } from 'typeorm'
import { SysUser } from '@/modules/system/user/entities/sys-user.entity'
import { AiModelService } from '../ai-model/ai-model.service'
import { H5StyleProfile } from './entities/h5-style-profile.entity'
import { OutfitRecord } from './entities/outfit-record.entity'
import { H5StyleProfileDto, H5StyleProfileFeedbackDto, H5StyleProfilePhotoAnalysisDto } from './h5-profile.dto'
import {
  buildH5ProfileOverview,
  buildH5StyleArchive,
  H5ProfileRecordSummary,
  H5StyleProfileInput,
  H5ProfileUserInput,
} from './h5-profile-overview'
import { analyzeStyleProfilePhoto, StyleProfileAnalysisResult } from './ai/openai'
import { normalizePersistedOutfitImageUrl, persistOutfitImage } from './outfit-image-storage'

type H5StylePhotoType = 'fullBody' | 'face' | 'makeupFree'
type H5StylePhotoMap = Partial<Record<H5StylePhotoType, { url: string; updatedAt?: string }>>

@Injectable()
export class H5ProfileService {
  constructor(
    @InjectRepository(OutfitRecord)
    private readonly records: Repository<OutfitRecord>,
    @InjectRepository(H5StyleProfile)
    private readonly styleProfiles: Repository<H5StyleProfile>,
    @InjectRepository(SysUser)
    private readonly users: Repository<SysUser>,
    private readonly aiModelService: AiModelService,
    private readonly config: ConfigService
  ) {}

  async overview(userId: number) {
    const [recordSummary, generatedToday, records, user, styleProfile, dailyLimit] = await Promise.all([
      this.getRecordSummary(userId),
      this.countTodayRecords(userId),
      this.getArchiveRecords({ userId }),
      this.getProfileUser(userId),
      this.findStyleProfile({ userId }),
      this.aiModelService.getH5DailyFreeGenerationLimit(),
    ])

    const archiveUser = this.toArchiveUser(user)
    return buildH5ProfileOverview({
      ...archiveUser,
      dailyLimit,
      generatedToday,
      recordSummary,
      archive: buildH5StyleArchive(this.normalizeRecordImageUrls(records), archiveUser, this.toStyleProfileInput(styleProfile)),
    })
  }

  async styleProfile(userId: number) {
    return this.toStyleProfileResponse(await this.findStyleProfile({ userId }), userId)
  }

  async upsertStyleProfile(dto: H5StyleProfileDto, userId: number) {
    const current = await this.findStyleProfile({ userId })
    const patch: Partial<H5StyleProfile> = {
      userId,
      height: dto.height,
      weight: dto.weight,
      clothingSize: dto.clothingSize,
      shoeSize: dto.shoeSize,
      favoriteStyles: stringifyList(dto.favoriteStyles),
      favoriteColors: stringifyList(dto.favoriteColors),
      avoidColors: stringifyList(dto.avoidColors),
      commonOccasions: stringifyList(dto.commonOccasions),
      elementPreferences: stringifyList(dto.elementPreferences),
      fitPreferences: stringifyList(dto.fitPreferences),
      bodyMetrics: stringifyObject(dto.bodyMetrics),
      notes: dto.notes,
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'basePhotos')) {
      patch.basePhotos = stringifyObject(dto.basePhotos)
    }
    if (Object.prototype.hasOwnProperty.call(dto, 'analysisReport')) {
      patch.analysisReport = stringifyObject(dto.analysisReport)
    }
    if (Object.prototype.hasOwnProperty.call(dto, 'recommendedColors')) {
      patch.recommendedColors = stringifyObject(dto.recommendedColors)
    }
    if (Object.prototype.hasOwnProperty.call(dto, 'recommendedStyles')) {
      patch.recommendedStyles = stringifyObject(dto.recommendedStyles)
    }
    if (Object.prototype.hasOwnProperty.call(dto, 'analysisUpdatedAt')) {
      patch.analysisUpdatedAt = dto.analysisUpdatedAt ? new Date(dto.analysisUpdatedAt) : undefined
    }

    const entity = this.styleProfiles.merge(current || this.styleProfiles.create(), patch)

    return this.toStyleProfileResponse(await this.styleProfiles.save(entity), userId)
  }

  async analyzeStyleProfilePhoto(dto: H5StyleProfilePhotoAnalysisDto, userId: number) {
    const current = await this.findStyleProfile({ userId })
    const currentInput = this.toStyleProfileInput(current)
    const aiConfig = {
      ...this.config.get('outfitAi', {}),
      ...(await this.aiModelService.getH5RuntimeConfig(undefined, true)),
    }
    const [analysis, photoUrl] = await Promise.all([
      analyzeStyleProfilePhoto(
        {
          photoType: dto.photoType,
          photoDataUrl: dto.photoDataUrl,
          currentProfile: currentInput,
        },
        aiConfig
      ),
      persistOutfitImage(dto.photoDataUrl, this.config),
    ])
    const now = new Date()
    const basePhotos: H5StylePhotoMap = {
      ...parseJson<H5StylePhotoMap>(current?.basePhotos, {}),
      [dto.photoType]: {
        url: photoUrl,
        updatedAt: now.toISOString(),
      },
    }
    const entity = this.styleProfiles.merge(current || this.styleProfiles.create(), {
      userId,
      basePhotos: stringifyObject(basePhotos),
      analysisReport: stringifyObject(analysis.analysisReport),
      recommendedColors: stringifyObject(analysis.recommendedColors),
      recommendedStyles: stringifyObject(analysis.recommendedStyles),
      analysisUpdatedAt: now,
      favoriteStyles: stringifyList(mergeLists(currentInput.favoriteStyles, analysis.profileUpdates.favoriteStyles)),
      favoriteColors: stringifyList(mergeLists(currentInput.favoriteColors, analysis.profileUpdates.favoriteColors)),
      avoidColors: stringifyList(mergeLists(currentInput.avoidColors, analysis.profileUpdates.avoidColors)),
      elementPreferences: stringifyList(mergeLists(currentInput.elementPreferences, analysis.profileUpdates.elementPreferences)),
      fitPreferences: stringifyList(mergeLists(currentInput.fitPreferences, analysis.profileUpdates.fitPreferences)),
      notes: mergeAnalysisNotes(currentInput.notes, analysis),
    })

    return this.toStyleProfileResponse(await this.styleProfiles.save(entity), userId)
  }

  async applyStyleProfileFeedback(dto: H5StyleProfileFeedbackDto, userId: number) {
    const current = await this.findStyleProfile({ userId })
    const currentInput = this.toStyleProfileInput(current)
    const updates = buildFeedbackProfileUpdates(dto)
    const entity = this.styleProfiles.merge(current || this.styleProfiles.create(), {
      userId,
      favoriteStyles: stringifyList(mergeLists(currentInput.favoriteStyles, updates.favoriteStyles)),
      favoriteColors: stringifyList(mergeLists(currentInput.favoriteColors, updates.favoriteColors)),
      avoidColors: stringifyList(mergeLists(currentInput.avoidColors, updates.avoidColors)),
      commonOccasions: stringifyList(mergeLists(currentInput.commonOccasions, updates.commonOccasions)),
      elementPreferences: stringifyList(mergeLists(currentInput.elementPreferences, updates.elementPreferences)),
      fitPreferences: stringifyList(mergeLists(currentInput.fitPreferences, updates.fitPreferences)),
      notes: mergeFeedbackNote(currentInput.notes, dto),
    })

    return this.toStyleProfileResponse(await this.styleProfiles.save(entity), userId)
  }

  async adminCards(query: { userId?: string; keyword?: string }) {
    const parsedUserId = this.parseAdminUserId(query.userId)
    const keyword = query.keyword?.trim()

    const [recordCandidates, profileCandidates] = await Promise.all([
      this.getRecordCandidates({
        keyword,
        userId: parsedUserId,
      }),
      this.getStyleProfileCandidates({
        keyword,
        userId: parsedUserId,
      }),
    ])

    const candidates = new Map<number, { userId: number }>()
    const addCandidate = (userId?: number) => {
      if (!userId) return
      if (!candidates.has(userId)) candidates.set(userId, { userId })
    }

    profileCandidates.forEach((profile) => addCandidate(profile.userId))
    recordCandidates.forEach((record) => addCandidate(record.userId))

    const cards = await Promise.all(
      Array.from(candidates.values())
        .slice(0, 36)
        .map(async (candidate) => {
          const [records, user, styleProfile] = await Promise.all([
            this.getArchiveRecords(candidate),
            this.getProfileUser(candidate.userId),
            this.findStyleProfile(candidate),
          ])
          const archiveUser = this.toArchiveUser(user)
          const archive = buildH5StyleArchive(records, archiveUser, this.toStyleProfileInput(styleProfile))
          const firstRecord = records[0]
          return {
            id: `user-${candidate.userId}`,
            userId: candidate.userId,
            displayName: archive.profile.displayName || '云裳用户',
            avatar: archive.profile.avatar || archive.inspiration[0]?.imageUrl,
            statusLabel: archive.profile.statusLabel,
            recordCount: archive.summary.recordCount,
            photoRecordCount: archive.summary.photoRecordCount,
            styleCount: archive.stylePreferences.length,
            colorCount: archive.colorPreferences.length,
            elementCount: archive.elementPreferences.length,
            inspirationCount: archive.inspiration.length,
            topStyles: archive.stylePreferences.slice(0, 3).map((item) => item.label),
            updatedAt: archive.summary.updatedAt || toIsoDate(firstRecord?.updateTime) || toIsoDate(styleProfile?.updateTime),
          }
        })
    )

    return cards.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
  }

  async adminArchive(query: { userId?: string }) {
    const parsedUserId = this.parseAdminUserId(query.userId)
    if (!parsedUserId) {
      throw new BadRequestException({ error: '请输入用户ID。' })
    }

    const [records, user, styleProfile] = await Promise.all([
      this.getArchiveRecords({ userId: parsedUserId }),
      this.getProfileUser(parsedUserId),
      this.findStyleProfile({ userId: parsedUserId }),
    ])
    if (!records.length && !styleProfile) {
      throw new NotFoundException({ error: '未查询到该用户的风格档案记录。' })
    }

    const archiveUser = this.toArchiveUser(user)
    return buildH5StyleArchive(records, archiveUser, this.toStyleProfileInput(styleProfile))
  }

  private parseAdminUserId(rawUserId?: string) {
    const parsedUserId = rawUserId ? Number(rawUserId) : undefined
    if (rawUserId && (!Number.isSafeInteger(parsedUserId) || Number(parsedUserId) <= 0)) {
      throw new BadRequestException({ error: '用户ID格式不正确。' })
    }

    return parsedUserId
  }

  private async getRecordCandidates({
    keyword,
    userId,
  }: {
    keyword?: string
    userId?: number
  }) {
    const builder = this.records.createQueryBuilder('record')

    this.applyRecordLookup(builder, { keyword, userId })
    return builder.orderBy('record.update_time', 'DESC').addOrderBy('record.create_time', 'DESC').take(120).getMany()
  }

  private async getStyleProfileCandidates({
    keyword,
    userId,
  }: {
    keyword?: string
    userId?: number
  }) {
    const builder = this.styleProfiles.createQueryBuilder('profile')
    const hasCondition = Boolean(userId || keyword)

    if (hasCondition) {
      builder.where(
        new Brackets((whereBuilder) => {
          let hasWhere = false
          if (userId) {
            whereBuilder[hasWhere ? 'orWhere' : 'where']('profile.user_id = :userId', { userId })
            hasWhere = true
          }
          if (keyword) {
            whereBuilder[hasWhere ? 'orWhere' : 'where'](
              [
                'profile.favorite_styles LIKE :keyword',
                'profile.favorite_colors LIKE :keyword',
                'profile.element_preferences LIKE :keyword',
                'profile.notes LIKE :keyword',
              ].join(' OR '),
              { keyword: `%${keyword}%` }
            )
          }
        })
      )
    }

    return builder.orderBy('profile.update_time', 'DESC').take(80).getMany()
  }

  private applyRecordLookup(
    builder: ReturnType<Repository<OutfitRecord>['createQueryBuilder']>,
    {
      keyword,
      userId,
    }: {
      keyword?: string
      userId?: number
    }
  ) {
    const hasCondition = Boolean(userId || keyword)
    if (!hasCondition) return

    builder.where(
      new Brackets((whereBuilder) => {
        let hasWhere = false
        if (userId) {
          whereBuilder[hasWhere ? 'orWhere' : 'where']('record.user_id = :userId', { userId })
          hasWhere = true
        }
        if (keyword) {
          const keywordAsNumber = Number(keyword)
          whereBuilder[hasWhere ? 'orWhere' : 'where'](
            [
              'record.outfit_title LIKE :keyword',
              'record.style LIKE :keyword',
              'record.occasion LIKE :keyword',
              'record.task_id LIKE :keyword',
              Number.isSafeInteger(keywordAsNumber) ? 'record.user_id = :keywordUserId' : '1 = 0',
            ].join(' OR '),
            {
              keyword: `%${keyword}%`,
              keywordUserId: Number.isSafeInteger(keywordAsNumber) ? keywordAsNumber : -1,
            }
          )
        }
      })
    )
  }

  private async getRecordSummary(userId: number): Promise<H5ProfileRecordSummary> {
    const rows = await this.records
      .createQueryBuilder('record')
      .select('record.record_status', 'status')
      .addSelect('COUNT(1)', 'count')
      .where('record.user_id = :userId', { userId })
      .groupBy('record.record_status')
      .getRawMany<{ status: string; count: string }>()

    const summary: H5ProfileRecordSummary = {
      all: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
    }

    rows.forEach((row) => {
      const count = Number(row.count)
      if (row.status === 'running' || row.status === 'succeeded' || row.status === 'failed') {
        summary[row.status] = Number.isFinite(count) ? count : 0
      } else {
        summary.succeeded += Number.isFinite(count) ? count : 0
      }
      summary.all += Number.isFinite(count) ? count : 0
    })

    return summary
  }

  private async countTodayRecords(userId: number) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const row = await this.records
      .createQueryBuilder('record')
      .select('COALESCE(SUM(record.success_count), 0)', 'count')
      .where('record.user_id = :userId', { userId })
      .andWhere('record.create_time >= :start', { start })
      .andWhere('record.create_time < :end', { end })
      .andWhere('record.record_status != :failedStatus', { failedStatus: 'failed' })
      .getRawOne<{ count: string }>()

    const count = Number(row?.count)
    return Number.isFinite(count) ? count : 0
  }

  private async getArchiveRecords({
    userId,
  }: {
    userId?: number
  }) {
    const builder = this.records
      .createQueryBuilder('record')
      .where('record.user_id = :userId', { userId })
      .orderBy('record.generated_at', 'DESC')
      .addOrderBy('record.create_time', 'DESC')
      .take(80)

    return builder.getMany()
  }

  private async getProfileUser(userId?: number) {
    if (!userId) return null

    return this.users.findOne({
      where: { userId },
      select: ['userId', 'userName', 'nickName', 'avatar'],
    })
  }

  private async findStyleProfile({
    userId,
  }: {
    userId?: number
  }) {
    if (!userId) return null

    const builder = this.styleProfiles
      .createQueryBuilder('profile')
      .where('profile.user_id = :userId', { userId })

    builder.orderBy('profile.update_time', 'DESC')

    return builder.getOne()
  }

  private toStyleProfileInput(profile: H5StyleProfile | null): H5StyleProfileInput {
    if (!profile) return {}

    return {
      height: profile.height,
      weight: profile.weight,
      clothingSize: profile.clothingSize,
      shoeSize: profile.shoeSize,
      favoriteStyles: parseJson(profile.favoriteStyles, []),
      favoriteColors: parseJson(profile.favoriteColors, []),
      avoidColors: parseJson(profile.avoidColors, []),
      commonOccasions: parseJson(profile.commonOccasions, []),
      elementPreferences: parseJson(profile.elementPreferences, []),
      fitPreferences: parseJson(profile.fitPreferences, []),
      bodyMetrics: parseJson(profile.bodyMetrics, {}),
      basePhotos: parseJson(profile.basePhotos, {}),
      analysisReport: parseJson(profile.analysisReport, undefined),
      recommendedColors: parseJson(profile.recommendedColors, []),
      recommendedStyles: parseJson(profile.recommendedStyles, []),
      analysisUpdatedAt: toIsoDate(profile.analysisUpdatedAt),
      notes: profile.notes,
    }
  }

  private toStyleProfileResponse(profile: H5StyleProfile | null, userId: number) {
    const input = this.toStyleProfileInput(profile)

    return {
      profileId: profile?.profileId,
      userId: profile?.userId || userId,
      height: input.height || '',
      weight: input.weight || '',
      clothingSize: input.clothingSize || '',
      shoeSize: input.shoeSize || '',
      favoriteStyles: input.favoriteStyles || [],
      favoriteColors: input.favoriteColors || [],
      avoidColors: input.avoidColors || [],
      commonOccasions: input.commonOccasions || [],
      elementPreferences: input.elementPreferences || [],
      fitPreferences: input.fitPreferences || [],
      bodyMetrics: input.bodyMetrics || {},
      basePhotos: normalizeStylePhotoUrls(input.basePhotos, this.config),
      analysisReport: input.analysisReport,
      recommendedColors: input.recommendedColors || [],
      recommendedStyles: input.recommendedStyles || [],
      analysisUpdatedAt: input.analysisUpdatedAt || toIsoDate(profile?.analysisUpdatedAt),
      completionPercent: calculateStyleProfileCompletion(input),
      notes: input.notes || '',
      updatedAt: profile?.updateTime,
    }
  }

  private toArchiveUser(user: Pick<SysUser, 'userName' | 'nickName' | 'avatar'> | null): H5ProfileUserInput {
    return {
      displayName: user?.nickName || user?.userName,
      avatar: normalizePersistedOutfitImageUrl(user?.avatar, this.config),
      memberLevel: '风格档案中',
    }
  }

  private normalizeRecordImageUrls(records: OutfitRecord[]) {
    records.forEach((record) => {
      record.imageUrl = normalizePersistedOutfitImageUrl(record.imageUrl, this.config) || record.imageUrl
      record.userPhotoUrl = normalizePersistedOutfitImageUrl(record.userPhotoUrl, this.config)
    })

    return records
  }

}

function stringifyList(value?: string[]) {
  return JSON.stringify(value || [])
}

function stringifyObject(value?: unknown) {
  return JSON.stringify(value || {})
}

function mergeLists(current: string[] = [], next: string[] = []) {
  return Array.from(new Set([...current, ...next].map((item) => item.trim()).filter(Boolean))).slice(0, 16)
}

function mergeAnalysisNotes(currentNotes: string | undefined, analysis: StyleProfileAnalysisResult) {
  const analysisNote = analysis.profileUpdates.notes?.trim()
  if (!analysisNote) return currentNotes
  if (!currentNotes) return analysisNote
  if (currentNotes.includes(analysisNote)) return currentNotes

  return `${currentNotes}\nAI分析：${analysisNote}`.slice(0, 500)
}

function buildFeedbackProfileUpdates(dto: H5StyleProfileFeedbackDto) {
  const generation = dto.generation
  const feedback = dto.feedback
  const liked = feedback === '喜欢这套'
  const categories = generation.items.map((item) => item.category).filter(Boolean) as string[]
  const itemNames = generation.items.map((item) => item.name).filter(Boolean) as string[]

  return {
    favoriteStyles: liked
      ? normalizeFeedbackList([
          generation.style,
          ...(generation.styleTags || []),
          generation.photoMode?.label,
          generation.recommendationContext?.title,
        ])
      : normalizeFeedbackList([generation.style]),
    favoriteColors: liked ? normalizeFeedbackList([generation.colorPreference]) : [],
    avoidColors: feedback === '颜色不适合' ? normalizeFeedbackList([generation.colorPreference]) : [],
    commonOccasions: liked ? normalizeFeedbackList([generation.occasion]) : [],
    elementPreferences:
      feedback === '太普通'
        ? normalizeFeedbackList(['更有设计感', '层次感', ...categories.slice(0, 3), ...itemNames.slice(0, 2)])
        : liked
          ? normalizeFeedbackList([...categories.slice(0, 4), ...itemNames.slice(0, 2)])
          : [],
    fitPreferences: feedback === '想更显瘦' ? ['显瘦', '纵向线条', '比例优化'] : [],
  }
}

function mergeFeedbackNote(currentNotes: string | undefined, dto: H5StyleProfileFeedbackDto) {
  const title = dto.generation.outfitTitle || dto.generation.style || '当前穿搭'
  const note = `结果反馈：${dto.feedback}（${title}）`
  if (!currentNotes) return note
  if (currentNotes.includes(note)) return currentNotes

  return `${currentNotes}\n${note}`.slice(0, 500)
}

function normalizeFeedbackList(values: Array<string | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && value !== '不限' && value !== '不限场景'))
    .slice(0, 8)
}

function normalizeStylePhotoUrls(basePhotos: H5StyleProfileInput['basePhotos'] = {}, config: ConfigService) {
  return Object.fromEntries(
    Object.entries(basePhotos)
      .map(([key, value]) => [
        key,
        value
          ? {
              ...value,
              url: normalizePersistedOutfitImageUrl(value.url, config) || value.url,
            }
          : undefined,
      ])
      .filter(([, value]) => Boolean(value))
  )
}

function calculateStyleProfileCompletion(profile: H5StyleProfileInput) {
  const checks = [
    profile.height,
    profile.weight,
    profile.clothingSize,
    profile.shoeSize,
    profile.favoriteStyles?.length,
    profile.favoriteColors?.length,
    profile.commonOccasions?.length,
    profile.elementPreferences?.length,
    profile.fitPreferences?.length,
    profile.bodyMetrics?.shoulder || profile.bodyMetrics?.waist || profile.bodyMetrics?.hip,
    profile.basePhotos?.fullBody?.url,
    profile.basePhotos?.face?.url,
    profile.basePhotos?.makeupFree?.url,
    profile.analysisReport,
    profile.recommendedColors?.length,
    profile.recommendedStyles?.length,
  ]
  const done = checks.filter(Boolean).length

  return Math.min(100, Math.max(0, Math.round((done / checks.length) * 100)))
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toIsoDate(value?: Date | string | null) {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : value
}
