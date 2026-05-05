import { BaseBusinessEntity } from '@vivy-common/core'
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'cw_h5_style_profile' })
@Index('idx_cw_h5_style_profile_user', ['userId'])
export class H5StyleProfile extends BaseBusinessEntity {
  @PrimaryGeneratedColumn({
    name: 'profile_id',
    type: 'bigint',
    comment: '风格档案ID',
  })
  profileId: number

  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: true,
    comment: '用户ID',
  })
  userId?: number

  @Column({ name: 'height', type: 'varchar', length: 40, nullable: true, comment: '身高' })
  height?: string

  @Column({ name: 'weight', type: 'varchar', length: 40, nullable: true, comment: '体重' })
  weight?: string

  @Column({ name: 'clothing_size', type: 'varchar', length: 40, nullable: true, comment: '服装尺码' })
  clothingSize?: string

  @Column({ name: 'shoe_size', type: 'varchar', length: 40, nullable: true, comment: '鞋码' })
  shoeSize?: string

  @Column({ name: 'gender_preference', type: 'varchar', length: 40, nullable: true, comment: '穿搭性别偏好' })
  genderPreference?: string

  @Column({ name: 'favorite_styles', type: 'longtext', nullable: true, comment: '偏好风格JSON' })
  favoriteStyles?: string

  @Column({ name: 'favorite_colors', type: 'longtext', nullable: true, comment: '偏好颜色JSON' })
  favoriteColors?: string

  @Column({ name: 'avoid_colors', type: 'longtext', nullable: true, comment: '避开颜色JSON' })
  avoidColors?: string

  @Column({ name: 'common_occasions', type: 'longtext', nullable: true, comment: '常用场景JSON' })
  commonOccasions?: string

  @Column({ name: 'element_preferences', type: 'longtext', nullable: true, comment: '元素偏好JSON' })
  elementPreferences?: string

  @Column({ name: 'fit_preferences', type: 'longtext', nullable: true, comment: '版型偏好JSON' })
  fitPreferences?: string

  @Column({ name: 'body_metrics', type: 'longtext', nullable: true, comment: '身体围度JSON' })
  bodyMetrics?: string

  @Column({ name: 'base_photos', type: 'longtext', nullable: true, comment: '基础照片JSON' })
  basePhotos?: string

  @Column({ name: 'analysis_report', type: 'longtext', nullable: true, comment: 'AI分析报告JSON' })
  analysisReport?: string

  @Column({ name: 'recommended_colors', type: 'longtext', nullable: true, comment: '推荐色彩JSON' })
  recommendedColors?: string

  @Column({ name: 'recommended_styles', type: 'longtext', nullable: true, comment: '推荐风格JSON' })
  recommendedStyles?: string

  @Column({ name: 'analysis_updated_at', type: 'datetime', nullable: true, comment: 'AI分析更新时间' })
  analysisUpdatedAt?: Date

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true, comment: '备注' })
  notes?: string
}
