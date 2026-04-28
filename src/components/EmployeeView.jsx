import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import TeamCalendar from './TeamCalendar';

const LEAVE_TYPES = [
  { value: 'H', label: 'H - วันหยุดประจำ' },
  { value: 'V', label: 'V - วันลาพักร้อน' },
  { value: 'ลป', label: 'ลป - ลาป่วย' },
  { value: 'ลก', label: 'ลก - ลากิจ' },
  { value: 'ลค', label: 'ลค - ลาคลอด' },
  { value: 'ลบ', label: 'ลบ - ลาบวช' },
];

function EmployeeView({ currentUser, view }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [conflictWarning, setConflictWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (view === 'my-requests') {
      loadMyRequests();
    }
  }, [view]);

  const loadMyRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave-requests?employee_id=${currentUser.id}`);
      const data = await res.json();
      setRequests(data);
    } catch {
      showAlert('error', 'ไม่สามารถโหลดข้อมูลได้');
    }
    setLoading(false);
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const checkConflicts = async () => {
    if (!form.start_date || !form.end_date) return;
    try {
      const res = await fetch('/api/leave-requests/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: form.start_date,
          end_date: form.end_date
        })
      });
      const data = await res.json();
      if (data.hasConflict) {
        setConflictWarning(data.conflicts);
      } else {
        setConflictWarning(null);
      }
    } catch {
      // ignore
    }
  };

  const handleDateChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    if (newForm.start_date && newForm.end_date) {
      setTimeout(() => checkConflicts(), 100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leave_type || !form.start_date || !form.end_date) {
      showAlert('error', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (form.start_date > form.end_date) {
      showAlert('error', 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: currentUser.id,
          ...form
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('success', '✅ ส่งคำขอวันหยุดสำเร็จ รอการอนุมัติจาก BSM');
        setForm({ leave_type: '', start_date: '', end_date: '', reason: '' });
        setConflictWarning(null);
      } else {
        showAlert('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      showAlert('error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('ต้องการยกเลิกคำขอนี้?')) return;
    try {
      const res = await fetch(`/api/leave-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', 'ยกเลิกคำขอสำเร็จ');
        loadMyRequests();
      }
    } catch {
      showAlert('error', 'เกิดข้อผิดพลาด');
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return { label: '⏳ รออนุมัติ', cls: 'status-pending' };
      case 'approved': return { label: '✅ อนุมัติแล้ว', cls: 'status-approved' };
      case 'rejected': return { label: '❌ ไม่อนุมัติ', cls: 'status-rejected' };
      default: return { label: status, cls: '' };
    }
  };

  const getLeaveTypeLabel = (type) => {
    const found = LEAVE_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const countDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  };

  if (view === 'calendar') {
    return <TeamCalendar currentUser={currentUser} />;
  }

  if (view === 'my-requests') {
    return (
      <div>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>📋 คำขอวันหยุดของฉัน</h2>

        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        )}

        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <Calendar size={60} />
            <h3>ยังไม่มีคำขอวันหยุด</h3>
            <p>กดที่ "ยื่นคำขอวันหยุด" เพื่อส่งคำขอ</p>
          </div>
        ) : (
          <div className="requests-list">
            {requests.map(req => {
              const statusInfo = getStatusLabel(req.status);
              return (
                <div key={req.id} className="request-card">
                  <div className="request-header">
                    <h3>{getLeaveTypeLabel(req.leave_type)}</h3>
                    <span className={`status-badge ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="request-details">
                    <div className="detail-item">
                      <label>วันที่เริ่ม</label>
                      <span>{formatDate(req.start_date)}</span>
                    </div>
                    <div className="detail-item">
                      <label>วันที่สิ้นสุด</label>
                      <span>{formatDate(req.end_date)}</span>
                    </div>
                    <div className="detail-item">
                      <label>จำนวนวัน</label>
                      <span>{countDays(req.start_date, req.end_date)} วัน</span>
                    </div>
                    <div className="detail-item">
                      <label>วันที่ยื่น</label>
                      <span>{formatDate(req.created_at)}</span>
                    </div>
                    {req.reason && (
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label>เหตุผล</label>
                        <span>{req.reason}</span>
                      </div>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <div className="request-actions">
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(req.id)}
                      >
                        <Trash2 size={16} />
                        ยกเลิกคำขอ
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Request form view
  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>📝 ยื่นคำขอวันหยุด</h2>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      <div className="form-section">
        <div className="employee-info-banner">
          <div>
            <strong>พนักงาน:</strong> {currentUser.name}
          </div>
          <div>
            <strong>ตำแหน่ง:</strong> {currentUser.position}
          </div>
          <div>
            <strong>รหัส:</strong> {currentUser.id}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>ประเภทการลา *</label>
              <select
                value={form.leave_type}
                onChange={e => setForm({ ...form, leave_type: e.target.value })}
                required
              >
                <option value="">-- เลือกประเภทการลา --</option>
                {LEAVE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>วันที่เริ่มลา *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => handleDateChange('start_date', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>วันที่สิ้นสุด *</label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={e => handleDateChange('end_date', e.target.value)}
                required
              />
            </div>

            {form.start_date && form.end_date && (
              <div className="form-group">
                <label>จำนวนวัน</label>
                <div className="days-count">
                  {countDays(form.start_date, form.end_date)} วัน
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>เหตุผล (ถ้ามี)</label>
            <textarea
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="ระบุเหตุผลการลา..."
            />
          </div>

          {conflictWarning && conflictWarning.length > 0 && (
            <div className="alert alert-warning">
              <AlertTriangle size={20} />
              <div>
                <strong>⚠️ คำเตือน:</strong> วันที่ต่อไปนี้มีพนักงานลาครบ 3 คนแล้ว คำขอจะถูกปฏิเสธ:
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  {conflictWarning.map(c => (
                    <li key={c.date}>{formatDate(c.date)} ({c.count} คน)</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="leave-rules">
            <h4>📌 กฎการลา</h4>
            <ul>
              <li>พนักงานหยุดชนกันได้ไม่เกิน <strong>3 คน/วัน</strong></li>
              <li>คำขอต้องได้รับการอนุมัติจาก <strong>BSM (ณกานต์)</strong></li>
              <li>สามารถยกเลิกคำขอได้ก่อนที่จะได้รับการอนุมัติ</li>
            </ul>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || (conflictWarning && conflictWarning.length > 0)}
          >
            <Calendar size={16} />
            {submitting ? 'กำลังส่ง...' : 'ส่งคำขอวันหยุด'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EmployeeView;
