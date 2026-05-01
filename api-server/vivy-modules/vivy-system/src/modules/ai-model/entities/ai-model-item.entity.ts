import { BaseBusinessEntity, BaseIsEnum, BaseStatusEnum } from '@vivy-common/core'
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { AiModelProvider } from './ai-model-provider.entity'

export type AiModelType = 'multimodal' | 'text' | 'image' | 'embedding'

/**
 * 第三方 AI 模型
 */
@Entity({ name: 'cw_ai_model_item' })
export class AiModelItem extends BaseBusinessEntity {
  @PrimaryGeneratedColumn({
    name: 'model_pk',
    type: 'bigint',
    comment: '模型主键',
  })
  modelPk: number

  @Column({
    name: 'provider_id',
    type: 'bigint',
    comment: '服务商ID',
  })
  @IsInt()
  @IsNotEmpty()
  providerId: number

  @Column({
    name: 'model_name',
    type: 'varchar',
    length: 120,
    comment: '模型名称',
  })
  @MaxLength(120)
  @IsNotEmpty()
  modelName: string

  @Column({
    name: 'model_id',
    type: 'varchar',
    length: 120,
    comment: '模型ID',
  })
  @MaxLength(120)
  @IsNotEmpty()
  modelId: string

  @Column({
    name: 'model_type',
    type: 'varchar',
    length: 30,
    comment: '模型类型',
  })
  @IsIn(['multimodal', 'text', 'image', 'embedding'])
  @IsNotEmpty()
  modelType: AiModelType

  @Column({
    name: 'context_length',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '上下文长度',
  })
  @MaxLength(50)
  @IsOptional()
  contextLength?: string

  @Column({
    name: 'is_default',
    type: 'char',
    length: 1,
    default: '0',
    comment: '是否默认（0否 1是）',
  })
  @IsEnum(BaseIsEnum)
  @IsOptional()
  isDefault: string

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
    name: 'remark',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '备注',
  })
  @MaxLength(500)
  @IsOptional()
  remark?: string

  @ManyToOne(() => AiModelProvider, (provider) => provider.models, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider?: AiModelProvider
}
