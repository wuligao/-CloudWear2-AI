import OpenAI from 'openai'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ServiceException } from '@vivy-common/core'
import { Repository } from 'typeorm'
import { AiModelService } from '../ai-model/ai-model.service'
import type { H5OutfitOptionConfig, H5OutfitOptionItem } from '../ai-model/h5-outfit-options'
import { H5ChatMessage } from './entities/h5-chat-message.entity'
import { H5ChatSession } from './entities/h5-chat-session.entity'
import { H5StyleProfile } from './entities/h5-style-profile.entity'
import { OutfitRecord } from './entities/outfit-record.entity'
import {
  buildH5ChatSystemPrompt,
  parseH5ChatAssistantResponse,
  type H5ChatAssistantResponse,
  type H5ChatProfileContext,
  type H5ChatRecordContext,
} from './h5-chat-agent'
import type { H5ChatCreateSessionDto, H5ChatSendMessageDto } from './h5-chat.dto'

@Injectable()
export class H5ChatService {
  constructor(
    @InjectRepository(H5ChatSession)
    private readonly sessions: Repository<H5ChatSession>,
    @InjectRepository(H5ChatMessage)
    private readonly messages: Repository<H5ChatMessage>,
    @InjectRepository(H5StyleProfile)
    private readonly styleProfiles: Repository<H5StyleProfile>,
    @InjectRepository(OutfitRecord)
    private readonly outfitRecords: Repository<OutfitRecord>,
    private readonly aiModelService: AiModelService
  ) {}

  async bootstrap() {
    const options = (await this.aiModelService.infoH5Config()).options
    return {
      enabled: options.chatAssistant.enabled,
      welcomeMessage: options.chatAssistant.welcomeMessage,
      quickPrompts: options.chatAssistant.quickPrompts,
      dailyLimit: options.chatAssistant.dailyLimit,
    }
  }

  async listSessions(userId: number) {
    const sessions = await this.sessions.find({
      where: { userId },
      order: { updateTime: 'DESC' },
      take: 20,
    })

    return sessions.map((session) => this.toSessionVo(session))
  }

  async createSession(dto: H5ChatCreateSessionDto, userId: number) {
    const title = dto.title?.trim() || 'AI 穿搭顾问'
    const created = this.sessions.create({
      userId,
      sessionTitle: title.slice(0, 80),
      messageCount: 0,
      sessionStatus: 'active',
      createBy: 'h5',
    })
    await this.sessions.insert(created)
    const session = await this.sessions.findOne({
      where: { userId },
      order: { sessionId: 'DESC' },
    })
    if (!session) throw new ServiceException('对话会话创建失败')

    return this.toSessionVo(session)
  }

  async listMessages(sessionId: number, userId: number) {
    await this.ensureSession(sessionId, userId)
    const messages = await this.messages.find({
      where: { sessionId, userId },
      order: { messageId: 'ASC' },
      take: 100,
    })

    return messages.map((message) => this.toMessageVo(message))
  }

  async sendMessage(sessionId: number, dto: H5ChatSendMessageDto, userId: number) {
    const [session, h5Config] = await Promise.all([
      this.ensureSession(sessionId, userId),
      this.aiModelService.infoH5Config(),
    ])
    const options = h5Config.options
    if (!options.chatAssistant.enabled) throw new ServiceException('AI 穿搭顾问已在后台停用')
    await this.ensureDailyLimit(userId, options)

    const userMessage = await this.saveMessage({
      sessionId,
      userId,
      role: 'user',
      content: dto.content,
    })
    const history = await this.loadRecentHistory(sessionId, userId, options.chatAssistant.maxHistoryMessages)
    const [profile, recentRecords] = await Promise.all([
      options.chatAssistant.useStyleProfile ? this.loadStyleProfile(userId) : Promise.resolve(null),
      options.chatAssistant.useRecentRecords ? this.loadRecentRecords(userId) : Promise.resolve([]),
    ])
    const assistantResponse = await this.requestAssistantReply({
      options,
      profile,
      recentRecords,
      history,
      userMessage: dto.content,
    })
    const assistantMessage = await this.saveMessage({
      sessionId,
      userId,
      role: 'assistant',
      content: assistantResponse.reply,
      quickReplies: assistantResponse.quickReplies,
      suggestedGenerationInput: assistantResponse.suggestedGenerationInput,
    })

    await this.sessions.update(session.sessionId, {
      lastMessage: assistantResponse.reply.slice(0, 200),
      messageCount: Number(session.messageCount || 0) + 2,
      updateBy: 'h5',
    })

    return {
      userMessage: this.toMessageVo(userMessage),
      assistantMessage: this.toMessageVo(assistantMessage),
    }
  }

