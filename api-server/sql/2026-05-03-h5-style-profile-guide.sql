ALTER TABLE `cw_h5_style_profile`
  ADD COLUMN `base_photos` longtext NULL COMMENT '基础照片JSON' AFTER `body_metrics`,
  ADD COLUMN `analysis_report` longtext NULL COMMENT 'AI分析报告JSON' AFTER `base_photos`,
  ADD COLUMN `recommended_colors` longtext NULL COMMENT '推荐色彩JSON' AFTER `analysis_report`,
  ADD COLUMN `recommended_styles` longtext NULL COMMENT '推荐风格JSON' AFTER `recommended_colors`,
  ADD COLUMN `analysis_updated_at` datetime NULL COMMENT 'AI分析更新时间' AFTER `recommended_styles`;
