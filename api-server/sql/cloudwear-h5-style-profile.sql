-- H5风格档案表。TypeORM synchronize 已关闭，本地数据库需执行本脚本。
USE `vivy-nest-admin`;

CREATE TABLE IF NOT EXISTS `cw_h5_style_profile` (
  `profile_id` bigint NOT NULL AUTO_INCREMENT COMMENT '风格档案ID',
  `user_id` bigint NULL DEFAULT NULL COMMENT '用户ID',
  `height` varchar(40) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '身高',
  `weight` varchar(40) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '体重',
  `clothing_size` varchar(40) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '服装尺码',
  `shoe_size` varchar(40) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '鞋码',
  `favorite_styles` longtext COLLATE utf8mb4_unicode_ci NULL COMMENT '偏好风格JSON',
  `favorite_colors` longtext COLLATE utf8mb4_unicode_ci NULL COMMENT '偏好颜色JSON',
  `avoid_colors` longtext COLLATE utf8mb4_unicode_ci NULL COMMENT '避开颜色JSON',
  `common_occasions` longtext COLLATE utf8mb4_unicode_ci NULL COMMENT '常用场景JSON',
  `element_preferences` longtext COLLATE utf8mb4_unicode_ci NULL COMMENT '元素偏好JSON',
  `fit_preferences` longtext COLLATE utf8mb4_unicode_ci NULL COMMENT '版型偏好JSON',
  `body_metrics` longtext COLLATE utf8mb4_unicode_ci NULL COMMENT '身体围度JSON',
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注',
  `create_by` varchar(50) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '创建者',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(50) COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '更新者',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`profile_id`),
  KEY `idx_cw_h5_style_profile_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='H5风格档案';

SET @cloudwear_ai_menu_id := COALESCE(
  (SELECT `menu_id` FROM `sys_menu` WHERE `menu_name` = 'AI模型管理' AND `menu_type` = 'M' ORDER BY `menu_id` LIMIT 1),
  (SELECT `menu_id` FROM `sys_menu` WHERE `menu_name` IN ('AI管理', 'AI配置') AND `menu_type` = 'M' ORDER BY `menu_id` LIMIT 1),
  5
);

INSERT INTO `sys_menu`
  (`parent_id`, `menu_name`, `menu_type`, `menu_sort`, `status`, `path`, `component`, `permission`, `icon`, `is_visible`, `is_link`, `is_frame`, `is_cache`, `create_by`)
SELECT @cloudwear_ai_menu_id, '风格档案查询', 'C', 2, '0', 'style-profile', 'ai/style-profile/index', 'outfit:record:list', 'ant-design:idcard-outlined', '1', '0', '0', '0', 'system'
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `component` = 'ai/style-profile/index');

UPDATE `sys_menu`
SET
  `parent_id` = @cloudwear_ai_menu_id,
  `menu_sort` = 2,
  `path` = 'style-profile',
  `component` = 'ai/style-profile/index',
  `permission` = 'outfit:record:list',
  `icon` = 'ant-design:idcard-outlined',
  `is_visible` = '1'
WHERE `component` = 'ai/style-profile/index';
