import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ConfigService } from '@vivy-common/config'
import { paginate, Pagination } from 'nestjs-typeorm-paginate'
import { Brackets, In, Repository } from 'typeorm'
import { SysUser } from '@/modules/system/user/entities/sys-user.entity'
import type { OutfitGeneration, OutfitPhotoModeContext, OutfitRecommendationContext } from './types/outfit'
import type {
  AdminOutfitRecordListQueryDto,
  CreateOutfitRecordDto,
  OutfitRecordListQueryDto,
  OutfitRecordOwnerDto,
} from './dto/outfit-record.dto'
import { OutfitRecord } from './entities/outfit-record.entity'
import { normalizePersistedOutfitImageUrl, persistOutfitImage, removePersistedOutfitImage } from './outfit-image-storage'

@Injectable()
export class OutfitRecordsService {
  private readonly logger = new Logger(OutfitRecordsService.name)

  constructor(
    @InjectRepository(OutfitRecord)
    private readonly records: Repository<OutfitRecord>,
    @InjectRepository(SysUser)
    private readonly users: Repository<SysUser>,
    private readonly config: ConfigService
  ) {}

  async create(dto: CreateOutfitRecordDto, userId: number) {
    const generation = dto.generation
    this.logger.log({
      event: 'outfit.record.create.start',
      generationId: generation.id,
      source: dto.source || generation.source || (generation.userPhotoUsed ? 'photo' : 'keyword'),
      taskId: generation.taskId || generation.id,
      userId,
    })
    const existingRecord = await this.findExistingRecordForGeneration(userId, generation)
    if (existingRecord) {
      this.logger.log({
        event: 'outfit.record.create.existing_found',
        generationId: generation.id,
        recordId: existingRecord.recordId,
        taskId: generation.taskId || generation.id,
        userId,
      })
      let shouldSaveExistingRecord = false
      if (!existingRecord.userId && userId) {
        existingRecord.userId = userId
        shouldSaveExistingRecord = true
      }
      if (!existingRecord.taskId && generation.taskId) {
        existingRecord.taskId = generation.taskId
        shouldSaveExistingRecord = true
      }
      if (
        (existingRecord.generationDurationMs === undefined || existingRecord.generationDurationMs === null) &&
        generation.generationDurationMs !== undefined
      ) {
        existingRecord.generationDurationMs = generation.generationDurationMs
        shouldSaveExistingRecord = true
      }
      if (!existingRecord.userPhotoUrl && (generation.userPhotoDataUrl || generation.userPhotoUrl)) {
        existingRecord.userPhotoUrl =
          generation.userPhotoUrl
            ? await persistOutfitImage(generation.userPhotoUrl, this.config)
            : generation.userPhotoDataUrl
              ? await persistOutfitImage(generation.userPhotoDataUrl, this.config)
              : undefined
        existingRecord.userPhotoUsed = true
        shouldSaveExistingRecord = true
      }
      if (shouldSaveExistingRecord) {
        const savedExistingRecord = await this.records.save(existingRecord)
        this.logger.log({
          event: 'outfit.record.create.existing_updated',
          recordId: savedExistingRecord.recordId,
          taskId: generation.taskId || generation.id,
          userId,
        })
        return this.toGeneration(savedExistingRecord)
      }
      this.logger.log({
        event: 'outfit.record.create.existing_reused',
        recordId: existingRecord.recordId,
        taskId: generation.taskId || generation.id,
        userId,
      })
      return this.toGeneration(existingRecord)
    }

    const recordSource = dto.source || generation.source || (generation.userPhotoUsed ? 'photo' : 'keyword')
    const userPhotoUrl =
      generation.userPhotoUrl
        ? await persistOutfitImage(generation.userPhotoUrl, this.config)
        : generation.userPhotoDataUrl
          ? await persistOutfitImage(generation.userPhotoDataUrl, this.config)
          : undefined
    if (recordSource === 'photo' && !userPhotoUrl) {
      throw new BadRequestException({ error: '照片生成记录缺少用户上传原图，请重新生成后保存。' })
    }
    this.logger.log({
      event: 'outfit.record.image.persist.start',
      generationId: generation.id,
      taskId: generation.taskId || generation.id,
      userId,
    })
    const imageUrl = await persistOutfitImage(generation.imageUrl, this.config)
    this.logger.log({
      event: 'outfit.record.image.persist.complete',
      generationId: generation.id,
      taskId: generation.taskId || generation.id,
      userId,
    })
    const record = this.records.create({
      userId,
      generationId: generation.id,
      taskId: generation.taskId || generation.id,
      source: recordSource,
      recordStatus: generation.recordStatus || 'succeeded',
      outfitTitle: generation.outfitTitle,
      summary: generation.summary,
      imageUrl,
      totalCount: generation.totalCount || 1,
      successCount: generation.successCount ?? 1,
      failedCount: generation.failedCount ?? 0,
      generationDurationMs: generation.generationDurationMs,
      season: generation.season,
      temperature: generation.temperature,
      weather: generation.weather,
      location: generation.location,
      occasion: generation.occasion,
      style: generation.style,
      colorPreference: generation.colorPreference,
      genderPreference: generation.genderPreference,
      imageModel: generation.imageModel,
      styleTags: JSON.stringify(generation.styleTags),
      items: JSON.stringify(generation.items),
      inputSnapshot: JSON.stringify({
        season: generation.season,
        temperature: generation.temperature,
        weather: generation.weather,
        location: generation.location,
        occasion: generation.occasion,
        style: generation.style,
        colorPreference: generation.colorPreference,
        genderPreference: generation.genderPreference,
        imageModel: generation.imageModel,
        recommendationContext: generation.recommendationContext,
        photoMode: generation.photoMode,
        styleProfileContext: generation.styleProfileContext,
      }),
      temperatureAdvice: generation.temperatureAdvice,
      occasionReason: generation.occasionReason,
      imagePrompt: generation.imagePrompt,
      userPhotoUsed: recordSource === 'photo' && Boolean(userPhotoUrl),
      userPhotoUrl,
      generatedAt: new Date(generation.createdAt),
    })

    const savedRecord = await this.records.save(record)
    this.logger.log({
      event: 'outfit.record.create.complete',
      generationId: generation.id,
      recordId: savedRecord.recordId,
      taskId: generation.taskId || generation.id,
      userId,
    })
    return this.toGeneration(savedRecord)
  }

