import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { BaseStatusEnum, ServiceException } from '@vivy-common/core'
import { paginate, Pagination } from 'nestjs-typeorm-paginate'
import { Brackets, Repository } from 'typeorm'
import {
  CreateAiPromptTemplateDto,
  ListAiPromptTemplateDto,
  UpdateAiPromptTemplateDto,
} from './dto/ai-prompt-template.dto'
import { AiPromptTemplate } from './entities/ai-prompt-template.entity'

export interface AiPromptTemplateStats {
  total: number
  enabled: number
  disabled: number
  sceneCount: number
  usageCount: number
}

export interface AiPromptTemplateVo
  extends Omit<AiPromptTemplate, 'applicableModels'> {
  applicableModels: string[]
}

@Injectable()
export class AiPromptTemplateService {
  constructor(
    @InjectRepository(AiPromptTemplate)
    private readonly promptRepository: Repository<AiPromptTemplate>
  ) {}

  async list(query: ListAiPromptTemplateDto): Promise<Pagination<AiPromptTemplateVo>> {
    const builder = this.promptRepository
      .createQueryBuilder('prompt')
      .orderBy('prompt.sort_order', 'ASC')
      .addOrderBy('prompt.update_time', 'DESC')
      .addOrderBy('prompt.prompt_id', 'DESC')

    if (query.keyword) {
      builder.andWhere(
        new Brackets((keywordBuilder) => {
          keywordBuilder
            .where('prompt.prompt_name LIKE :keyword')
            .orWhere('prompt.description LIKE :keyword')
            .orWhere('prompt.prompt_content LIKE :keyword')
            .orWhere('prompt.usage_guide LIKE :keyword')
        })
      )
      builder.setParameter('keyword', `%${query.keyword}%`)
    }

    if (query.scene && query.scene !== 'all') {
      builder.andWhere('prompt.scene = :scene', { scene: query.scene })
    }

    if (query.promptType && query.promptType !== 'all') {
      builder.andWhere('prompt.prompt_type = :promptType', { promptType: query.promptType })
    }

    if (query.status && query.status !== 'all') {
      builder.andWhere('prompt.status = :status', { status: query.status })
    }

    const page = await paginate<AiPromptTemplate>(builder, {
      page: query.page,
      limit: query.limit,
    })

    return {
      ...page,
      items: page.items.map((prompt) => this.toVo(prompt)),
    }
  }

  async stats(): Promise<AiPromptTemplateStats> {
    const [total, enabled, disabled, sceneRows, usageRow] = await Promise.all([
      this.promptRepository.count(),
      this.promptRepository.countBy({ status: BaseStatusEnum.NORMAL }),
      this.promptRepository.countBy({ status: BaseStatusEnum.DISABLE }),
      this.promptRepository
        .createQueryBuilder('prompt')
        .select('COUNT(DISTINCT prompt.scene)', 'sceneCount')
        .getRawOne<{ sceneCount: string }>(),
      this.promptRepository
        .createQueryBuilder('prompt')
        .select('COALESCE(SUM(prompt.usage_count), 0)', 'usageCount')
        .getRawOne<{ usageCount: string }>(),
    ])

    return {
      total,
      enabled,
      disabled,
      sceneCount: Number(sceneRows?.sceneCount || 0),
      usageCount: Number(usageRow?.usageCount || 0),
    }
  }

  async info(promptId: number): Promise<AiPromptTemplateVo> {
    return this.toVo(await this.getPrompt(promptId))
  }

  async add(dto: CreateAiPromptTemplateDto): Promise<void> {
    await this.ensureUniqueName(dto.promptName)
    await this.promptRepository.insert(
      this.promptRepository.create({
        ...dto,
        status: dto.status ?? BaseStatusEnum.NORMAL,
        usageCount: 0,
        applicableModels: this.stringifyModels(dto.applicableModels),
      })
    )
  }

  async update(promptId: number, dto: UpdateAiPromptTemplateDto): Promise<void> {
    const current = await this.getPrompt(promptId)
    if (dto.promptName && dto.promptName !== current.promptName) {
      await this.ensureUniqueName(dto.promptName, promptId)
    }

    await this.promptRepository.update(promptId, {
      ...dto,
      applicableModels:
        dto.applicableModels === undefined
          ? current.applicableModels
          : this.stringifyModels(dto.applicableModels),
    })
  }

  async updateStatus(promptId: number, status: string): Promise<void> {
    await this.getPrompt(promptId)
    await this.promptRepository.update(promptId, { status })
  }

  async duplicate(promptId: number, operator?: string): Promise<AiPromptTemplateVo> {
    const current = await this.getPrompt(promptId)
    const name = await this.nextCopyName(current.promptName)
    const created = this.promptRepository.create({
      ...current,
      promptId: undefined,
      promptName: name,
      usageCount: 0,
      lastUsedTime: undefined,
      status: BaseStatusEnum.NORMAL,
      createBy: operator || current.createBy,
      updateBy: undefined,
      createTime: undefined,
      updateTime: undefined,
    })
    const saved = await this.promptRepository.save(created)
    return this.toVo(saved)
  }

  async markUsed(promptId: number): Promise<AiPromptTemplateVo> {
    const current = await this.getPrompt(promptId)
    await this.promptRepository.update(promptId, {
      usageCount: Number(current.usageCount || 0) + 1,
      lastUsedTime: new Date(),
    })
    return this.info(promptId)
  }

  async delete(promptIds: number[]): Promise<void> {
    await this.promptRepository.delete(promptIds)
  }

  private async getPrompt(promptId: number) {
    const prompt = await this.promptRepository.findOneBy({ promptId })
    if (!prompt) throw new NotFoundException({ error: '提示词不存在或已删除。' })
    return prompt
  }

  private async ensureUniqueName(promptName?: string, promptId?: number) {
    if (!promptName) throw new ServiceException('提示词名称不能为空')
    const current = await this.promptRepository.findOneBy({ promptName })
    if (current && current.promptId !== promptId) {
      throw new ServiceException('提示词名称已存在')
    }
  }

  private stringifyModels(models?: string[] | string) {
    if (models === undefined) return undefined
    if (typeof models === 'string') {
      const trimmed = models.trim()
      if (!trimmed) return ''
      try {
        const parsed = JSON.parse(trimmed)
        return JSON.stringify(Array.isArray(parsed) ? parsed.map(String) : [trimmed])
      } catch {
        return JSON.stringify(
          trimmed
            .split(/,|，|\n/)
            .map((item) => item.trim())
            .filter(Boolean)
        )
      }
    }

    return JSON.stringify(models.map(String).filter(Boolean))
  }

  private parseModels(models?: string) {
    if (!models) return []
    try {
      const parsed = JSON.parse(models)
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }

  private toVo(prompt: AiPromptTemplate): AiPromptTemplateVo {
    const { applicableModels, ...rest } = prompt
    return {
      ...rest,
      applicableModels: this.parseModels(applicableModels),
    }
  }

  private async nextCopyName(promptName: string) {
    const baseName = `${promptName} 副本`
    const exists = await this.promptRepository.findOneBy({ promptName: baseName })
    if (!exists) return baseName
    for (let index = 2; index <= 100; index += 1) {
      const nextName = `${baseName} ${index}`
      const nextExists = await this.promptRepository.findOneBy({ promptName: nextName })
      if (!nextExists) return nextName
    }
    return `${baseName} ${Date.now()}`
  }
}
