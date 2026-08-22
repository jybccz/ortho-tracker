import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();
  const id = req.query.id;

  try {
    if (req.method === 'PUT') {
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
