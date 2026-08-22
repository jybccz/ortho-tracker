-- ============================================
-- 管理员功能 - 数据库迁移脚本
-- ============================================

-- 添加管理员字段
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 把第一个注册的门诊设为管理员
UPDATE clinics SET is_admin = TRUE
WHERE id = (SELECT MIN(id) FROM clinics);

-- 刷新缓存
NOTIFY pgrst, 'reload schema';
