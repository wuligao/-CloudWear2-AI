-- 为已有数据库补齐菜单图标；按钮权限(menu_type = 'F')不会进入侧边菜单，不在此补丁范围内。
UPDATE `sys_menu` SET `icon` = 'ant-design:user-outlined'         WHERE `menu_id` = 100 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:team-outlined'         WHERE `menu_id` = 101 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:menu-outlined'         WHERE `menu_id` = 102 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:apartment-outlined'    WHERE `menu_id` = 103 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:idcard-outlined'       WHERE `menu_id` = 104 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:book-outlined'         WHERE `menu_id` = 105 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:profile-outlined'      WHERE `menu_id` = 106 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:control-outlined'      WHERE `menu_id` = 107 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:notification-outlined' WHERE `menu_id` = 108 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:file-search-outlined'  WHERE `menu_id` = 109 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:login-outlined'        WHERE `menu_id` = 110 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:desktop-outlined'      WHERE `menu_id` = 111 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:schedule-outlined'     WHERE `menu_id` = 112 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:history-outlined'      WHERE `menu_id` = 113 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:database-outlined'     WHERE `menu_id` = 114 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:code-outlined'         WHERE `menu_id` = 115 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:upload-outlined'       WHERE `menu_id` = 116 AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:api-outlined'          WHERE `menu_id` = 117 AND (`icon` IS NULL OR `icon` = '');

UPDATE `sys_menu` SET `icon` = 'ant-design:robot-outlined'   WHERE `menu_type` IN ('M', 'C') AND `menu_name` IN ('AI管理', 'AI配置') AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:cluster-outlined' WHERE `menu_type` IN ('M', 'C') AND (`menu_name` IN ('模型接入', '第三方模型') OR `component` = 'ai/model/index') AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:mobile-outlined'  WHERE `menu_type` IN ('M', 'C') AND (`menu_name` = 'H5配置' OR `component` = 'ai/h5-config/index') AND (`icon` IS NULL OR `icon` = '');
UPDATE `sys_menu` SET `icon` = 'ant-design:form-outlined'    WHERE `menu_type` IN ('M', 'C') AND (`menu_name` = '提示词管理' OR `component` = 'ai/prompt/index') AND (`icon` IS NULL OR `icon` = '');
