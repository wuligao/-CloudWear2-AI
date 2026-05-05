ALTER TABLE `cw_h5_style_profile`
  ADD COLUMN `gender_preference` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '穿搭性别偏好' AFTER `shoe_size`;
