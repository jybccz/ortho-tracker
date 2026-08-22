import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
    }

    client = createClient(url, key);
  }
  return client;
}
