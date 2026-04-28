import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const POSITIONS = ['BSM', 'ABSM', 'DP', 'PIA', 'SPS', 'PIA BTB', 'PC TRUE'];

function EmployeeManagement({ currentUser }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEmployee, setNewEmployee] = useState({ id: '', name: '', position: 'PIA', role: 'employee' });
  const [editEmployee, setEditEmployee] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      showAlert('error', 'ไม่สามารถโหลดข้อมูลพนักงานได้');
    }
    setLoading(false);
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const canManage = ['manager', 'absm'].includes(currentUser.role);

  if (!canManage) {
    return (
      <div className="alert alert-error">
        ⚠️ คุณไม่มีสิทธิ์จัดการพนักงาน เฉพาะ BSM และ ABSM เท่านั้น
      </div>
    );
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.id.trim() || !newEmployee.name.trim()) {
      showAlert('error', 'กรุณากรอกรหัสและชื่อพนักงาน');
      return;
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });

      if (res.ok) {
        const added = await res.json();
        setEmployees([...employees, added]);
        setNewEmployee({ id: '', name: '', position: 'PIA', role: 'employee' });
        setShowAddForm(false);
        showAlert('success', '✅ เพิ่มพนักงานสำเร็จ');
        loadEmployees();
      } else {
        const error = await res.json();
        showAlert('error', error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      showAlert('error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editEmployee.name.trim()) {
      showAlert('error', 'กรุณากรอกชื่อพนักงาน');
      return;
    }

    try {
      const res = await fetch(`/api/employees/${editEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEmployee)
      });

      if (res.ok) {
        const updated = await res.json();
        setEmployees(employees.map(e => e.id === updated.id ? updated : e));
        setEditingId(null);
        setEditEmployee(null);
        showAlert('success', '✅ แก้ไขพนักงานสำเร็จ');
        loadEmployees();
      } else {
        const error = await res.json();
        showAlert('error', error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      showAlert('error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('ต้องการลบพนักงานนี้หรือไม่?')) return;

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setEmployees(employees.filter(e => e.id !== id));
        showAlert('success', '✅ ลบพนักงานสำเร็จ');
      } else {
        const error = await res.json();
        showAlert('error', error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      showAlert('error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <div className="employee-management">
      <div className="management-header">
        <h2>👥 จัดการพนักงาน</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          เพิ่มพนักงาน
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="form-card" style={{ marginBottom: '25px', background: 'linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)', padding: '25px', borderRadius: '14px' }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>เพิ่มพนักงานใหม่</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>รหัสพนักงาน</label>
              <input
                type="text"
                placeholder="เช่น 12413"
                value={newEmployee.id}
                onChange={e => setNewEmployee({ ...newEmployee, id: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>ชื่อพนักงาน</label>
              <input
                type="text"
                placeholder="เช่น ณกานต์"
                value={newEmployee.name}
                onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#555', marginBottom: '8px' }}>ตำแหน่ง</label>
              <select
                value={newEmployee.position}
                onChange={e => setNewEmployee({ ...newEmployee, position: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                {POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-success"
              onClick={handleAddEmployee}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              บันทึก
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowAddForm(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <X size={16} />
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Employees List */}
      {loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {employees.map(emp => (
            <div 
              key={emp.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid #e0e0e0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)'}
            >
              {editingId === emp.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px', display: 'block' }}>ชื่อพนักงาน</label>
                    <input
                      type="text"
                      value={editEmployee.name}
                      onChange={e => setEditEmployee({ ...editEmployee, name: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '2px solid #667eea', borderRadius: '6px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px', display: 'block' }}>ตำแหน่ง</label>
                    <select
                      value={editEmployee.position}
                      onChange={e => setEditEmployee({ ...editEmployee, position: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '2px solid #667eea', borderRadius: '6px', fontSize: '0.9rem' }}
                    >
                      {POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-success"
                      onClick={handleUpdateEmployee}
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Save size={14} />
                      บันทึก
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => { setEditingId(null); setEditEmployee(null); }}
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <X size={14} />
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
                      {emp.name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '4px' }}>
                      ID: {emp.id}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      ตำแหน่ง: <span style={{ fontWeight: '600', color: '#667eea' }}>{emp.position}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => { setEditingId(emp.id); setEditEmployee({ ...emp }); }}
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Edit2 size={14} />
                      แก้ไข
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteEmployee(emp.id)}
                      disabled={['manager', 'absm'].includes(emp.role)}
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: ['manager', 'absm'].includes(emp.role) ? 0.5 : 1, cursor: ['manager', 'absm'].includes(emp.role) ? 'not-allowed' : 'pointer' }}
                      title={['manager', 'absm'].includes(emp.role) ? 'ไม่สามารถลบ BSM/ABSM ได้' : ''}
                    >
                      <Trash2 size={14} />
                      ลบ
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmployeeManagement;
