import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();
  const id = req.query.id;

  try {
    if (req.method === 'PUT') {
      const { name, next_visit_date } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: '患者姓名不能为空' });
      }

      const { error } = await supabase
        .from('patients')
        .update({
          name: name.trim(),
          next_visit_date: next_visit_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
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
