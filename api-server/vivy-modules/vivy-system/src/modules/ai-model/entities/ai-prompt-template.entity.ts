import { BaseBusinessEntity, BaseStatusEnum } from '@vivy-common/core'
import { IsEnum, IsInt, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * AI提示词模板
 */
@Entity({ name: 'cw_ai_prompt_template' })
export class AiPromptTemplate extends BaseBusinessEntity {
  @PrimaryGeneratedColumn({
    name: 'prompt_id',
    type: 'bigint',
    comment: '提示词ID',
  })
  promptId: number

  @Column({
    name: 'prompt_name',
    type: 'varchar',
    length: 120,
    comment: '提示词名称',
  })
  @MaxLength(120)
  @IsNotEmpty()
  promptName: string

  @Column({
    name: 'scene',
    type: 'varchar',
    length: 80,
    comment: '适用场景',
  })
  @MaxLength(80)
  @IsNotEmpty()
  scene: string

  @Column({
    name: 'prompt_type',
    type: 'varchar',
    length: 30,
    default: 'image',
    comment: '提示词类型 image/text/multimodal',
  })
  @MaxLength(30)
  @IsNotEmpty()
  promptType: string

  @Column({
    name: 'status',
    type: 'char',
    length: 1,
    default: '0',
    comment: '状态（0启用 1停用）',
  })
  @IsEnum(BaseStatusEnum)
  @IsOptional()
  status: string

  @Column({
    name: 'description',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '提示词摘要',
  })
  @MaxLength(500)
  @IsOptional()
  description?: string

  @Column({
    name: 'prompt_content',
    type: 'longtext',
    comment: '提示词内容',
  })
  @IsNotEmpty()
  promptContent: string

  @Column({
    name: 'usage_guide',
    type: 'longtext',
    nullable: true,
    comment: '使用说明',
  })
  @IsOptional()
  usageGuide?: string

  @Column({
    name: 'applicable_models',
    type: 'longtext',
    nullable: true,
    comment: '适用模型JSON',
  })
  @IsOptional()
  applicableModels?: string

  @Column({
    name: 'usage_count',
    type: 'int',
    default: 0,
    comment: '使用次数',
  })
  @IsInt()
  usageCount: number

  @Column({
    name: 'last_used_time',
    type: 'datetime',
    nullable: true,
    comment: '最后使用时间',
  })
  @IsOptional()
  lastUsedTime?: Date

  @Column({
    name: 'sort_order',
    type: 'int',
    default: 0,
    comment: '排序',
  })
  @IsInt()
  @IsOptional()
  sortOrder?: number
}
