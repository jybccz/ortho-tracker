import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '只支持 POST 请求' });
    }

    const { patients } = req.body;

    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ error: '没有可导入的患者数据' });
    }

    // 构建插入数据
    const rows = patients
      .filter(p => p.name && p.name.trim())
      .map(p => ({
        name: p.name.trim(),
        next_visit_date: p.next_visit_date || null
      }));

    if (rows.length === 0) {
      return res.status(400).json({ error: '没有有效的患者数据' });
    }

    const { data, error } = await supabase
      .from('patients')
      .insert(rows)
      .select();

    if (error) throw error;

    return res.status(200).json({ success: true, count: data.length });
  } catch (err) {
    console.error('批量导入失败:', err);
    return res.status(500).json({ error: err.message || '批量导入失败' });
  }
}
