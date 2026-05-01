import { BaseBusinessEntity, BaseStatusEnum } from '@vivy-common/core'
import { IsEnum, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { AiModelItem } from './ai-model-item.entity'

/**
 * 第三方 AI 模型服务商
 */
@Entity({ name: 'cw_ai_model_provider' })
export class AiModelProvider extends BaseBusinessEntity {
  @PrimaryGeneratedColumn({
    name: 'provider_id',
    type: 'bigint',
    comment: '服务商ID',
  })
  providerId: number

  @Column({
    name: 'provider_name',
    type: 'varchar',
    length: 80,
    comment: '服务商名称',
  })
  @MaxLength(80)
  @IsNotEmpty()
  providerName: string

  @Column({
    name: 'provider_code',
    type: 'varchar',
    length: 80,
    unique: true,
    comment: '服务商编码',
  })
  @MaxLength(80)
  @IsNotEmpty()
  providerCode: string

  @Column({
    name: 'base_url',
    type: 'varchar',
    length: 255,
    comment: 'OpenAI-compatible Base URL',
  })
  @MaxLength(255)
  @IsNotEmpty()
  baseUrl: string

  @Column({
    name: 'api_key',
    type: 'varchar',
    length: 512,
    nullable: true,
    select: false,
    comment: 'API Key',
  })
  @MaxLength(512)
  @IsOptional()
  apiKey?: string

  @Column({
    name: 'default_model_id',
    type: 'varchar',
    length: 120,
    nullable: true,
    comment: '默认模型ID',
  })
  @MaxLength(120)
  @IsOptional()
  defaultModelId?: string

  @Column({
    name: 'icon_text',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '图标文字',
  })
  @MaxLength(20)
  @IsOptional()
  iconText?: string

  @Column({
    name: 'color',
    type: 'varchar',
    length: 30,
    default: 'slate',
    comment: '服务商颜色',
  })
  @MaxLength(30)
  @IsOptional()
  color: string

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

  @OneToMany(() => AiModelItem, (model) => model.provider)
  models?: AiModelItem[]
}
