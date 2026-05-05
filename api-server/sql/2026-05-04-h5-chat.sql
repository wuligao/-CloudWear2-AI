CREATE TABLE IF NOT EXISTS `cw_h5_chat_session` (
  `session_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'H5对话会话ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `session_title` varchar(100) NOT NULL DEFAULT 'AI 穿搭顾问' COMMENT '会话标题',
  `last_message` varchar(500) DEFAULT NULL COMMENT '最后一条消息摘要',
  `message_count` int NOT NULL DEFAULT 0 COMMENT '消息数量',
  `session_status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '会话状态 active/archived',
  `create_by` varchar(50) DEFAULT NULL COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(50) DEFAULT NULL COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`session_id`),
  KEY `idx_cw_h5_chat_session_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='H5 AI穿搭顾问会话表';

CREATE TABLE IF NOT EXISTS `cw_h5_chat_message` (
  `message_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'H5对话消息ID',
  `session_id` bigint NOT NULL COMMENT '会话ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `message_role` varchar(20) NOT NULL COMMENT '消息角色 user/assistant',
  `content` varchar(2000) NOT NULL COMMENT '消息内容',
  `quick_replies` longtext DEFAULT NULL COMMENT '快捷回复JSON',
  `suggested_generation_input` longtext DEFAULT NULL COMMENT '建议生图输入JSON',
  `metadata` longtext DEFAULT NULL COMMENT '扩展信息JSON',
  `create_by` varchar(50) DEFAULT NULL COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(50) DEFAULT NULL COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`message_id`),
  KEY `idx_cw_h5_chat_message_session` (`session_id`),
  KEY `idx_cw_h5_chat_message_user_time` (`user_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='H5 AI穿搭顾问消息表';
