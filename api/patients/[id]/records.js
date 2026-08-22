import { getSupabase } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export default async function handler(req, res) {
  const supabase = getSupabase();
  const id = req.query.id;

  try {
    if (req.method === 'GET') {
      const clinic = requireAuth(req, res);
      if (!clinic) return;

      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('id', id)
        .eq('clinic_id', clinic.id)
        .single();

      if (!patient) {
        return res.status(403).json({ error: '无权操作此患者' });
      }

      const { data, error } = await supabase
        .from('visit_records')
        .select('id, visit_date, note, created_at')
        .eq('patient_id', id)
        .order('visit_date', { ascending: false })
        .order('id', { ascending: false });

      if (error) throw error;

      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const clinic = requireAuth(req, res);
      if (!clinic) return;

      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('id', id)
        .eq('clinic_id', clinic.id)
        .single();

      if (!patient) {
        return res.status(403).json({ error: '无权操作此患者' });
      }

      const { visit_date, note } = req.body;

      if (!visit_date) {
        return res.status(400).json({ error: '复诊日期不能为空' });
      }

      const { data, error } = await supabase
        .from('visit_records')
        .insert({
          patient_id: parseInt(id),
          visit_date,
          note: note || ''
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: '不支持的请求方法' });
  } catch (err) {
    console.error('操作失败:', err);
    return res.status(500).json({ error: err.message || '操作失败' });
  }
}
