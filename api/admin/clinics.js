import { getSupabase } from '../../lib/supabase.js';
import { requireAuth, hashPassword } from '../../lib/auth.js';

export default async function handler(req, res) {
  const clinic = requireAuth(req, res);
  if (!clinic) return;

  if (!clinic.is_admin) {
    return res.status(403).json({ error: '无权操作，仅管理员可用' });
  }

  const supabase = getSupabase();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, username, is_admin, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { clinic_id, new_password } = req.body;

      if (!clinic_id || !new_password || new_password.length < 6) {
        return res.status(400).json({ error: '密码至少6位' });
      }

      const passwordHash = await hashPassword(new_password);

      const { error } = await supabase
        .from('clinics')
        .update({ password_hash: passwordHash })
        .eq('id', clinic_id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: '不支持的请求方法' });
  } catch (err) {
    console.error('管理操作失败:', err);
    return res.status(500).json({ error: err.message || '操作失败' });
  }
}
