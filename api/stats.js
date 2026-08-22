import { getSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: '只支持 GET 请求' });
    }

    const { data, error } = await supabase.rpc('get_stats');

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error('获取统计失败:', err);
    return res.status(500).json({ error: err.message || '获取统计失败' });
  }
}
