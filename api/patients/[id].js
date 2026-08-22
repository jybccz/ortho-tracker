import { getSupabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  const supabase = getSupabase();
  const id = req.query.id;

  try {
    if (req.method === 'PUT') {
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

      const { name, next_visit_date, completed } = req.body;

      if (name !== undefined && !name.trim()) {
        return res.status(400).json({ error: '患者姓名不能为空' });
      }

      const updateData = { updated_at: new Date().toISOString() };
      if (name !== undefined) updateData.name = name.trim();
      if (next_visit_date !== undefined) updateData.next_visit_date = next_visit_date || null;
      if (completed !== undefined) updateData.completed = completed;

      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
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

      const { error } = await supabase
        .from('patients')
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
