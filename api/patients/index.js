import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();

  try {
    if (req.method === 'GET') {
      const search = req.query.search || '';
      const sort = req.query.sort || 'next_visit';

      let query = supabase
        .from('patient_summary')
        .select('id, name, next_visit_date, completed, last_visit_date, visit_count');

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (sort === 'name') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('next_visit_date', { ascending: true, nullsFirst: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      let result = data || [];

      // 默认隐藏已完成的患者
      const showCompleted = req.query.show_completed === 'true';
      if (!showCompleted) {
        result = result.filter(p => !p.completed);
      }

      // 逾期优先排序
      if (sort === 'overdue') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        result = result.sort((a, b) => {
          const getStatusPriority = (p) => {
            if (!p.next_visit_date) return 3;
            const d = new Date(p.next_visit_date);
            d.setHours(0, 0, 0, 0);
            const diff = (d - today) / (1000 * 60 * 60 * 24);
            if (diff < 0) return 0;
            if (diff <= 7) return 1;
            return 2;
          };
          return getStatusPriority(a) - getStatusPriority(b);
        });
      }

      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { name, next_visit_date } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: '患者姓名不能为空' });
      }

      const { data, error } = await supabase
        .from('patients')
        .insert({ name: name.trim(), next_visit_date: next_visit_date || null })
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
