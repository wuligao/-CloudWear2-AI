-- CloudWear AI model provider configuration
-- Apply to the local `vivy-nest-admin` database when synchronize is disabled.

CREATE TABLE IF NOT EXISTS `cw_ai_model_provider` (
  `provider_id` bigint NOT NULL AUTO_INCREMENT COMMENT '服务商ID',
  `provider_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '服务商名称',
  `provider_code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '服务商编码',
  `base_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'OpenAI-compatible Base URL',
  `api_key` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API Key',
  `default_model_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '默认模型ID',
  `icon_text` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图标文字',
  `color` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'slate' COMMENT '服务商颜色',
  `status` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态（0启用 1停用）',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `create_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新者',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`provider_id`),
  UNIQUE KEY `uk_cw_ai_model_provider_code` (`provider_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='第三方AI模型服务商';

CREATE TABLE IF NOT EXISTS `cw_ai_model_item` (
  `model_pk` bigint NOT NULL AUTO_INCREMENT COMMENT '模型主键',
  `provider_id` bigint NOT NULL COMMENT '服务商ID',
  `model_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模型名称',
  `model_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模型ID',
  `model_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模型类型',
  `context_length` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上下文长度',
  `is_default` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '是否默认（0否 1是）',
  `status` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态（0启用 1停用）',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `create_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新者',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`model_pk`),
  UNIQUE KEY `uk_cw_ai_model_provider_model` (`provider_id`, `model_id`),
  KEY `idx_cw_ai_model_provider` (`provider_id`),
  CONSTRAINT `fk_cw_ai_model_provider` FOREIGN KEY (`provider_id`) REFERENCES `cw_ai_model_provider` (`provider_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='第三方AI模型';

CREATE TABLE IF NOT EXISTS `cw_ai_app_model_config` (
  `config_id` bigint NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `app_code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '应用编码',
  `app_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '应用名称',
  `text_provider_id` bigint DEFAULT NULL COMMENT '文本服务商ID',
  `text_model_pk` bigint DEFAULT NULL COMMENT '文本模型主键',
  `keyword_image_provider_id` bigint DEFAULT NULL COMMENT '关键词生图服务商ID',
  `keyword_image_model_pk` bigint DEFAULT NULL COMMENT '关键词生图模型主键',
  `photo_image_provider_id` bigint DEFAULT NULL COMMENT '照片生图服务商ID',
  `photo_image_model_pk` bigint DEFAULT NULL COMMENT '照片生图模型主键',
  `status` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态（0启用 1停用）',
  `option_config` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'H5选项配置JSON',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `create_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新者',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE KEY `uk_cw_ai_app_model_config_app` (`app_code`),
  KEY `idx_cw_ai_app_text_provider` (`text_provider_id`),
  KEY `idx_cw_ai_app_text_model` (`text_model_pk`),
  KEY `idx_cw_ai_app_keyword_provider` (`keyword_image_provider_id`),
  KEY `idx_cw_ai_app_keyword_model` (`keyword_image_model_pk`),
  KEY `idx_cw_ai_app_photo_provider` (`photo_image_provider_id`),
  KEY `idx_cw_ai_app_photo_model` (`photo_image_model_pk`),
  CONSTRAINT `fk_cw_ai_app_text_provider` FOREIGN KEY (`text_provider_id`) REFERENCES `cw_ai_model_provider` (`provider_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cw_ai_app_text_model` FOREIGN KEY (`text_model_pk`) REFERENCES `cw_ai_model_item` (`model_pk`) ON DELETE SET NULL,
  CONSTRAINT `fk_cw_ai_app_keyword_provider` FOREIGN KEY (`keyword_image_provider_id`) REFERENCES `cw_ai_model_provider` (`provider_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cw_ai_app_keyword_model` FOREIGN KEY (`keyword_image_model_pk`) REFERENCES `cw_ai_model_item` (`model_pk`) ON DELETE SET NULL,
  CONSTRAINT `fk_cw_ai_app_photo_provider` FOREIGN KEY (`photo_image_provider_id`) REFERENCES `cw_ai_model_provider` (`provider_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cw_ai_app_photo_model` FOREIGN KEY (`photo_image_model_pk`) REFERENCES `cw_ai_model_item` (`model_pk`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应用模型配置';

SET @has_h5_option_config := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_ai_app_model_config'
    AND COLUMN_NAME = 'option_config'
);
SET @ddl_h5_option_config := IF(
  @has_h5_option_config = 0,
  'ALTER TABLE `cw_ai_app_model_config` ADD COLUMN `option_config` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''H5选项配置JSON'' AFTER `status`',
  'SELECT 1'
);
PREPARE stmt_h5_option_config FROM @ddl_h5_option_config;
EXECUTE stmt_h5_option_config;
DEALLOCATE PREPARE stmt_h5_option_config;

INSERT IGNORE INTO `cw_ai_model_provider`
  (`provider_name`, `provider_code`, `base_url`, `api_key`, `default_model_id`, `icon_text`, `color`, `status`, `remark`, `create_by`)
VALUES
  ('OpenAI', 'openai', 'https://api.openai.com/v1', NULL, 'gpt-4o', '◎', 'emerald', '0', 'OpenAI-compatible 官方接口', 'system'),
  ('Claude', 'claude', 'https://api.anthropic.com/v1', NULL, 'claude-3-5-sonnet', 'AI', 'copper', '0', 'Claude 兼容服务商配置', 'system'),
  ('DeepSeek', 'deepseek', 'https://api.deepseek.com/v1', NULL, 'deepseek-chat', 'DS', 'ocean', '0', 'DeepSeek OpenAI-compatible 接口', 'system'),
  ('通义千问', 'qwen', 'https://dashscope.aliyuncs.com/compatible-mode/v1', NULL, 'qwen-plus', '千', 'violet', '0', '阿里云百炼兼容模式', 'system'),
  ('自定义模型', 'custom', '', NULL, '', '◇', 'slate', '1', '用于接入私有或代理模型服务', 'system');

INSERT IGNORE INTO `cw_ai_model_item`
  (`provider_id`, `model_name`, `model_id`, `model_type`, `context_length`, `is_default`, `status`, `create_by`)
SELECT `provider_id`, 'GPT-4o', 'gpt-4o', 'multimodal', '128K', '1', '0', 'system'
FROM `cw_ai_model_provider` WHERE `provider_code` = 'openai';

INSERT IGNORE INTO `cw_ai_model_item`
  (`provider_id`, `model_name`, `model_id`, `model_type`, `context_length`, `is_default`, `status`, `create_by`)
SELECT `provider_id`, 'GPT-4 Turbo', 'gpt-4-turbo', 'text', '128K', '0', '0', 'system'
FROM `cw_ai_model_provider` WHERE `provider_code` = 'openai';

INSERT IGNORE INTO `cw_ai_model_item`
  (`provider_id`, `model_name`, `model_id`, `model_type`, `context_length`, `is_default`, `status`, `create_by`)
SELECT `provider_id`, 'DALL-E 3', 'dall-e-3', 'image', '-', '0', '0', 'system'
FROM `cw_ai_model_provider` WHERE `provider_code` = 'openai';

INSERT IGNORE INTO `cw_ai_model_item`
  (`provider_id`, `model_name`, `model_id`, `model_type`, `context_length`, `is_default`, `status`, `create_by`)
SELECT `provider_id`, 'text-embedding-3-large', 'text-embedding-3-large', 'embedding', '8K', '0', '0', 'system'
FROM `cw_ai_model_provider` WHERE `provider_code` = 'openai';

INSERT IGNORE INTO `cw_ai_model_item`
  (`provider_id`, `model_name`, `model_id`, `model_type`, `context_length`, `is_default`, `status`, `create_by`)
SELECT `provider_id`, 'Claude 3.5 Sonnet', 'claude-3-5-sonnet', 'text', '200K', '1', '0', 'system'
FROM `cw_ai_model_provider` WHERE `provider_code` = 'claude';

INSERT IGNORE INTO `cw_ai_model_item`
  (`provider_id`, `model_name`, `model_id`, `model_type`, `context_length`, `is_default`, `status`, `create_by`)
SELECT `provider_id`, 'DeepSeek Chat', 'deepseek-chat', 'text', '64K', '1', '0', 'system'
FROM `cw_ai_model_provider` WHERE `provider_code` = 'deepseek';

INSERT IGNORE INTO `cw_ai_model_item`
  (`provider_id`, `model_name`, `model_id`, `model_type`, `context_length`, `is_default`, `status`, `create_by`)
SELECT `provider_id`, 'Qwen Plus', 'qwen-plus', 'text', '128K', '1', '0', 'system'
FROM `cw_ai_model_provider` WHERE `provider_code` = 'qwen';

INSERT IGNORE INTO `cw_ai_app_model_config`
  (`app_code`, `app_name`, `text_provider_id`, `text_model_pk`, `keyword_image_provider_id`, `keyword_image_model_pk`, `photo_image_provider_id`, `photo_image_model_pk`, `status`, `create_by`)
SELECT
  'h5_outfit',
  'H5穿搭生成',
  text_model.provider_id,
  text_model.model_pk,
  image_model.provider_id,
  image_model.model_pk,
  image_model.provider_id,
  image_model.model_pk,
  '0',
  'system'
FROM
  (SELECT provider_id, model_pk FROM `cw_ai_model_item` WHERE model_type IN ('text', 'multimodal') AND status = '0' ORDER BY is_default DESC, model_pk ASC LIMIT 1) text_model
  LEFT JOIN (SELECT provider_id, model_pk FROM `cw_ai_model_item` WHERE model_type IN ('image', 'multimodal') AND status = '0' ORDER BY is_default DESC, model_pk ASC LIMIT 1) image_model ON 1 = 1;

UPDATE `cw_ai_app_model_config`
SET `option_config` = JSON_OBJECT(
  'dailyFreeGenerationLimit', 3,
  'login', JSON_OBJECT(
    'heroImage', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=84',
    'heroAlt', '浅色衣架上的外套与包袋',
    'brandTitle', '云裳 AI 穿搭',
    'subtitle', 'AI 智能搭配 · 发现更美的你',
    'phonePasswordEnabled', true,
    'registerEnabled', true,
    'wechatEnabled', true
  ),
  'inspirationKeywords', JSON_ARRAY('初夏约会', '都市通勤', '海边度假', '复古港风', '运动休闲', '简约高级感'),
  'homeCategories', JSON_ARRAY('通勤', '法式', '休闲', '简约', '度假'),
  'homeLooks', JSON_ARRAY(
    JSON_OBJECT('label', '浅奶油通勤', 'image', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '柔雾风衣', 'image', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '米白度假裙', 'image', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '灰调西装', 'image', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=82')
  ),
  'seasons', JSON_ARRAY(JSON_OBJECT('label', '春'), JSON_OBJECT('label', '夏'), JSON_OBJECT('label', '秋'), JSON_OBJECT('label', '冬')),
  'weathers', JSON_ARRAY(JSON_OBJECT('label', '晴天'), JSON_OBJECT('label', '多云'), JSON_OBJECT('label', '小雨'), JSON_OBJECT('label', '大风'), JSON_OBJECT('label', '降温')),
  'temperatures', JSON_ARRAY(JSON_OBJECT('label', '8°C', 'value', 8), JSON_OBJECT('label', '15°C', 'value', 15), JSON_OBJECT('label', '22°C', 'value', 22), JSON_OBJECT('label', '28°C', 'value', 28), JSON_OBJECT('label', '34°C', 'value', 34)),
  'locations', JSON_ARRAY(JSON_OBJECT('label', '城市街拍'), JSON_OBJECT('label', '咖啡店'), JSON_OBJECT('label', '商场'), JSON_OBJECT('label', '办公室'), JSON_OBJECT('label', '公园'), JSON_OBJECT('label', '海边')),
  'styles', JSON_ARRAY(
    JSON_OBJECT('label', '法式', 'image', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '韩系', 'image', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '日系', 'image', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '美式', 'image', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '复古', 'image', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '运动', 'image', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=82')
  ),
  'scenes', JSON_ARRAY(JSON_OBJECT('label', '日常通勤', 'icon', 'home'), JSON_OBJECT('label', '约会', 'icon', 'heart'), JSON_OBJECT('label', '旅行', 'icon', 'plane'), JSON_OBJECT('label', '度假', 'icon', 'map-pin'), JSON_OBJECT('label', '派对', 'icon', 'sparkles'), JSON_OBJECT('label', '逛街', 'icon', 'briefcase')),
  'colors', JSON_ARRAY(JSON_OBJECT('label', '粉色', 'value', '#ff7eac'), JSON_OBJECT('label', '奶茶', 'value', '#dfb785'), JSON_OBJECT('label', '浅蓝', 'value', '#83a8ef'), JSON_OBJECT('label', '黑色', 'value', '#171717'), JSON_OBJECT('label', '紫色', 'value', '#875ef1'), JSON_OBJECT('label', '雾蓝', 'value', '#cbd8ff')),
  'items', JSON_ARRAY(JSON_OBJECT('label', '外套'), JSON_OBJECT('label', '上衣'), JSON_OBJECT('label', '裤子'), JSON_OBJECT('label', '裙子'), JSON_OBJECT('label', '鞋子'), JSON_OBJECT('label', '包包')),
  'imageModels', JSON_ARRAY(JSON_OBJECT('label', 'GPT-4o Image', 'value', 'gpt-4o-image', 'group', 'BLTCY', 'supportsPhotoInput', false))
)
WHERE `app_code` = 'h5_outfit' AND `option_config` IS NULL;

UPDATE `cw_ai_app_model_config`
SET `option_config` = JSON_SET(
  `option_config`,
  '$.homeLooks',
  JSON_ARRAY(
    JSON_OBJECT('label', '浅奶油通勤', 'image', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '柔雾风衣', 'image', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '米白度假裙', 'image', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=82'),
    JSON_OBJECT('label', '灰调西装', 'image', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=82')
  )
)
WHERE `app_code` = 'h5_outfit'
  AND `option_config` IS NOT NULL
  AND JSON_EXTRACT(`option_config`, '$.homeLooks') IS NULL;

UPDATE `cw_ai_app_model_config`
SET `option_config` = JSON_SET(
  `option_config`,
  '$.login',
  JSON_OBJECT(
    'heroImage', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=84',
    'heroAlt', '浅色衣架上的外套与包袋',
    'brandTitle', '云裳 AI 穿搭',
    'subtitle', 'AI 智能搭配 · 发现更美的你',
    'phonePasswordEnabled', true,
    'registerEnabled', true,
    'wechatEnabled', true
  )
)
WHERE `app_code` = 'h5_outfit'
  AND `option_config` IS NOT NULL
  AND JSON_EXTRACT(`option_config`, '$.login') IS NULL;

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `path`, `component`, `permission`, `icon`, `is_visible`, `is_link`, `is_frame`, `is_cache`, `create_by`)
SELECT 5, 'H5配置', 'C', 2, '0', 'h5-config', 'ai/h5-config/index', 'ai:model:list', 'ant-design:mobile-outlined', '1', '0', '0', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `component` = 'ai/h5-config/index');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT 118, '第三方模型查询', 'F', 1, '0', 'ai:model:query', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:model:query');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT 118, '第三方模型新增', 'F', 2, '0', 'ai:model:add', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:model:add');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT 118, '第三方模型修改', 'F', 3, '0', 'ai:model:update', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:model:update');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT 118, '第三方模型删除', 'F', 4, '0', 'ai:model:delete', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:model:delete');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT 118, '第三方模型测试', 'F', 5, '0', 'ai:model:test', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:model:test');
