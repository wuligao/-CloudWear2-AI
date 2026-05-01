import { BaseBusinessEntity, BaseStatusEnum } from '@vivy-common/core'
import { IsEnum, IsInt, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * 应用模型配置
 */
@Entity({ name: 'cw_ai_app_model_config' })
export class AiAppModelConfig extends BaseBusinessEntity {
  @PrimaryGeneratedColumn({
    name: 'config_id',
    type: 'bigint',
    comment: '配置ID',
  })
  configId: number

  @Column({
    name: 'app_code',
    type: 'varchar',
    length: 60,
    unique: true,
    comment: '应用编码',
  })
  @MaxLength(60)
  @IsNotEmpty()
  appCode: string

  @Column({
    name: 'app_name',
    type: 'varchar',
    length: 80,
    comment: '应用名称',
  })
  @MaxLength(80)
  @IsNotEmpty()
  appName: string

  @Column({
    name: 'text_provider_id',
    type: 'bigint',
    nullable: true,
    comment: '文本服务商ID',
  })
  @IsInt()
  @IsOptional()
  textProviderId?: number

  @Column({
    name: 'text_model_pk',
    type: 'bigint',
    nullable: true,
    comment: '文本模型主键',
  })
  @IsInt()
  @IsOptional()
  textModelPk?: number

  @Column({
    name: 'keyword_image_provider_id',
    type: 'bigint',
    nullable: true,
    comment: '关键词生图服务商ID',
  })
  @IsInt()
  @IsOptional()
  keywordImageProviderId?: number

  @Column({
    name: 'keyword_image_model_pk',
    type: 'bigint',
    nullable: true,
    comment: '关键词生图模型主键',
  })
  @IsInt()
  @IsOptional()
  keywordImageModelPk?: number

  @Column({
    name: 'photo_image_provider_id',
    type: 'bigint',
    nullable: true,
    comment: '照片生图服务商ID',
  })
  @IsInt()
  @IsOptional()
  photoImageProviderId?: number

  @Column({
    name: 'photo_image_model_pk',
    type: 'bigint',
    nullable: true,
    comment: '照片生图模型主键',
  })
  @IsInt()
  @IsOptional()
  photoImageModelPk?: number

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
    name: 'option_config',
    type: 'longtext',
    nullable: true,
    comment: 'H5选项配置JSON',
  })
  @IsOptional()
  optionConfig?: string

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
}
