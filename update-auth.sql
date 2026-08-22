-- ============================================
-- 多门诊登录功能 - 数据库迁移脚本
-- ============================================

-- 创建门诊表
CREATE TABLE IF NOT EXISTS clinics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 给患者表添加门诊ID字段
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id BIGINT REFERENCES clinics(id) ON DELETE CASCADE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);

-- 删除旧视图
DROP VIEW IF EXISTS patient_summary;

-- 重新创建视图（包含 clinic_id 和 completed）
CREATE VIEW patient_summary AS
SELECT
  p.id,
  p.name,
  p.next_visit_date,
  p.completed,
  p.clinic_id,
  p.created_at,
  p.updated_at,
  (
    SELECT visit_date FROM visit_records
    WHERE patient_id = p.id
    ORDER BY visit_date DESC
    LIMIT 1
  ) AS last_visit_date,
  (
    SELECT COUNT(*) FROM visit_records
    WHERE patient_id = p.id
  ) AS visit_count
FROM patients p;

-- 更新统计函数（按门诊过滤）
CREATE OR REPLACE FUNCTION get_stats(p_clinic_id BIGINT)
RETURNS JSON AS $$
DECLARE
  total_count INT;
  overdue_count INT;
  upcoming_count INT;
  not_booked_count INT;
  completed_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM patients WHERE clinic_id = p_clinic_id;

  SELECT COUNT(*) INTO overdue_count
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND next_visit_date IS NOT NULL
    AND next_visit_date < CURRENT_DATE
    AND (completed IS NULL OR completed = FALSE);

  SELECT COUNT(*) INTO upcoming_count
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND next_visit_date IS NOT NULL
    AND next_visit_date >= CURRENT_DATE
    AND next_visit_date <= CURRENT_DATE + INTERVAL '7 days'
    AND (completed IS NULL OR completed = FALSE);

  SELECT COUNT(*) INTO not_booked_count
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND next_visit_date IS NULL
    AND (completed IS NULL OR completed = FALSE);

  SELECT COUNT(*) INTO completed_count
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND completed = TRUE;

  RETURN json_build_object(
    'total', total_count,
    'overdue', overdue_count,
    'upcoming', upcoming_count,
    'not_booked', not_booked_count,
    'completed', completed_count
  );
END;
$$ LANGUAGE plpgsql;

-- 刷新缓存
NOTIFY pgrst, 'reload schema';
