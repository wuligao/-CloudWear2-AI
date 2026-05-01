import { BaseBusinessEntity } from '@vivy-common/core'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'cw_outfit_record' })
export class OutfitRecord extends BaseBusinessEntity {
  @PrimaryGeneratedColumn({
    name: 'record_id',
    type: 'bigint',
    comment: '穿搭记录ID',
  })
  recordId: number

  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: true,
    comment: '用户ID',
  })
  userId?: number

  @Column({
    name: 'generation_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '生成结果ID',
  })
  generationId?: string

  @Column({
    name: 'task_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '生成任务ID',
  })
  taskId?: string

  @Column({
    name: 'source',
    type: 'varchar',
    length: 20,
    default: 'keyword',
    comment: '生成来源 keyword/photo',
  })
  source: string

  @Column({
    name: 'record_status',
    type: 'varchar',
    length: 20,
    default: 'succeeded',
    comment: '记录状态 running/succeeded/failed',
  })
  recordStatus: string

  @Column({
    name: 'outfit_title',
    type: 'varchar',
    length: 160,
    comment: '穿搭标题',
  })
  outfitTitle: string

  @Column({
    name: 'summary',
    type: 'varchar',
    length: 1000,
    comment: '穿搭总结',
  })
  summary: string

  @Column({
    name: 'image_url',
    type: 'varchar',
    length: 1000,
    comment: '生成图片地址',
  })
  imageUrl: string

  @Column({
    name: 'total_count',
    type: 'int',
    default: 1,
    comment: '生成总数',
  })
  totalCount: number

  @Column({
    name: 'success_count',
    type: 'int',
    default: 1,
    comment: '成功数量',
  })
  successCount: number

  @Column({
    name: 'failed_count',
    type: 'int',
    default: 0,
    comment: '失败数量',
  })
  failedCount: number

  @Column({
    name: 'season',
    type: 'varchar',
    length: 20,
    comment: '季节',
  })
  season: string

  @Column({
    name: 'temperature',
    type: 'int',
    comment: '温度',
  })
  temperature: number

  @Column({
    name: 'weather',
    type: 'varchar',
    length: 40,
    comment: '天气',
  })
  weather: string

  @Column({
    name: 'location',
    type: 'varchar',
    length: 120,
    comment: '地点',
  })
  location: string

  @Column({
    name: 'occasion',
    type: 'varchar',
    length: 120,
    comment: '场景',
  })
  occasion: string

  @Column({
    name: 'style',
    type: 'varchar',
    length: 160,
    comment: '风格',
  })
  style: string

  @Column({
    name: 'color_preference',
    type: 'varchar',
    length: 80,
    nullable: true,
    comment: '颜色偏好',
  })
  colorPreference?: string

  @Column({
    name: 'gender_preference',
    type: 'varchar',
    length: 80,
    nullable: true,
    comment: '性别偏好',
  })
  genderPreference?: string

  @Column({
    name: 'image_model',
    type: 'varchar',
    length: 120,
    nullable: true,
    comment: '生图模型',
  })
  imageModel?: string

  @Column({
    name: 'style_tags',
    type: 'longtext',
    comment: '风格标签JSON',
  })
  styleTags: string

  @Column({
    name: 'items',
    type: 'longtext',
    comment: '单品拆解JSON',
  })
  items: string

  @Column({
    name: 'input_snapshot',
    type: 'longtext',
    nullable: true,
    comment: '生成输入快照JSON',
  })
  inputSnapshot?: string

  @Column({
    name: 'temperature_advice',
    type: 'varchar',
    length: 1000,
    comment: '温度建议',
  })
  temperatureAdvice: string

  @Column({
    name: 'occasion_reason',
    type: 'varchar',
    length: 1000,
    comment: '场景理由',
  })
  occasionReason: string

  @Column({
    name: 'image_prompt',
    type: 'longtext',
    comment: '图片提示词',
  })
  imagePrompt: string

  @Column({
    name: 'user_photo_used',
    type: 'tinyint',
    width: 1,
    default: 0,
    comment: '是否使用用户照片',
  })
  userPhotoUsed: boolean

  @Column({
    name: 'user_photo_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: '用户上传原图地址',
  })
  userPhotoUrl?: string

  @Column({
    name: 'generated_at',
    type: 'datetime',
    comment: '生成时间',
  })
  generatedAt: Date
}