  private async findExistingRecordForGeneration(userId: number, generation: CreateOutfitRecordDto['generation']) {
    const parsedRecordId = Number(generation.id)
    if (Number.isSafeInteger(parsedRecordId) && parsedRecordId > 0) {
      const existingRecord = await this.records.findOne({
        where: { recordId: parsedRecordId, userId },
      })
      if (existingRecord) return existingRecord
    }

    return this.records.findOne({
      where: { userId, generationId: generation.id },
    })
  }

  async list(query: OutfitRecordListQueryDto, userId: number) {
    const builder = this.records
      .createQueryBuilder('record')
      .where('record.user_id = :userId', { userId })
      .orderBy('record.create_time', 'DESC')
      .take(100)

    if (query.status && query.status !== 'all') {
      builder.andWhere('record.record_status = :status', { status: query.status })
    }

    if (query.keyword) {
      builder.andWhere(
        new Brackets((keywordBuilder) => {
          keywordBuilder
            .where('record.outfit_title LIKE :keyword')
            .orWhere('record.summary LIKE :keyword')
            .orWhere('record.occasion LIKE :keyword')
            .orWhere('record.style LIKE :keyword')
            .orWhere('record.generation_id LIKE :keyword')
            .orWhere('record.task_id LIKE :keyword')
        })
      )
      builder.setParameter('keyword', `%${query.keyword}%`)
    }

    const [records, summaryRows] = await Promise.all([
      builder.getMany(),
      this.records
        .createQueryBuilder('record')
        .select('record.record_status', 'status')
        .addSelect('COUNT(1)', 'count')
        .where('record.user_id = :userId', { userId })
        .groupBy('record.record_status')
        .getRawMany<{ status: string; count: string }>(),
    ])
    const summary = {
      all: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
    }
    summaryRows.forEach((row) => {
      const count = Number(row.count)
      if (row.status in summary) {
        summary[row.status as keyof typeof summary] = count
      }
      summary.all += count
    })

    return {
      items: records.map((record) => this.toGeneration(record)),
      summary,
    }
  }

