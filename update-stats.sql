-- 更新统计函数，增加"未预约"计数
CREATE OR REPLACE FUNCTION get_stats()
RETURNS JSON AS $$
DECLARE
  total_count INT;
  overdue_count INT;
  upcoming_count INT;
  not_booked_count INT;
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

  SELECT COUNT(*) INTO not_booked_count
  FROM patients
  WHERE next_visit_date IS NULL;

  RETURN json_build_object(
    'total', total_count,
    'overdue', overdue_count,
    'upcoming', upcoming_count,
    'not_booked', not_booked_count
  );
END;
$$ LANGUAGE plpgsql;
