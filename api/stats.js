import { getSupabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: '只支持 GET 请求' });
    }

    const clinic = requireAuth(req, res);
    if (!clinic) return;

    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('get_stats', { p_clinic_id: clinic.id });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error('获取统计失败:', err);
    return res.status(500).json({ error: err.message || '获取统计失败' });
  }
}