  async adminList(query: AdminOutfitRecordListQueryDto): Promise<Pagination<OutfitRecord>> {
    const builder = this.records
      .createQueryBuilder('record')
      .leftJoin(SysUser, 'user', 'user.user_id = record.user_id')
      .orderBy('record.create_time', 'DESC')

    if (query.source && query.source !== 'all') {
      builder.andWhere('record.source = :source', { source: query.source })
    }

    if (query.status && query.status !== 'all') {
      builder.andWhere('record.record_status = :status', { status: query.status })
    }

    if (query.userPhotoUsed === '1' || query.userPhotoUsed === 'true') {
      builder.andWhere('record.user_photo_used = :userPhotoUsed', { userPhotoUsed: 1 })
    } else if (query.userPhotoUsed === '0' || query.userPhotoUsed === 'false') {
      builder.andWhere('record.user_photo_used = :userPhotoUsed', { userPhotoUsed: 0 })
    }

    if (Array.isArray(query.createTime) && query.createTime.length >= 2) {
      builder.andWhere('record.create_time BETWEEN :startTime AND :endTime', {
        startTime: query.createTime[0],
        endTime: query.createTime[1],
      })
    }

    if (query.keyword) {
      builder.andWhere(
        new Brackets((keywordBuilder) => {
          keywordBuilder
            .where('record.outfit_title LIKE :keyword')
            .orWhere('record.summary LIKE :keyword')
            .orWhere('record.occasion LIKE :keyword')
            .orWhere('record.style LIKE :keyword')
            .orWhere('record.generation_id LIKE :keyword')
            .orWhere('record.task_id LIKE :keyword')
            .orWhere('record.image_model LIKE :keyword')
            .orWhere('CAST(record.user_id AS CHAR) LIKE :keyword')
            .orWhere('user.user_name LIKE :keyword')
            .orWhere('user.nick_name LIKE :keyword')
            .orWhere('user.phonenumber LIKE :keyword')
        })
      )
      builder.setParameter('keyword', `%${query.keyword}%`)
    }

    const page = await paginate<OutfitRecord>(builder, {
      page: query.page,
      limit: query.limit,
    })
    await this.attachUsers(page.items)

    return page
  }

  private async attachUsers(records: OutfitRecord[]) {
    const userIds = records.map((record) => record.userId).filter((userId): userId is number => Boolean(userId))
    if (!userIds.length) return

    const users = await this.users.find({
      where: { userId: In([...new Set(userIds)]) },
      select: ['userId', 'userName', 'nickName', 'avatar'],
    })
    const userMap = new Map(users.map((user) => [Number(user.userId), user]))
    records.forEach((record) => {
      const user = userMap.get(Number(record.userId))
      if (!user) return
      Object.assign(record, {
        userName: user.userName,
        nickName: user.nickName,
        avatar: user.avatar,
      })
    })
  }

  async adminDelete(recordId: number) {
    const record = await this.records.findOne({
      where: { recordId },
    })
    if (!record) throw new NotFoundException({ error: '穿搭记录不存在或已删除。' })

    await this.records.delete({ recordId })
    await removePersistedOutfitImage(record.imageUrl, this.config)
    if (record.userPhotoUrl) {
      await removePersistedOutfitImage(record.userPhotoUrl, this.config)
    }
    return { success: true }
  }

  async info(recordId: number, owner: OutfitRecordOwnerDto, userId: number) {
    void owner
    const record = await this.records.findOne({
      where: { recordId, userId },
    })
    if (!record) throw new NotFoundException({ error: '穿搭记录不存在或已删除。' })

    return this.toGeneration(record)
  }

  async delete(recordId: number, owner: OutfitRecordOwnerDto, userId: number) {
    void owner
    const record = await this.records.findOne({
      where: { recordId, userId },
    })
    if (!record) throw new NotFoundException({ error: '穿搭记录不存在或已删除。' })

    await this.records.delete({ recordId, userId })
    await removePersistedOutfitImage(record.imageUrl, this.config)
    if (record.userPhotoUrl) {
      await removePersistedOutfitImage(record.userPhotoUrl, this.config)
    }
    return { success: true }
  }

