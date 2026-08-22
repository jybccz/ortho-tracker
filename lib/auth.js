import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getSupabase } from './supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ortho-tracker-secret-key-change-in-production';

/**
 * 生成 JWT token
 */
export function generateToken(clinic) {
  return jwt.sign(
    { id: clinic.id, name: clinic.name, username: clinic.username, is_admin: clinic.is_admin || false },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * 从请求头解析并验证 token，返回门诊信息
 */
export function getClinicFromAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // { id, name, username }
  } catch (err) {
    return null;
  }
}

/**
 * 验证请求是否已登录，未登录返回 401
 */
export function requireAuth(req, res) {
  const clinic = getClinicFromAuth(req);
  if (!clinic) {
    res.status(401).json({ error: '请先登录' });
    return null;
  }
  return clinic;
}

/**
 * 密码加密
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * 密码验证
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export { JWT_SECRET };
