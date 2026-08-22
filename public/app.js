/**
 * 正畸复诊管理系统 - 前端逻辑
 */

// 全局变量
let currentPatientId = null;
let confirmPatientId = null;

// ========== 页面初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadPatients();

  // 点击弹窗外部关闭
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
});

// ========== 统计数据 ==========
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('stat-total').textContent = data.total;
    document.getElementById('stat-upcoming').textContent = data.upcoming;
    document.getElementById('stat-overdue').textContent = data.overdue;
    document.getElementById('stat-not-booked').textContent = data.not_booked || 0;
    document.getElementById('stat-completed').textContent = data.completed || 0;
  } catch (err) {
    console.error('加载统计失败:', err);
  }
}

// ========== 患者列表 ==========
async function loadPatients() {
  try {
    const search = document.getElementById('searchInput').value;
    const sort = document.getElementById('sortSelect').value;
    const showCompleted = document.getElementById('showCompleted').checked;

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    if (showCompleted) params.set('show_completed', 'true');

    const res = await fetch(`/api/patients?${params.toString()}`);
    const patients = await res.json();

    renderPatientTable(patients);
  } catch (err) {
    console.error('加载患者列表失败:', err);
    showToast('加载失败，请刷新重试', 'error');
  }
}

function renderPatientTable(patients) {
  const tbody = document.getElementById('patientTableBody');
  const emptyState = document.getElementById('emptyState');

  if (patients.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  tbody.innerHTML = patients.map((p, index) => {
    const { rowClass, statusText, statusClass } = getVisitStatus(p.next_visit_date, today, p.completed);

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td>
          <a class="patient-name" onclick="showPatientDetail(${p.id}, '${escapeHtml(p.name)}')">
            ${escapeHtml(p.name)}
          </a>
        </td>
        <td>${p.last_visit_date || '<span style="color:#aaa;">—</span>'}</td>
        <td style="font-weight:500;">
          ${p.next_visit_date || '<span style="color:#aaa;">未设置</span>'}
          <button class="btn btn-link" onclick="openEditDateModal(${p.id}, '${escapeHtml(p.name)}', '${p.next_visit_date || ''}')" title="修改日期">✏️</button>
        </td>
        <td>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="date" class="date-input" id="nextDate_${p.id}" placeholder="选择日期">
            <button class="btn btn-primary btn-sm" onclick="openConfirmVisit(${p.id}, '${escapeHtml(p.name)}', '${p.next_visit_date || ''}')">
              确认
            </button>
          </div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline btn-sm" onclick="showPatientDetail(${p.id}, '${escapeHtml(p.name)}')">详情</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 根据下次复诊日期计算状态
 */
function getVisitStatus(nextDateStr, today, completed) {
  if (completed) {
    return { rowClass: 'row-completed', statusText: '已完成', statusClass: 'status-completed' };
  }

  if (!nextDateStr) {
    return { rowClass: 'row-danger', statusText: '未预约', statusClass: 'status-danger' };
  }

  const nextDate = new Date(nextDateStr);
  nextDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      rowClass: 'row-danger',
      statusText: `逾期${Math.abs(diffDays)}天`,
      statusClass: 'status-danger'
    };
  } else if (diffDays === 0) {
    return {
      rowClass: 'row-warning',
      statusText: '今天复诊',
      statusClass: 'status-warning'
    };
  } else if (diffDays <= 7) {
    return {
      rowClass: 'row-warning',
      statusText: `还有${diffDays}天`,
      statusClass: 'status-warning'
    };
  } else {
    return {
      rowClass: 'row-normal',
      statusText: '正常',
      statusClass: 'status-normal'
    };
  }
}

// ========== 新增患者 ==========
function showAddPatientModal() {
  document.getElementById('newPatientName').value = '';
  document.getElementById('newPatientNextDate').value = '';
  openModal('addPatientModal');
}

async function addPatient() {
  const name = document.getElementById('newPatientName').value.trim();
  const next_visit_date = document.getElementById('newPatientNextDate').value;

  if (!name) {
    showToast('请输入患者姓名', 'error');
    return;
  }

  try {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, next_visit_date })
    });

    if (res.ok) {
      showToast('添加成功', 'success');
      closeModal('addPatientModal');
      loadPatients();
      loadStats();
    } else {
      const data = await res.json();
      showToast(data.error || '添加失败', 'error');
    }
  } catch (err) {
    showToast('添加失败', 'error');
  }
}

