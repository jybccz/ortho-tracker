-- ============================================
-- 正畸复诊管理系统 - Supabase 数据库初始化脚本
-- 在 Supabase 的 SQL Editor 中执行此文件
-- ============================================

-- 创建患者表
CREATE TABLE IF NOT EXISTS patients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  next_visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建复诊记录表
CREATE TABLE IF NOT EXISTS visit_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_visit_records_patient ON visit_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

-- 创建患者总览视图（自动计算上次复诊和复诊次数）
CREATE OR REPLACE VIEW patient_summary AS
SELECT
  p.id,
  p.name,
  p.next_visit_date,
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

-- 确认复诊的存储过程（事务操作）
CREATE OR REPLACE FUNCTION confirm_visit(
  p_patient_id BIGINT,
  p_new_next_date DATE,
  p_note TEXT DEFAULT ''
)
RETURNS VOID AS $$
DECLARE
  v_current_next DATE;
BEGIN
  SELECT next_visit_date INTO v_current_next
  FROM patients WHERE id = p_patient_id;

  IF v_current_next IS NOT NULL THEN
    INSERT INTO visit_records (patient_id, visit_date, note)
    VALUES (p_patient_id, v_current_next, p_note);
  END IF;

  UPDATE patients
  SET next_visit_date = p_new_next_date,
      updated_at = NOW()
  WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql;

-- 获取统计数据的存储过程
CREATE OR REPLACE FUNCTION get_stats()
RETURNS JSON AS $$
DECLARE
  total_count INT;
  overdue_count INT;
  upcoming_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM patients;

  SELECT COUNT(*) INTO overdue_count
  FROM patients
  WHERE next_visit_date IS NOT NULL
    AND next_visit_date < CURRENT_DATE;

  SELECT COUNT(*) INTO upcoming_count
  FROM patients
  WHERE next_visit_date IS NOT NULL
    AND next_visit_date >= CURRENT_DATE
    AND next_visit_date <= CURRENT_DATE + INTERVAL '7 days';

  RETURN json_build_object(
    'total', total_count,
    'overdue', overdue_count,
    'upcoming', upcoming_count
  );
END;
$$ LANGUAGE plpgsql;
