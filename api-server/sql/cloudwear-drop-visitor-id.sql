-- 删除旧版 H5 匿名访客字段。执行前请先备份数据库，并确认历史匿名访客数据不再需要保留查询入口。
USE `vivy-nest-admin`;

SET @has_cw_outfit_record_visitor_generation_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND INDEX_NAME = 'uk_cw_outfit_record_visitor_generation'
);
SET @ddl_cw_outfit_record_visitor_generation_idx := IF(
  @has_cw_outfit_record_visitor_generation_idx > 0,
  'ALTER TABLE `cw_outfit_record` DROP INDEX `uk_cw_outfit_record_visitor_generation`',
  'SELECT 1'
);
PREPARE stmt_cw_outfit_record_visitor_generation_idx FROM @ddl_cw_outfit_record_visitor_generation_idx;
EXECUTE stmt_cw_outfit_record_visitor_generation_idx;
DEALLOCATE PREPARE stmt_cw_outfit_record_visitor_generation_idx;

SET @has_cw_outfit_record_visitor_time_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND INDEX_NAME = 'idx_cw_outfit_record_visitor_time'
);
SET @ddl_cw_outfit_record_visitor_time_idx := IF(
  @has_cw_outfit_record_visitor_time_idx > 0,
  'ALTER TABLE `cw_outfit_record` DROP INDEX `idx_cw_outfit_record_visitor_time`',
  'SELECT 1'
);
PREPARE stmt_cw_outfit_record_visitor_time_idx FROM @ddl_cw_outfit_record_visitor_time_idx;
EXECUTE stmt_cw_outfit_record_visitor_time_idx;
DEALLOCATE PREPARE stmt_cw_outfit_record_visitor_time_idx;

SET @has_cw_outfit_record_visitor_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_outfit_record'
    AND COLUMN_NAME = 'visitor_id'
);
SET @ddl_cw_outfit_record_visitor_id := IF(
  @has_cw_outfit_record_visitor_id > 0,
  'ALTER TABLE `cw_outfit_record` DROP COLUMN `visitor_id`',
  'SELECT 1'
);
PREPARE stmt_cw_outfit_record_visitor_id FROM @ddl_cw_outfit_record_visitor_id;
EXECUTE stmt_cw_outfit_record_visitor_id;
DEALLOCATE PREPARE stmt_cw_outfit_record_visitor_id;

SET @has_cw_h5_style_profile_visitor_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_h5_style_profile'
    AND INDEX_NAME = 'idx_cw_h5_style_profile_visitor'
);
SET @ddl_cw_h5_style_profile_visitor_idx := IF(
  @has_cw_h5_style_profile_visitor_idx > 0,
  'ALTER TABLE `cw_h5_style_profile` DROP INDEX `idx_cw_h5_style_profile_visitor`',
  'SELECT 1'
);
PREPARE stmt_cw_h5_style_profile_visitor_idx FROM @ddl_cw_h5_style_profile_visitor_idx;
EXECUTE stmt_cw_h5_style_profile_visitor_idx;
DEALLOCATE PREPARE stmt_cw_h5_style_profile_visitor_idx;

SET @has_cw_h5_style_profile_visitor_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cw_h5_style_profile'
    AND COLUMN_NAME = 'visitor_id'
);
SET @ddl_cw_h5_style_profile_visitor_id := IF(
  @has_cw_h5_style_profile_visitor_id > 0,
  'ALTER TABLE `cw_h5_style_profile` DROP COLUMN `visitor_id`',
  'SELECT 1'
);
PREPARE stmt_cw_h5_style_profile_visitor_id FROM @ddl_cw_h5_style_profile_visitor_id;
EXECUTE stmt_cw_h5_style_profile_visitor_id;
DEALLOCATE PREPARE stmt_cw_h5_style_profile_visitor_id;
