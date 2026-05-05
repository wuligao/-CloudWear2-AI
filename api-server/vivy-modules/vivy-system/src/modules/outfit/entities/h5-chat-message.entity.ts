import { BaseBusinessEntity } from '@vivy-common/core'
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'cw_h5_chat_message' })
@Index('idx_cw_h5_chat_message_session', ['sessionId'])
@Index('idx_cw_h5_chat_message_user_time', ['userId', 'createTime'])
export class H5ChatMessage extends BaseBusinessEntity {
  @PrimaryGeneratedColumn({
    name: 'message_id',
    type: 'bigint',
    comment: 'H5对话消息ID',
  })
  messageId: number

  @Column({
    name: 'session_id',
    type: 'bigint',
    comment: '会话ID',
  })
  sessionId: number

  @Column({
    name: 'user_id',
    type: 'bigint',
    comment: '用户ID',
  })
  userId: number

  @Column({
    name: 'message_role',
    type: 'varchar',
    length: 20,
    comment: '消息角色 user/assistant',
  })
  messageRole: string

  @Column({
    name: 'content',
    type: 'varchar',
    length: 2000,
    comment: '消息内容',
  })
  content: string

  @Column({
    name: 'quick_replies',
    type: 'longtext',
    nullable: true,
    comment: '快捷回复JSON',
  })
  quickReplies?: string

  @Column({
    name: 'suggested_generation_input',
    type: 'longtext',
    nullable: true,
    comment: '建议生图输入JSON',
  })
  suggestedGenerationInput?: string

  @Column({
    name: 'metadata',
    type: 'longtext',
    nullable: true,
    comment: '扩展信息JSON',
  })
  metadata?: string
}
