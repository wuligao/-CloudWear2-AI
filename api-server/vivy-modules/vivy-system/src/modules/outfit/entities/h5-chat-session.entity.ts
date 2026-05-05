import { BaseBusinessEntity } from '@vivy-common/core'
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'cw_h5_chat_session' })
@Index('idx_cw_h5_chat_session_user', ['userId'])
export class H5ChatSession extends BaseBusinessEntity {
  @PrimaryGeneratedColumn({
    name: 'session_id',
    type: 'bigint',
    comment: 'H5对话会话ID',
  })
  sessionId: number

  @Column({
    name: 'user_id',
    type: 'bigint',
    comment: '用户ID',
  })
  userId: number

  @Column({
    name: 'session_title',
    type: 'varchar',
    length: 100,
    default: 'AI 穿搭顾问',
    comment: '会话标题',
  })
  sessionTitle: string

  @Column({
    name: 'last_message',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '最后一条消息摘要',
  })
  lastMessage?: string

  @Column({
    name: 'message_count',
    type: 'int',
    default: 0,
    comment: '消息数量',
  })
  messageCount: number

  @Column({
    name: 'session_status',
    type: 'varchar',
    length: 20,
    default: 'active',
    comment: '会话状态 active/archived',
  })
  sessionStatus: string
}