// ========== 确认复诊（核心操作） ==========
function openConfirmVisit(patientId, patientName, currentNextDate) {
  confirmPatientId = patientId;

  const dateInput = document.getElementById(`nextDate_${patientId}`);
  const dateValue = dateInput ? dateInput.value : '';

  let text = `确认 ${patientName} 完成本次复诊？`;
  if (currentNextDate && currentNextDate !== 'null') {
    text += `<br><br>本次复诊日期：<strong>${currentNextDate}</strong>`;
  }
  text += `<br><br>下方可填新的下次复诊日期，<strong>不填则暂不预约</strong>`;

  document.getElementById('confirmVisitText').innerHTML = text;
  document.getElementById('newNextDate').value = dateValue;
  document.getElementById('visitNote').value = '';

  openModal('confirmVisitModal');
}

async function submitConfirmVisit() {
  const newNextDate = document.getElementById('newNextDate').value;
  const note = document.getElementById('visitNote').value;

  try {
    const res = await fetch(`/api/patients/${confirmPatientId}/confirm-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_next_date: newNextDate, note })
    });

    if (res.ok) {
      showToast('复诊确认成功', 'success');
      closeModal('confirmVisitModal');
      loadPatients();
      loadStats();
    } else {
      const data = await res.json();
      showToast(data.error || '操作失败', 'error');
    }
  } catch (err) {
    showToast('操作失败', 'error');
  }
}

// ========== 患者详情 & 历史记录 ==========
async function showPatientDetail(patientId, patientName) {
  currentPatientId = patientId;
  document.getElementById('detailPatientName').textContent = patientName;
  document.getElementById('recordsList').innerHTML = '<div class="no-records">加载中...</div>';
  hideAddRecordForm();

  try {
    // 先获取患者基本信息
    const patientsRes = await fetch('/api/patients?show_completed=true');
    const patients = await patientsRes.json();
    const patient = patients.find(p => p.id === patientId);

    if (patient) {
      document.getElementById('detailNextDate').textContent = patient.next_visit_date || '未设置';
      document.getElementById('detailVisitCount').textContent = patient.visit_count + ' 次';
      const completeBtn = document.getElementById('toggleCompleteBtn');
      if (patient.completed) {
        completeBtn.textContent = '取消完成标记';
      } else {
        completeBtn.textContent = '标记治疗完成';
      }
    }

    // 获取历史记录
    const res = await fetch(`/api/patients/${patientId}/records`);
    const records = await res.json();
    renderRecords(records);

    openModal('patientDetailModal');
  } catch (err) {
    showToast('加载详情失败', 'error');
  }
}

function renderRecords(records) {
  const list = document.getElementById('recordsList');

  if (records.length === 0) {
    list.innerHTML = '<div class="no-records">暂无复诊记录</div>';
    return;
  }

  list.innerHTML = records.map(r => `
    <div class="record-item" id="record_${r.id}">
      <div class="record-display">
        <div class="record-date">${r.visit_date}</div>
        ${r.note ? `<div class="record-note">${escapeHtml(r.note)}</div>` : ''}
      </div>
      <div class="record-edit" style="display:none;">
        <input type="date" id="editRecordDate_${r.id}" value="${r.visit_date}" class="date-input">
        <input type="text" id="editRecordNote_${r.id}" value="${escapeHtml(r.note || '')}" placeholder="备注" class="note-input">
      </div>
      <div class="record-actions">
        <button class="record-edit-btn" onclick="toggleEditRecord(${r.id})" id="editBtn_${r.id}">编辑</button>
        <button class="record-delete" onclick="deleteRecord(${r.id})">删除</button>
      </div>
    </div>
  `).join('');
}

// 补录记录
function showAddRecordForm() {
  document.getElementById('addRecordForm').style.display = 'block';
  document.getElementById('newRecordDate').value = '';
  document.getElementById('newRecordNote').value = '';
}

function hideAddRecordForm() {
  document.getElementById('addRecordForm').style.display = 'none';
}

async function addRecord() {
  const visit_date = document.getElementById('newRecordDate').value;
  const note = document.getElementById('newRecordNote').value;

  if (!visit_date) {
    showToast('请选择复诊日期', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/patients/${currentPatientId}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_date, note })
    });

    if (res.ok) {
      showToast('添加成功', 'success');
      hideAddRecordForm();
      // 刷新记录列表
      const recordsRes = await fetch(`/api/patients/${currentPatientId}/records`);
      const records = await recordsRes.json();
      renderRecords(records);
      loadPatients();
      loadStats();
    } else {
      const data = await res.json();
      showToast(data.error || '添加失败', 'error');
    }
  } catch (err) {
    showToast('添加失败', 'error');
  }
}

async function deleteRecord(recordId) {
  if (!confirm('确定要删除这条复诊记录吗？')) return;

  try {
    const res = await fetch(`/api/records/${recordId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('删除成功', 'success');
      // 刷新
      const recordsRes = await fetch(`/api/patients/${currentPatientId}/records`);
      const records = await recordsRes.json();
      renderRecords(records);
      loadPatients();
      loadStats();
    } else {
      showToast('删除失败', 'error');
    }
  } catch (err) {
    showToast('删除失败', 'error');
  }
}

// ========== 修改下次复诊日期 ==========
let editDatePatientId = null;

function openEditDateModal(patientId, patientName, currentDate) {
  editDatePatientId = patientId;
  document.getElementById('editDateTitle').textContent = `修改 ${patientName} 的复诊日期`;
  document.getElementById('editNextDate').value = currentDate || '';
  openModal('editDateModal');
}

async function submitEditDate() {
  const newDate = document.getElementById('editNextDate').value;

  try {
    const res = await fetch(`/api/patients/${editDatePatientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next_visit_date: newDate || null })
    });

    if (res.ok) {
      showToast('修改成功', 'success');
      closeModal('editDateModal');
      loadPatients();
      loadStats();
    } else {
      const data = await res.json();
      showToast(data.error || '修改失败', 'error');
    }
  } catch (err) {
    showToast('修改失败', 'error');
  }
}

// ========== 修改患者姓名 ==========
function openEditNameModal() {
  const name = document.getElementById('detailPatientName').textContent;
  document.getElementById('editPatientName').value = name;
  openModal('editNameModal');
}

async function submitEditName() {
  const newName = document.getElementById('editPatientName').value.trim();

  if (!newName) {
    showToast('请输入姓名', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/patients/${currentPatientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });

    if (res.ok) {
      showToast('修改成功', 'success');
      document.getElementById('detailPatientName').textContent = newName;
      closeModal('editNameModal');
      loadPatients();
    } else {
      const data = await res.json();
      showToast(data.error || '修改失败', 'error');
    }
  } catch (err) {
    showToast('修改失败', 'error');
  }
}

// ========== 编辑复诊记录 ==========
function toggleEditRecord(recordId) {
  const item = document.getElementById(`record_${recordId}`);
  const display = item.querySelector('.record-display');
  const edit = item.querySelector('.record-edit');
  const btn = document.getElementById(`editBtn_${recordId}`);

  if (edit.style.display === 'none') {
    display.style.display = 'none';
    edit.style.display = 'block';
    btn.textContent = '保存';
    btn.onclick = () => submitEditRecord(recordId);
  } else {
    display.style.display = 'block';
    edit.style.display = 'none';
    btn.textContent = '编辑';
    btn.onclick = () => toggleEditRecord(recordId);
  }
}

async function submitEditRecord(recordId) {
  const visit_date = document.getElementById(`editRecordDate_${recordId}`).value;
  const note = document.getElementById(`editRecordNote_${recordId}`).value;

  if (!visit_date) {
    showToast('请选择日期', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/records/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_date, note })
    });

    if (res.ok) {
      showToast('修改成功', 'success');
      const recordsRes = await fetch(`/api/patients/${currentPatientId}/records`);
      const records = await recordsRes.json();
      renderRecords(records);
      loadPatients();
      loadStats();
    } else {
      const data = await res.json();
      showToast(data.error || '修改失败', 'error');
    }
  } catch (err) {
    showToast('修改失败', 'error');
  }
}

// ========== 标记治疗完成 ==========
async function toggleComplete() {
  const completeBtn = document.getElementById('toggleCompleteBtn');
  const isCompleted = completeBtn.textContent.includes('取消');
  const newCompleted = !isCompleted;

  try {
    const res = await fetch(`/api/patients/${currentPatientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: newCompleted })
    });

    if (res.ok) {
      showToast(newCompleted ? '已标记为治疗完成' : '已取消完成标记', 'success');
      completeBtn.textContent = newCompleted ? '取消完成标记' : '标记治疗完成';
      loadPatients();
      loadStats();
    } else {
      showToast('操作失败', 'error');
    }
  } catch (err) {
    showToast('操作失败', 'error');
  }
}