  private toGeneration(record: OutfitRecord): OutfitGeneration {
    const inputSnapshot = this.parseJson<{
      photoMode?: OutfitPhotoModeContext
      recommendationContext?: OutfitRecommendationContext
      styleProfileContext?: OutfitGeneration['styleProfileContext']
    }>(record.inputSnapshot, {})

    return {
      id: String(record.recordId),
      taskId: record.taskId || record.generationId || String(record.recordId),
      source: record.source === 'photo' ? 'photo' : 'keyword',
      recordStatus: this.normalizeStatus(record.recordStatus),
      totalCount: record.totalCount,
      successCount: record.successCount,
      failedCount: record.failedCount,
      generationDurationMs: record.generationDurationMs,
      season: record.season,
      temperature: record.temperature,
      weather: record.weather,
      location: record.location,
      occasion: record.occasion,
      style: record.style,
      colorPreference: record.colorPreference,
      genderPreference: record.genderPreference,
      imageModel: record.imageModel,
      recommendationContext: this.normalizeRecommendationContext(inputSnapshot.recommendationContext),
      photoMode: this.normalizePhotoMode(inputSnapshot.photoMode),
      styleProfileContext: inputSnapshot.styleProfileContext,
      outfitTitle: record.outfitTitle,
      summary: record.summary,
      styleTags: this.parseJson<string[]>(record.styleTags, []),
      temperatureAdvice: record.temperatureAdvice,
      occasionReason: record.occasionReason,
      items: this.parseJson(record.items, []),
      imagePrompt: record.imagePrompt,
      imageUrl: normalizePersistedOutfitImageUrl(record.imageUrl, this.config) || record.imageUrl,
      userPhotoUsed: Boolean(record.userPhotoUsed),
      userPhotoUrl: normalizePersistedOutfitImageUrl(record.userPhotoUrl, this.config),
      createdAt: record.generatedAt.toISOString(),
    }
  }

  private parseJson<T>(value: string | undefined, fallback: T): T {
    if (!value) return fallback
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }

  private normalizeStatus(status: string): 'running' | 'succeeded' | 'failed' {
    if (status === 'running' || status === 'failed') return status

    return 'succeeded'
  }

  private normalizeRecommendationContext(value: unknown): OutfitRecommendationContext | undefined {
    if (!value || typeof value !== 'object') return undefined
    const context = value as Partial<OutfitRecommendationContext>
    if (context.kind !== 'weather') return undefined
    if (context.periodLabel !== '今日' && context.periodLabel !== '明日') return undefined

    return {
      kind: 'weather',
      periodLabel: context.periodLabel,
      sourceLabel: typeof context.sourceLabel === 'string' ? context.sourceLabel : undefined,
      forecastDateKey: typeof context.forecastDateKey === 'string' ? context.forecastDateKey : undefined,
      summary: typeof context.summary === 'string' ? context.summary : undefined,
      weather: typeof context.weather === 'string' ? context.weather : undefined,
      temperature: typeof context.temperature === 'number' ? context.temperature : undefined,
      highTemperature: typeof context.highTemperature === 'number' ? context.highTemperature : undefined,
      lowTemperature: typeof context.lowTemperature === 'number' ? context.lowTemperature : undefined,
      precipitationProbability:
        typeof context.precipitationProbability === 'number' ? context.precipitationProbability : undefined,
      location: typeof context.location === 'string' ? context.location : undefined,
      scenarioTaskId: typeof context.scenarioTaskId === 'string' ? context.scenarioTaskId : undefined,
      title: typeof context.title === 'string' ? context.title : undefined,
    }
  }

  private normalizePhotoMode(value: unknown): OutfitPhotoModeContext | undefined {
    if (!value || typeof value !== 'object') return undefined
    const mode = value as Partial<OutfitPhotoModeContext>
    if (typeof mode.id !== 'string' || typeof mode.label !== 'string' || typeof mode.prompt !== 'string') {
      return undefined
    }

    return {
      id: mode.id,
      label: mode.label,
      prompt: mode.prompt,
    }
  }

}
