import { getSupabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();
  const id = req.query.id;

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '只支持 POST 请求' });
    }

    const { new_next_date, note } = req.body;

    if (!new_next_date) {
      return res.status(400).json({ error: '请选择下次复诊日期' });
    }

    // 调用存储过程完成确认复诊（事务操作）
    const { error } = await supabase.rpc('confirm_visit', {
      p_patient_id: parseInt(id),
      p_new_next_date: new_next_date,
      p_note: note || ''
    });

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('确认复诊失败:', err);
    return res.status(500).json({ error: err.message || '确认复诊失败' });
  }
}
