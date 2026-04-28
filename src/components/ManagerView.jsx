import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Filter, Trash2 } from 'lucide-react';

const LEAVE_TYPES = {
  'H': 'วันหยุดประจำ',
  'V': 'วันลาพักร้อน',
  'ลป': 'ลาป่วย',
  'ลก': 'ลากิจ',
  'ลค': 'ลาคลอด',
  'ลบ': 'ลาบวช',
};

function ManagerView({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    loadRequests();
    loadStats();
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/api/leave-requests'
        : `/api/leave-requests?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setRequests(data);
    } catch {
      showAlert('error', 'ไม่สามารถโหลดข้อมูลได้');
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/statistics');
      const data = await res.json();
      setStats(data);
    } catch {
      // ignore
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', approved_by: currentUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('success', '✅ อนุมัติคำขอสำเร็จ');
        loadRequests();
        loadStats();
      } else {
        showAlert('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      showAlert('error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('ต้องการปฏิเสธคำขอนี้?')) return;
    try {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', approved_by: currentUser.id })
      });
      if (res.ok) {
        showAlert('success', 'ปฏิเสธคำขอแล้ว');
        loadRequests();
        loadStats();
      }
    } catch {
      showAlert('error', 'เกิดข้อผิดพลาด');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('ต้องการยกเลิกคำขอนี้?')) return;
    try {
      const res = await fetch(`/api/leave-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', 'ยกเลิกคำขอแล้ว');
        loadRequests();
        loadStats();
      }
    } catch {
      showAlert('error', 'เกิดข้อผิดพลาด');
    }
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

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { label: '⏳ รออนุมัติ', cls: 'status-pending' };
      case 'approved': return { label: '✅ อนุมัติแล้ว', cls: 'status-approved' };
      case 'rejected': return { label: '❌ ไม่อนุมัติ', cls: 'status-rejected' };
      default: return { label: status, cls: '' };
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>⭐ อนุมัติคำขอวันหยุด</h2>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' }}>
          <h3>⏳ รออนุมัติ</h3>
          <div className="number">{stats.pending}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
          <h3>✅ อนุมัติแล้ว</h3>
          <div className="number">{stats.approved}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <h3>❌ ไม่อนุมัติ</h3>
          <div className="number">{stats.rejected}</div>
        </div>
        <div className="stat-card">
          <h3>👥 พนักงานทั้งหมด</h3>
          <div className="number">{stats.total_employees}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <Filter size={18} />
        <span>กรองตามสถานะ:</span>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'ทั้งหมด' :
             f === 'pending' ? '⏳ รออนุมัติ' :
             f === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ไม่อนุมัติ'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={60} />
          <h3>ไม่มีคำขอ{filter === 'pending' ? 'ที่รออนุมัติ' : ''}</h3>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(req => {
            const statusInfo = getStatusInfo(req.status);
            return (
              <div key={req.id} className="request-card">
                <div className="request-header">
                  <div>
                    <h3>{req.employee_name}</h3>
                    <span className="position-tag">{req.position}</span>
                  </div>
                  <span className={`status-badge ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="request-details">
                  <div className="detail-item">
                    <label>ประเภทการลา</label>
                    <span>{req.leave_type} - {LEAVE_TYPES[req.leave_type] || req.leave_type}</span>
                  </div>
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
                      className="btn btn-success"
                      onClick={() => handleApprove(req.id)}
                    >
                      <CheckCircle size={16} />
                      อนุมัติ
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleReject(req.id)}
                    >
                      <XCircle size={16} />
                      ปฏิเสธ
                    </button>
                  </div>
                )}
                {req.status === 'approved' && (
                  <div className="request-actions">
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancel(req.id)}
                    >
                      <Trash2 size={16} />
                      ยกเลิก
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

export default ManagerView;
