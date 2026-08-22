import { getSupabase } from '../../lib/supabase.js';
import { generateToken, hashPassword, requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const { action } = req.query;

  if (action === 'register') {
    return register(req, res);
  } else if (action === 'login') {
    return login(req, res);
  } else if (action === 'me') {
    return me(req, res);
  }

  return res.status(400).json({ error: '未知操作' });
}

async function register(req, res) {
  const supabase = getSupabase();

  try {
    const { name, username, password } = req.body;

    if (!name?.trim() || !username?.trim() || !password) {
      return res.status(400).json({ error: '门诊名称、用户名和密码不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查用户名是否已存在
    const { data: existing } = await supabase
      .from('clinics')
      .select('id')
      .eq('username', username.trim())
      .single();

    if (existing) {
      return res.status(400).json({ error: '该用户名已被注册' });
    }

    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('clinics')
      .insert({
        name: name.trim(),
        username: username.trim(),
        password_hash: passwordHash
      })
      .select()
      .single();

    if (error) throw error;

    // 如果是第一个注册的门诊，把所有未分配的患者归到这个门诊
    await supabase
      .from('patients')
      .update({ clinic_id: data.id })
      .is('clinic_id', null);

    const token = generateToken(data);

    return res.status(200).json({
      token,
      clinic: { id: data.id, name: data.name, username: data.username }
    });
  } catch (err) {
    console.error('注册失败:', err);
    return res.status(500).json({ error: err.message || '注册失败' });
  }
}

async function login(req, res) {
  const supabase = getSupabase();

  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const { data: clinic, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('username', username.trim())
      .single();

    if (error || !clinic) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, clinic.password_hash);

    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken(clinic);

    return res.status(200).json({
      token,
      clinic: { id: clinic.id, name: clinic.name, username: clinic.username }
    });
  } catch (err) {
    console.error('登录失败:', err);
    return res.status(500).json({ error: err.message || '登录失败' });
  }
}

async function me(req, res) {
  const clinic = requireAuth(req, res);
  if (!clinic) return;

  return res.status(200).json({ clinic });
}
