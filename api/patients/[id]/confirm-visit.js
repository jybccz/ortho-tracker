import { getSupabase } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export default async function handler(req, res) {
  const supabase = getSupabase();
  const id = req.query.id;

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '只支持 POST 请求' });
    }

    const clinic = requireAuth(req, res);
    if (!clinic) return;

    // 验证患者属于当前门诊
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('id', id)
      .eq('clinic_id', clinic.id)
      .single();

    if (!patient) {
      return res.status(403).json({ error: '无权操作此患者' });
    }

    const { new_next_date, note } = req.body;

    const { error } = await supabase.rpc('confirm_visit', {
      p_patient_id: parseInt(id),
      p_new_next_date: new_next_date || null,
      p_note: note || ''
    });

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('确认复诊失败:', err);
    return res.status(500).json({ error: err.message || '确认复诊失败' });
  }
}
