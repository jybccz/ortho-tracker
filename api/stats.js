import { getSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: '只支持 GET 请求' });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      return res.status(500).json({
        error: '环境变量未设置',
        url_set: !!url,
        key_set: !!key
      });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('get_stats');

    if (error) {
      return res.status(500).json({
        error: error.message,
        code: error.code,
        details: JSON.stringify(error)
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('获取统计失败:', err);
    return res.status(500).json({
      error: err.message || '获取统计失败',
      stack: err.stack
    });
  }
}
