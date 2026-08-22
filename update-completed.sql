-- 添加治疗完成标记字段
ALTER TABLE patients ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- 更新总览视图，包含 completed 字段
CREATE OR REPLACE VIEW patient_summary AS
SELECT
  p.id,
  p.name,
  p.next_visit_date,
  p.completed,
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

-- 更新统计函数，增加已完成计数
CREATE OR REPLACE FUNCTION get_stats()
RETURNS JSON AS $$
DECLARE
  total_count INT;
  overdue_count INT;
  upcoming_count INT;
  not_booked_count INT;
  completed_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM patients;

  SELECT COUNT(*) INTO overdue_count
  FROM patients
  WHERE next_visit_date IS NOT NULL
    AND next_visit_date < CURRENT_DATE
    AND (completed IS NULL OR completed = FALSE);

  SELECT COUNT(*) INTO upcoming_count
  FROM patients
  WHERE next_visit_date IS NOT NULL
    AND next_visit_date >= CURRENT_DATE
    AND next_visit_date <= CURRENT_DATE + INTERVAL '7 days'
    AND (completed IS NULL OR completed = FALSE);

  SELECT COUNT(*) INTO not_booked_count
  FROM patients
  WHERE next_visit_date IS NULL
    AND (completed IS NULL OR completed = FALSE);

  SELECT COUNT(*) INTO completed_count
  FROM patients
  WHERE completed = TRUE;

  RETURN json_build_object(
    'total', total_count,
    'overdue', overdue_count,
    'upcoming', upcoming_count,
    'not_booked', not_booked_count,
    'completed', completed_count
  );
END;
$$ LANGUAGE plpgsql;
