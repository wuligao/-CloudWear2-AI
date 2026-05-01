-- AI提示词模板管理。TypeORM synchronize 已关闭，本地数据库需执行本脚本。

CREATE TABLE IF NOT EXISTS `cw_ai_prompt_template` (
  `prompt_id` bigint NOT NULL AUTO_INCREMENT COMMENT '提示词ID',
  `prompt_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '提示词名称',
  `scene` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '适用场景',
  `prompt_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'image' COMMENT '提示词类型 image/text/multimodal',
  `status` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态（0启用 1停用）',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '提示词摘要',
  `prompt_content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '提示词内容',
  `usage_guide` longtext COLLATE utf8mb4_unicode_ci COMMENT '使用说明',
  `applicable_models` longtext COLLATE utf8mb4_unicode_ci COMMENT '适用模型JSON',
  `usage_count` int NOT NULL DEFAULT 0 COMMENT '使用次数',
  `last_used_time` datetime DEFAULT NULL COMMENT '最后使用时间',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `create_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`prompt_id`),
  UNIQUE KEY `uk_cw_ai_prompt_name` (`prompt_name`),
  KEY `idx_cw_ai_prompt_scene` (`scene`),
  KEY `idx_cw_ai_prompt_type` (`prompt_type`),
  KEY `idx_cw_ai_prompt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI提示词模板';

INSERT INTO `cw_ai_prompt_template`
  (`prompt_name`, `scene`, `prompt_type`, `status`, `description`, `prompt_content`, `usage_guide`, `applicable_models`, `usage_count`, `sort_order`, `create_by`)
SELECT '高质量图像生成通用提示词', '图像生成', 'image', '0',
       '生成高质量、清晰、细节丰富的图像，适用于多种通用图像生成场景。',
       '请生成一张高质量、清晰、细节丰富的图像，光线自然、色彩和谐，构图合理，主体突出，背景简洁，整体效果专业美观，符合用户需求。',
       '适用于大多数图像生成场景，可根据具体需求调整关键词和细节描述。',
       JSON_ARRAY('Stable Diffusion', 'Midjourney', 'DALL-E', '通义万相'),
       12532, 10, 'system'
WHERE NOT EXISTS (SELECT 1 FROM `cw_ai_prompt_template` WHERE `prompt_name` = '高质量图像生成通用提示词');

INSERT INTO `cw_ai_prompt_template`
  (`prompt_name`, `scene`, `prompt_type`, `status`, `description`, `prompt_content`, `usage_guide`, `applicable_models`, `usage_count`, `sort_order`, `create_by`)
SELECT '商品图生成提示词', '商品图', 'image', '0',
       '用于电商商品图生成，突出商品主体、背景简洁清晰。',
       '生成一张专业电商商品图，商品主体清晰完整，材质细节真实，背景干净高级，光影自然，适合商品详情页和营销展示。',
       '可补充商品品类、材质、品牌调性、背景色和营销平台要求。',
       JSON_ARRAY('Stable Diffusion', 'Midjourney', 'DALL-E'),
       8765, 20, 'system'
WHERE NOT EXISTS (SELECT 1 FROM `cw_ai_prompt_template` WHERE `prompt_name` = '商品图生成提示词');

INSERT INTO `cw_ai_prompt_template`
  (`prompt_name`, `scene`, `prompt_type`, `status`, `description`, `prompt_content`, `usage_guide`, `applicable_models`, `usage_count`, `sort_order`, `create_by`)
SELECT '人像写真风格提示词', '人像写真', 'image', '0',
       '生成自然真实的人像写真，强调光影、情绪和服装表现。',
       '生成自然真实的人像写真，人物五官清晰，皮肤质感自然，服装层次明确，光影柔和，构图有杂志感，整体高级且不过度修饰。',
       '适合头像、写真、穿搭展示类场景，注意补充年龄、风格和环境。',
       JSON_ARRAY('Midjourney', 'DALL-E', '通义万相'),
       15248, 30, 'system'
WHERE NOT EXISTS (SELECT 1 FROM `cw_ai_prompt_template` WHERE `prompt_name` = '人像写真风格提示词');

INSERT INTO `cw_ai_prompt_template`
  (`prompt_name`, `scene`, `prompt_type`, `status`, `description`, `prompt_content`, `usage_guide`, `applicable_models`, `usage_count`, `sort_order`, `create_by`)
SELECT '服装试穿生成提示词', '虚拟试穿', 'image', '0',
       '用于虚拟试穿场景，保持人物姿态和服装细节真实自然。',
       '基于用户照片生成虚拟试穿效果，保持人物身份、姿态和身形比例自然，服装贴合身体结构，材质纹理真实，光照与原图一致。',
       '适合上传真人照片后的服装替换、穿搭预览和搭配试穿。',
       JSON_ARRAY('GPT Image', 'DALL-E', '通义万相'),
       21423, 40, 'system'
WHERE NOT EXISTS (SELECT 1 FROM `cw_ai_prompt_template` WHERE `prompt_name` = '服装试穿生成提示词');

INSERT INTO `cw_ai_prompt_template`
  (`prompt_name`, `scene`, `prompt_type`, `status`, `description`, `prompt_content`, `usage_guide`, `applicable_models`, `usage_count`, `sort_order`, `create_by`)
SELECT '场景图生成提示词', '场景图', 'image', '1',
       '生成真实自然的场景图，包含环境、光线、氛围与空间层次。',
       '生成真实自然的场景图片，空间层次清晰，光线符合场景时间，氛围统一，主体与背景关系合理，避免过度装饰和杂乱元素。',
       '适合海报背景、产品场景图、生活方式场景图。',
       JSON_ARRAY('Stable Diffusion', 'Midjourney'),
       6321, 50, 'system'
WHERE NOT EXISTS (SELECT 1 FROM `cw_ai_prompt_template` WHERE `prompt_name` = '场景图生成提示词');

INSERT INTO `cw_ai_prompt_template`
  (`prompt_name`, `scene`, `prompt_type`, `status`, `description`, `prompt_content`, `usage_guide`, `applicable_models`, `usage_count`, `sort_order`, `create_by`)
SELECT '文案润色提示词', '文案生成', 'text', '0',
       '优化文案表达，使其更流畅、专业、有吸引力。',
       '请将以下内容润色为更自然、有吸引力且专业的文案，保留核心信息，避免夸张和空泛表达，输出适合直接使用的版本。',
       '适合标题、简介、商品卖点、社媒文案的二次润色。',
       JSON_ARRAY('GPT', 'Claude', 'DeepSeek'),
       28143, 60, 'system'
WHERE NOT EXISTS (SELECT 1 FROM `cw_ai_prompt_template` WHERE `prompt_name` = '文案润色提示词');

INSERT INTO `cw_ai_prompt_template`
  (`prompt_name`, `scene`, `prompt_type`, `status`, `description`, `prompt_content`, `usage_guide`, `applicable_models`, `usage_count`, `sort_order`, `create_by`)
SELECT '穿搭推荐提示词', '穿搭推荐', 'text', '0',
       '根据用户信息推荐合适穿搭方案，风格多样且可落地。',
       '请根据用户的季节、天气、地点、场景、风格和单品偏好，推荐完整穿搭方案。输出包含标题、总结、单品清单、温度建议和场景理由。',
       '适合 CloudWear H5 穿搭方案生成，也可作为文本规划模板。',
       JSON_ARRAY('GPT', 'Claude', 'DeepSeek'),
       9876, 70, 'system'
WHERE NOT EXISTS (SELECT 1 FROM `cw_ai_prompt_template` WHERE `prompt_name` = '穿搭推荐提示词');

SET @cloudwear_ai_menu_id := COALESCE(
  (SELECT `menu_id` FROM `sys_menu` WHERE `menu_name` IN ('AI管理', 'AI配置', 'AI模型管理') AND `menu_type` = 'M' LIMIT 1),
  5
);

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `path`, `component`, `permission`, `icon`, `is_visible`, `is_link`, `is_frame`, `is_cache`, `create_by`)
SELECT @cloudwear_ai_menu_id, '提示词管理', 'C', 4, '0', 'prompt', 'ai/prompt/index', 'ai:prompt:list', 'ant-design:form-outlined', '1', '0', '0', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `component` = 'ai/prompt/index');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT `menu_id`, '提示词查询', 'F', 1, '0', 'ai:prompt:query', '0', 'system'
FROM `sys_menu`
WHERE `component` = 'ai/prompt/index'
  AND NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:prompt:query' AND `menu_type` = 'F');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT `menu_id`, '提示词新增', 'F', 2, '0', 'ai:prompt:add', '0', 'system'
FROM `sys_menu`
WHERE `component` = 'ai/prompt/index'
  AND NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:prompt:add' AND `menu_type` = 'F');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT `menu_id`, '提示词修改', 'F', 3, '0', 'ai:prompt:update', '0', 'system'
FROM `sys_menu`
WHERE `component` = 'ai/prompt/index'
  AND NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:prompt:update' AND `menu_type` = 'F');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT `menu_id`, '提示词删除', 'F', 4, '0', 'ai:prompt:delete', '0', 'system'
FROM `sys_menu`
WHERE `component` = 'ai/prompt/index'
  AND NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:prompt:delete' AND `menu_type` = 'F');

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `permission`, `is_visible`, `create_by`)
SELECT `menu_id`, '提示词列表', 'F', 5, '0', 'ai:prompt:list', '0', 'system'
FROM `sys_menu`
WHERE `component` = 'ai/prompt/index'
  AND NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `permission` = 'ai:prompt:list' AND `menu_type` = 'F');
