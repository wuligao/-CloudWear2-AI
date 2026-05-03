ALTER TABLE `cw_outfit_record`
  ADD COLUMN `generation_duration_ms` int DEFAULT NULL COMMENT '生成耗时毫秒' AFTER `failed_count`;
