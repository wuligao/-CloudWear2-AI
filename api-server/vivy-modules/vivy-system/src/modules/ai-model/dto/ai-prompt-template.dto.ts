import { OmitType, PartialType } from '@nestjs/mapped-types'
import { Allow, IsIn } from 'class-validator'
import { PaginateDto } from '@vivy-common/core'
import { AiPromptTemplate } from '../entities/ai-prompt-template.entity'

export class ListAiPromptTemplateDto extends PaginateDto {
  @Allow()
  keyword?: string

  @Allow()
  scene?: string

  @Allow()
  promptType?: string

  @Allow()
  status?: string
}

export class CreateAiPromptTemplateDto extends OmitType(AiPromptTemplate, [
  'promptId',
  'applicableModels',
  'usageCount',
  'lastUsedTime',
] as const) {
  @Allow()
  applicableModels?: string[] | string
}

export class UpdateAiPromptTemplateDto extends PartialType(CreateAiPromptTemplateDto) {}

export class UpdateAiPromptTemplateStatusDto {
  @IsIn(['0', '1'])
  status: string
}
