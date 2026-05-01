-- H5穿搭记录表。TypeORM synchronize 已关闭，本地数据库需执行本脚本。
USE `vivy-nest-admin`;

CREATE TABLE IF NOT EXISTS `cw_outfit_record` (
  `record_id` bigint NOT NULL AUTO_INCREMENT COMMENT '穿搭记录ID',
  `user_id` bigint NULL DEFAULT NULL COMMENT '用户ID',
  `generation_id` varchar(100) NULL DEFAULT NULL COMMENT '生成结果ID',
  `task_id` varchar(100) NULL DEFAULT NULL COMMENT '生成任务ID',
  `source` varchar(20) NOT NULL DEFAULT 'keyword' COMMENT '生成来源 keyword/photo',
  `record_status` varchar(20) NOT NULL DEFAULT 'succeeded' COMMENT '记录状态 running/succeeded/failed',
  `outfit_title` varchar(160) NOT NULL COMMENT '穿搭标题',
  `summary` varchar(1000) NOT NULL COMMENT '穿搭总结',
  `image_url` varchar(1000) NOT NULL COMMENT '生成图片地址',
  `total_count` int NOT NULL DEFAULT 1 COMMENT '生成总数',
  `success_count` int NOT NULL DEFAULT 1 COMMENT '成功数量',
  `failed_count` int NOT NULL DEFAULT 0 COMMENT '失败数量',
  `season` varchar(20) NOT NULL COMMENT '季节',
  `temperature` int NOT NULL COMMENT '温度',
  `weather` varchar(40) NOT NULL COMMENT '天气',
  `location` varchar(120) NOT NULL COMMENT '地点',
  `occasion` varchar(120) NOT NULL COMMENT '场景',
  `style` varchar(160) NOT NULL COMMENT '风格',
  `color_preference` varchar(80) NULL DEFAULT NULL COMMENT '颜色偏好',
  `gender_preference` varchar(80) NULL DEFAULT NULL COMMENT '性别偏好',
  `image_model` varchar(120) NULL DEFAULT NULL COMMENT '生图模型',
  `style_tags` longtext NOT NULL COMMENT '风格标签JSON',
  `items` longtext NOT NULL COMMENT '单品拆解JSON',
  `input_snapshot` longtext NULL COMMENT '生成输入快照JSON',
  `temperature_advice` varchar(1000) NOT NULL COMMENT '温度建议',
  `occasion_reason` varchar(1000) NOT NULL COMMENT '场景理由',
  `image_prompt` longtext NOT NULL COMMENT '图片提示词',
  `user_photo_used` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否使用用户照片',
  `user_photo_url` varchar(1000) NULL DEFAULT NULL COMMENT '用户上传原图地址',
  `generated_at` datetime NOT NULL COMMENT '生成时间',
  `create_by` varchar(50) NULL DEFAULT NULL COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(50) NULL DEFAULT NULL COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `uk_cw_outfit_record_user_generation` (`user_id`, `generation_id`),
  KEY `idx_cw_outfit_record_task` (`task_id`),
  KEY `idx_cw_outfit_record_user_time` (`user_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='H5穿搭记录';

SET @has_cw_user_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND COLUMN_NAME = 'user_id'
);
SET @ddl_cw_user_id := IF(
  @has_cw_user_id = 0,
  'ALTER TABLE `cw_outfit_record` ADD COLUMN `user_id` bigint NULL DEFAULT NULL COMMENT ''用户ID'' AFTER `record_id`',
  'SELECT 1'
);
PREPARE stmt_cw_user_id FROM @ddl_cw_user_id;
EXECUTE stmt_cw_user_id;
DEALLOCATE PREPARE stmt_cw_user_id;

SET @has_cw_user_time_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND INDEX_NAME = 'idx_cw_outfit_record_user_time'
);
SET @ddl_cw_user_time_idx := IF(
  @has_cw_user_time_idx = 0,
  'ALTER TABLE `cw_outfit_record` ADD KEY `idx_cw_outfit_record_user_time` (`user_id`, `create_time`)',
  'SELECT 1'
);
PREPARE stmt_cw_user_time_idx FROM @ddl_cw_user_time_idx;
EXECUTE stmt_cw_user_time_idx;
DEALLOCATE PREPARE stmt_cw_user_time_idx;

SET @has_cw_user_generation_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND INDEX_NAME = 'uk_cw_outfit_record_user_generation'
);
SET @ddl_cw_user_generation_idx := IF(
  @has_cw_user_generation_idx = 0,
  'ALTER TABLE `cw_outfit_record` ADD UNIQUE KEY `uk_cw_outfit_record_user_generation` (`user_id`, `generation_id`)',
  'SELECT 1'
);
PREPARE stmt_cw_user_generation_idx FROM @ddl_cw_user_generation_idx;
EXECUTE stmt_cw_user_generation_idx;
DEALLOCATE PREPARE stmt_cw_user_generation_idx;

SET @has_cw_task_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND COLUMN_NAME = 'task_id'
);
SET @ddl_cw_task_id := IF(
  @has_cw_task_id = 0,
  'ALTER TABLE `cw_outfit_record` ADD COLUMN `task_id` varchar(100) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT ''生成任务ID'' AFTER `generation_id`',
  'SELECT 1'
);
PREPARE stmt_cw_task_id FROM @ddl_cw_task_id;
EXECUTE stmt_cw_task_id;
DEALLOCATE PREPARE stmt_cw_task_id;

SET @has_cw_task_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND INDEX_NAME = 'idx_cw_outfit_record_task'
);
SET @ddl_cw_task_idx := IF(
  @has_cw_task_idx = 0,
  'ALTER TABLE `cw_outfit_record` ADD KEY `idx_cw_outfit_record_task` (`task_id`)',
  'SELECT 1'
);
PREPARE stmt_cw_task_idx FROM @ddl_cw_task_idx;
EXECUTE stmt_cw_task_idx;
DEALLOCATE PREPARE stmt_cw_task_idx;

UPDATE `cw_outfit_record`
SET `task_id` = `generation_id`
WHERE `task_id` IS NULL
  AND `generation_id` IS NOT NULL;

SET @has_cw_user_photo_url := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND COLUMN_NAME = 'user_photo_url'
);
SET @ddl_cw_user_photo_url := IF(
  @has_cw_user_photo_url = 0,
  'ALTER TABLE `cw_outfit_record` ADD COLUMN `user_photo_url` varchar(1000) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT ''用户上传原图地址'' AFTER `user_photo_used`',
  'SELECT 1'
);
PREPARE stmt_cw_user_photo_url FROM @ddl_cw_user_photo_url;
EXECUTE stmt_cw_user_photo_url;
DEALLOCATE PREPARE stmt_cw_user_photo_url;

SET @cloudwear_ai_menu_id := COALESCE(
  (SELECT `menu_id` FROM `sys_menu` WHERE `menu_name` IN ('AI管理', 'AI配置', 'AI模型管理') AND `menu_type` = 'M' LIMIT 1),
  5
);

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `path`, `component`, `permission`, `icon`, `is_visible`, `is_link`, `is_frame`, `is_cache`, `create_by`)
SELECT @cloudwear_ai_menu_id, '生成记录', 'C', 3, '0', 'outfit-record', 'ai/outfit-record/index', 'outfit:record:list', 'ant-design:history-outlined', '1', '0', '0', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `component` = 'ai/outfit-record/index');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT `menu_id`, '生成记录查询', 'F', 1, '0', 'outfit:record:list', '0', 'system'
FROM `sys_menu`
WHERE `component` = 'ai/outfit-record/index'
  AND NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'outfit:record:list' AND `menu_type` = 'F');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT `menu_id`, '生成记录删除', 'F', 2, '0', 'outfit:record:delete', '0', 'system'
FROM `sys_menu`
WHERE `component` = 'ai/outfit-record/index'
  AND NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'outfit:record:delete' AND `menu_type` = 'F');
