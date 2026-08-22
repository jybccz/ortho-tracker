import { getSupabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  const supabase = getSupabase();
  const id = req.query.id;

  try {
    if (req.method === 'PUT') {
      const clinic = requireAuth(req, res);
      if (!clinic) return;

      // 验证记录属于当前门诊的患者
      const { data: record } = await supabase
        .from('visit_records')
        .select('id, patient_id')
        .eq('id', id)
        .single();

      if (!record) {
        return res.status(404).json({ error: '记录不存在' });
      }

      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('id', record.patient_id)
        .eq('clinic_id', clinic.id)
        .single();

      if (!patient) {
        return res.status(403).json({ error: '无权操作此记录' });
      }

      const { visit_date, note } = req.body;

      const { error } = await supabase
        .from('visit_records')
        .update({
          visit_date,
          note: note || ''
        })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const clinic = requireAuth(req, res);
      if (!clinic) return;

      const { data: record } = await supabase
        .from('visit_records')
        .select('id, patient_id')
        .eq('id', id)
        .single();

      if (!record) {
        return res.status(404).json({ error: '记录不存在' });
      }

      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('id', record.patient_id)
        .eq('clinic_id', clinic.id)
        .single();

      if (!patient) {
        return res.status(403).json({ error: '无权操作此记录' });
      }

      const { error } = await supabase
        .from('visit_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: '不支持的请求方法' });
  } catch (err) {
    console.error('操作失败:', err);
    return res.status(500).json({ error: err.message || '操作失败' });
  }
}
