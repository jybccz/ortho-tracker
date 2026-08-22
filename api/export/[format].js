import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();
  const format = req.query.format;

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: '只支持 GET 请求' });
    }

    const { data, error } = await supabase
      .from('patient_summary')
      .select('name, last_visit_date, next_visit_date, visit_count')
      .order('next_visit_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const fileName = encodeURIComponent(`正畸数据备份-${today}.json`);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
      return res.status(200).json({
        export_time: new Date().toISOString(),
        patients: data || []
      });
    }

    if (format === 'csv') {
      const headers = ['患者姓名', '上次复诊日期', '下次复诊日期', '复诊次数'];
      const csvLines = [headers.join(',')];

      for (const row of data || []) {
        const values = [
          row.name || '',
          row.last_visit_date || '',
          row.next_visit_date || '',
          row.visit_count || 0
        ];
        const line = values.map(v => {
          const str = String(v);
          if (str.includes(',') || str.includes('"')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        }).join(',');
        csvLines.push(line);
      }

      const csvContent = '\uFEFF' + csvLines.join('\n');
      const fileName = encodeURIComponent(`患者复诊表-${today}.csv`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
      return res.status(200).send(csvContent);
    }

    return res.status(400).json({ error: '不支持的导出格式' });
  } catch (err) {
    console.error('导出失败:', err);
    return res.status(500).json({ error: err.message || '导出失败' });
  }
}