// ========== 删除患者 ==========
async function deletePatient() {
  if (!confirm('确定要删除这位患者吗？所有复诊记录也会被删除，此操作不可恢复！')) return;

  try {
    const res = await fetch(`/api/patients/${currentPatientId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('删除成功', 'success');
      closeModal('patientDetailModal');
      loadPatients();
      loadStats();
    } else {
      showToast('删除失败', 'error');
    }
  } catch (err) {
    showToast('删除失败', 'error');
  }
}

// ========== 批量导入 ==========
let batchImportData = [];

function showBatchImportModal() {
  batchImportData = [];
  document.getElementById('csvFileInput').value = '';
  document.getElementById('csvPreview').style.display = 'none';
  document.getElementById('batchImportBtn').disabled = true;
  openModal('batchImportModal');
}

function downloadCSVTemplate() {
  const csv = '\uFEFF姓名,下次复诊日期\n张三,2026-09-24\n李四,\n王五,2026-10-15';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '患者导入模板.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result.replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter(l => l.trim());

    if (lines.length < 2) {
      showToast('文件内容太少，请检查格式', 'error');
      return;
    }

    // 解析第一行表头
    const headers = parseCSVLine(lines[0]).map(h => h.trim());

    // 找到姓名和日期列
    const nameIdx = headers.findIndex(h => h.includes('姓名') || h.toLowerCase().includes('name'));
    const dateIdx = headers.findIndex(h => h.includes('日期') || h.includes('复诊') || h.toLowerCase().includes('date'));

    if (nameIdx === -1) {
      showToast('找不到"姓名"列，请检查表头', 'error');
      return;
    }

    batchImportData = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const name = cols[nameIdx]?.trim();
      const nextDate = dateIdx !== -1 ? cols[dateIdx]?.trim() : '';
      if (name) {
        batchImportData.push({ name, next_visit_date: nextDate || '' });
      }
    }

    if (batchImportData.length === 0) {
      showToast('没有有效的患者数据', 'error');
      return;
    }

    // 显示预览
    const preview = batchImportData.slice(0, 5).map(p =>
      `<div style="padding:4px 0; border-bottom:1px solid #eee;">${escapeHtml(p.name)} — ${p.next_visit_date || '<span style="color:#aaa;">未设置</span>'}</div>`
    ).join('');
    document.getElementById('csvPreviewContent').innerHTML = preview;
    document.getElementById('csvTotalCount').textContent = `共 ${batchImportData.length} 条患者数据`;
    document.getElementById('csvPreview').style.display = 'block';
    document.getElementById('batchImportBtn').disabled = false;
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function submitBatchImport() {
  if (batchImportData.length === 0) return;

  document.getElementById('batchImportBtn').disabled = true;
  document.getElementById('batchImportBtn').textContent = '导入中...';

  try {
    const res = await fetch('/api/patients/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patients: batchImportData })
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`成功导入 ${data.count} 位患者`, 'success');
      closeModal('batchImportModal');
      loadPatients();
      loadStats();
    } else {
      const data = await res.json();
      showToast(data.error || '导入失败', 'error');
    }
  } catch (err) {
    showToast('导入失败', 'error');
  }

  document.getElementById('batchImportBtn').disabled = false;
  document.getElementById('batchImportBtn').textContent = '确认导入';
}

// ========== 导出 ==========
function exportCSV() {
  window.location.href = '/api/export/csv';
  showToast('正在导出...', 'success');
}

// ========== 工具函数 ==========
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