  private async requestAssistantReply({
    history,
    options,
    profile,
    recentRecords,
    userMessage,
  }: {
    history: H5ChatMessage[]
    options: H5OutfitOptionConfig
    profile: H5ChatProfileContext | null
    recentRecords: H5ChatRecordContext[]
    userMessage: string
  }): Promise<H5ChatAssistantResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: buildH5ChatSystemPrompt({
          assistant: options.chatAssistant,
          profile,
          recentRecords,
          options: {
            homeCategories: options.homeCategories,
            inspirationKeywords: options.inspirationKeywords,
            styles: labelsOf(options.styles),
            scenes: labelsOf(options.scenes),
            colors: labelsOf(options.colors),
            items: labelsOf(options.items),
          },
        }),
      },
      ...history.map((message) => ({
        role: message.messageRole === 'assistant' ? 'assistant' as const : 'user' as const,
        content: message.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ]
    const content = await this.aiModelService.completeH5Chat(messages)
    return parseH5ChatAssistantResponse(content)
  }

  private async ensureSession(sessionId: number, userId: number) {
    const session = await this.sessions.findOneBy({ sessionId, userId })
    if (!session) throw new ServiceException('对话会话不存在或无权访问')
    if (session.sessionStatus !== 'active') throw new ServiceException('该对话已归档')

    return session
  }

  private async ensureDailyLimit(userId: number, options: H5OutfitOptionConfig) {
    const dailyLimit = options.chatAssistant.dailyLimit
    if (dailyLimit <= 0) throw new ServiceException('AI 穿搭顾问今日对话额度已关闭')

    const used = await this.messages
      .createQueryBuilder('message')
      .where('message.user_id = :userId', { userId })
      .andWhere('message.message_role = :role', { role: 'user' })
      .andWhere('message.create_time >= :startTime', { startTime: this.buildTodayStart() })
      .getCount()
    if (used >= dailyLimit) throw new ServiceException('今日 AI 顾问对话次数已用完，请明天再试')
  }

  private async loadRecentHistory(sessionId: number, userId: number, limit: number) {
    const messages = await this.messages.find({
      where: { sessionId, userId },
      order: { messageId: 'DESC' },
      take: limit,
    })

    return messages.reverse()
  }

  private async loadStyleProfile(userId: number): Promise<H5ChatProfileContext | null> {
    const profile = await this.styleProfiles.findOne({
      where: { userId },
      order: { updateTime: 'DESC' },
    })
    if (!profile) return null

    return {
      genderPreference: profile.genderPreference,
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
      notes: profile.notes,
    }
  }

  private async loadRecentRecords(userId: number): Promise<H5ChatRecordContext[]> {
    const records = await this.outfitRecords.find({
      where: { userId, recordStatus: 'succeeded' },
      order: { createTime: 'DESC' },
      take: 5,
    })

    return records.map((record) => ({
      outfitTitle: record.outfitTitle,
      summary: record.summary,
      occasion: record.occasion,
      style: record.style,
      colorPreference: record.colorPreference,
      weather: record.weather,
      temperature: record.temperature,
    }))
  }

  private async saveMessage({
    content,
    quickReplies,
    role,
    sessionId,
    suggestedGenerationInput,
    userId,
  }: {
    content: string
    quickReplies?: string[]
    role: 'user' | 'assistant'
    sessionId: number
    suggestedGenerationInput?: unknown
    userId: number
  }) {
    const message = this.messages.create({
      sessionId,
      userId,
      messageRole: role,
      content: content.slice(0, 2000),
      quickReplies: quickReplies?.length ? JSON.stringify(quickReplies) : undefined,
      suggestedGenerationInput: suggestedGenerationInput ? JSON.stringify(suggestedGenerationInput) : undefined,
      createBy: 'h5',
    })
    await this.messages.insert(message)
    const saved = await this.messages.findOne({
      where: { sessionId, userId },
      order: { messageId: 'DESC' },
    })
    if (!saved) throw new ServiceException('对话消息保存失败')

    return saved
  }

  private toSessionVo(session: H5ChatSession) {
    return {
      sessionId: session.sessionId,
      title: session.sessionTitle,
      lastMessage: session.lastMessage || '',
      messageCount: session.messageCount,
      updatedAt: session.updateTime,
      createdAt: session.createTime,
    }
  }

  private toMessageVo(message: H5ChatMessage) {
    return {
      messageId: message.messageId,
      sessionId: message.sessionId,
      role: message.messageRole,
      content: message.content,
      quickReplies: parseJson(message.quickReplies, []),
      suggestedGenerationInput: parseJson(message.suggestedGenerationInput, undefined),
      createdAt: message.createTime,
    }
  }

  private buildTodayStart() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 00:00:00`
  }
}

function labelsOf(items: H5OutfitOptionItem[] = []) {
  return items.map((item) => item.label).filter(Boolean)
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
