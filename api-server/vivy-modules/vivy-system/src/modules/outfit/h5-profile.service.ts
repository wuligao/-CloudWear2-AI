import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ConfigService } from '@vivy-common/config'
import { Brackets, Repository } from 'typeorm'
import { SysUser } from '@/modules/system/user/entities/sys-user.entity'
import { AiModelService } from '../ai-model/ai-model.service'
import { H5StyleProfile } from './entities/h5-style-profile.entity'
import { OutfitRecord } from './entities/outfit-record.entity'
import { H5StyleProfileDto } from './h5-profile.dto'
import {
  buildH5ProfileOverview,
  buildH5StyleArchive,
  H5ProfileRecordSummary,
  H5StyleProfileInput,
  H5ProfileUserInput,
} from './h5-profile-overview'
import { normalizePersistedOutfitImageUrl } from './outfit-image-storage'

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
    const entity = this.styleProfiles.merge(current || this.styleProfiles.create(), {
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

function stringifyObject(value?: Record<string, unknown>) {
  return JSON.stringify(value || {})
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
