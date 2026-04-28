import React, { useState, useEffect } from 'react';
import { Printer, Download, ChevronLeft, ChevronRight, Edit2, Save, X, Plus, Trash2, Palette } from 'lucide-react';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const DEFAULT_SHIFT_CODES = {
  'H': { label: 'วันหยุดประจำ', color: '#ffcccc' },
  'F': { label: 'วันหยุดนักขัตฤก', color: '#ffcccc' },
  'V': { label: 'วันลาพักร้อน', color: '#ffffcc' },
  '5': { label: 'กะงาน 10:00 - 19:00', color: '#ccffcc' },
  '10': { label: 'กะงาน 12:00 - 21:00', color: '#ccffcc' },
  '8': { label: 'กะงาน 11:00 - 20:00', color: '#ccffcc' },
  '12': { label: 'กะงาน 13:00 - 22:00', color: '#ccffcc' },
  'M': { label: 'ประชุมสาขา', color: '#ccccff' },
  'HQ': { label: 'ประชุม HQ', color: '#ccccff' },
  'T': { label: 'อบรม', color: '#ffccff' },
  'T10': { label: 'อบรมเข้ากะ 10', color: '#ffccff' },
  'ลป': { label: 'ลาป่วย', color: '#ffffcc' },
  'ลก': { label: 'ลากิจ', color: '#ffffcc' },
  'ลค': { label: 'ลาคลอด', color: '#ffffcc' },
  'ลบ': { label: 'ลาบวช', color: '#ffffcc' },
};

function ShiftScheduler({ currentUser }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');
  const [alert, setAlert] = useState(null);
  const [shiftCodes, setShiftCodes] = useState(DEFAULT_SHIFT_CODES);
  const [editingCode, setEditingCode] = useState(null);
  const [newCodeForm, setNewCodeForm] = useState({ code: '', label: '', color: '#ccffcc' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [selectedColorCode, setSelectedColorCode] = useState(null);

  useEffect(() => {
    loadData();
    // Load shift codes from localStorage
    const savedCodes = localStorage.getItem('shiftCodes');
    if (savedCodes) {
      try {
        setShiftCodes(JSON.parse(savedCodes));
      } catch (e) {
        console.error('Error loading shift codes:', e);
      }
    }
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

      const [empRes, shiftsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/shifts/range?start_date=${startDate}&end_date=${endDate}`)
      ]);

      const emps = await empRes.json();
      const shiftsData = await shiftsRes.json();

      setEmployees(emps);

      // Organize shifts by employee and date
      const shiftsMap = {};
      shiftsData.forEach(shift => {
        const key = `${shift.employee_id}_${shift.date}`;
        shiftsMap[key] = shift;
      });
      setShifts(shiftsMap);
    } catch (error) {
      showAlert('error', 'ไม่สามารถโหลดข้อมูลได้');
    }
    setLoading(false);
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const canEdit = ['manager', 'absm'].includes(currentUser.role);

  if (!canEdit) {
    return (
      <div className="alert alert-error">
        ⚠️ คุณไม่มีสิทธิ์เซ็ทกะงาน เฉพาะ BSM และ ABSM เท่านั้น
      </div>
    );
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const handleCellClick = (employeeId, day) => {
    if (!canEdit) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${employeeId}_${dateStr}`;
    const shift = shifts[key];

    setEditingCell({ employeeId, dateStr });
    setEditValue(shift?.shift_code || '');
    setEditNote(shift?.note || '');
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: editingCell.employeeId,
          date: editingCell.dateStr,
          shift_code: editValue || null,
          note: editNote || null,
          created_by: currentUser.id
        })
      });

      if (res.ok) {
        const shift = await res.json();
        const key = `${shift.employee_id}_${shift.date}`;
        setShifts(prev => ({ ...prev, [key]: shift }));
        setEditingCell(null);
        showAlert('success', '✅ บันทึกกะงานสำเร็จ');
      } else {
        const error = await res.json();
        showAlert('error', error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      showAlert('error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
    setEditNote('');
  };

  const getShiftForCell = (employeeId, day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${employeeId}_${dateStr}`;
    return shifts[key];
  };

  const getShiftColor = (shiftCode) => {
    if (!shiftCode) return '#ffffff';
    const baseCode = shiftCode.split('/')[0];
    return shiftCodes[baseCode]?.color || shiftCodes[shiftCode]?.color || '#ffffff';
  };

  const handlePrint = () => {
    window.print();
  };

  // Shift Code Management Functions
  const handleAddCode = async () => {
    if (!newCodeForm.code.trim() || !newCodeForm.label.trim()) {
      showAlert('error', 'กรุณากรอกรหัสและชื่อกะงาน');
      return;
    }

    if (shiftCodes[newCodeForm.code]) {
      showAlert('error', 'รหัสกะงานนี้มีอยู่แล้ว');
      return;
    }

    const updatedCodes = {
      ...shiftCodes,
      [newCodeForm.code]: {
        label: newCodeForm.label,
        color: newCodeForm.color
      }
    };
    setShiftCodes(updatedCodes);
    // Save to localStorage
    localStorage.setItem('shiftCodes', JSON.stringify(updatedCodes));
    setNewCodeForm({ code: '', label: '', color: '#ccffcc' });
    setShowAddForm(false);
    showAlert('success', '✅ เพิ่มรหัสกะงานสำเร็จ');
  };

  const handleEditCode = (code) => {
    setEditingCode({
      code,
      label: shiftCodes[code].label,
      color: shiftCodes[code].color
    });
  };

  const handleSaveCode = () => {
    if (!editingCode.label.trim()) {
      showAlert('error', 'กรุณากรอกชื่อกะงาน');
      return;
    }

    const updatedCodes = {
      ...shiftCodes,
      [editingCode.code]: {
        label: editingCode.label,
        color: editingCode.color
      }
    };
    setShiftCodes(updatedCodes);
    // Save to localStorage
    localStorage.setItem('shiftCodes', JSON.stringify(updatedCodes));
    setEditingCode(null);
    showAlert('success', '✅ แก้ไขรหัสกะงานสำเร็จ');
  };

  const handleDeleteCode = (code) => {
    if (window.confirm(`ต้องการลบรหัสกะงาน "${code}" หรือไม่?`)) {
      const updatedCodes = { ...shiftCodes };
      delete updatedCodes[code];
      setShiftCodes(updatedCodes);
      // Save to localStorage
      localStorage.setItem('shiftCodes', JSON.stringify(updatedCodes));
      showAlert('success', '✅ ลบรหัสกะงานสำเร็จ');
    }
  };

  const daysInMonth = getDaysInMonth().daysInMonth;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Split into 2 tables: 1-16 and 17-end
  const firstTableDays = Array.from({ length: Math.min(16, daysInMonth) }, (_, i) => i + 1);
  const secondTableDays = Array.from({ length: daysInMonth - 16 }, (_, i) => i + 17);

  const renderTable = (daysToShow, tableNum) => (
    <div className="schedule-table-wrapper">
      <table className="schedule-table">
        <thead>
          <tr>
            <th className="col-id">ID</th>
            <th className="col-name">ชื่อพนักงาน</th>
            <th className="col-position">ตำแหน่ง</th>
            {daysToShow.map(day => {
              const date = new Date(year, month, day);
              const dayOfWeek = THAI_DAYS[date.getDay()];
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <th key={day} className={`col-day ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}>
                  <div className="day-header">
                    <div className="day-name">{dayOfWeek}</div>
                    <div className="day-number">{day}</div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={`${tableNum}-${emp.id}`}>
              <td className="col-id">{emp.id}</td>
              <td className="col-name">{emp.name}</td>
              <td className="col-position">{emp.position}</td>
              {daysToShow.map(day => {
                const shift = getShiftForCell(emp.id, day);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isEditing = editingCell?.employeeId === emp.id && editingCell?.dateStr === dateStr;
                const bgColor = getShiftColor(shift?.shift_code);

                return (
                  <td
                    key={day}
                    className="col-day"
                    style={{ backgroundColor: bgColor }}
                    onClick={() => handleCellClick(emp.id, day)}
                    title={shift?.note ? `${shift.shift_code} - ${shift.note}` : shift?.shift_code}
                  >
                    {isEditing ? (
                      <div className="cell-editor">
                        <select
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          autoFocus
                        >
                          <option value="">-- ไม่มี --</option>
                          {Object.entries(shiftCodes).map(([code, data]) => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="หมายเหตุ"
                          value={editNote}
                          onChange={e => setEditNote(e.target.value)}
                        />
                        <div className="cell-actions">
                          <button onClick={handleSaveCell} className="btn-save">
                            <Save size={14} />
                          </button>
                          <button onClick={handleCancelEdit} className="btn-cancel">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="cell-content">
                        <div className="shift-code">{shift?.shift_code || ''}</div>
                        {shift?.note && <div className="shift-note">{shift.note}</div>}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <div className="header-title">
          <h2>⚙️ เซ็ทกะงาน ID1196 Studio7 Central Ayutthaya</h2>
          <p>เดือน {THAI_MONTHS[month]} ปี {year + 543}</p>
        </div>
        <div className="schedule-controls">
          <button className="btn btn-secondary" onClick={prevMonth}>
            <ChevronLeft size={18} />
            เดือนก่อน
          </button>
          <button className="btn btn-secondary" onClick={nextMonth}>
            เดือนถัดไป
            <ChevronRight size={18} />
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} />
            ปริ้นท์ (A4)
          </button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : (
        <>
          <div className="two-tables-container">
            <div className="table-section">
              {renderTable(firstTableDays, 1)}
            </div>
            {secondTableDays.length > 0 && (
              <div className="table-section">
                {renderTable(secondTableDays, 2)}
              </div>
            )}
          </div>

          <div className="schedule-legend">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0 }}>รหัสกะงาน:</h4>
              {canEdit && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowCodePanel(!showCodePanel)}
                  style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Palette size={18} />
                  จัดการรหัสกะงาน
                </button>
              )}
            </div>

            {/* Shift Code Management Panel */}
            {showCodePanel && canEdit && (
              <div className="shift-code-panel" style={{ 
                background: 'linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)',
                borderRadius: '14px',
                padding: '25px',
                marginBottom: '25px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
              }}>
                {/* Add New Code Section */}
                <div style={{ marginBottom: '25px', paddingBottom: '25px', borderBottom: '2px solid rgba(102, 126, 234, 0.2)' }}>
                  <h5 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.1rem', fontWeight: '700' }}>
                    <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    เพิ่มรหัสกะงานใหม่
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px 1fr', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#555', marginBottom: '6px' }}>รหัส</label>
                      <input
                        type="text"
                        placeholder="เช่น X"
                        value={newCodeForm.code}
                        onChange={e => setNewCodeForm({ ...newCodeForm, code: e.target.value.toUpperCase() })}
                        style={{ 
                          width: '100%',
                          padding: '10px', 
                          border: '2px solid #e0e0e0', 
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontFamily: "'Sukhumvit Set', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#555', marginBottom: '6px' }}>ชื่อกะงาน</label>
                      <input
                        type="text"
                        placeholder="เช่น กะงานพิเศษ"
                        value={newCodeForm.label}
                        onChange={e => setNewCodeForm({ ...newCodeForm, label: e.target.value })}
                        style={{ 
                          width: '100%',
                          padding: '10px', 
                          border: '2px solid #e0e0e0', 
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontFamily: "'Sukhumvit Set', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#555', marginBottom: '6px' }}>สี</label>
                      <input
                        type="color"
                        value={newCodeForm.color}
                        onChange={e => setNewCodeForm({ ...newCodeForm, color: e.target.value })}
                        style={{ 
                          width: '100%',
                          padding: '6px', 
                          border: '2px solid #e0e0e0', 
                          borderRadius: '8px',
                          cursor: 'pointer', 
                          height: '40px'
                        }}
                      />
                    </div>
                    <button 
                      className="btn btn-success" 
                      onClick={handleAddCode}
                      style={{ padding: '10px 16px', fontSize: '0.9rem', width: '100%' }}
                    >
                      <Save size={16} />
                      บันทึก
                    </button>
                  </div>
                </div>

                {/* Existing Codes List */}
                <div>
                  <h5 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.1rem', fontWeight: '700' }}>
                    รหัสกะงานที่มีอยู่ ({Object.keys(shiftCodes).length})
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                    {Object.entries(shiftCodes).map(([code, data]) => (
                      <div 
                        key={code} 
                        style={{ 
                          background: 'white',
                          borderRadius: '12px',
                          padding: '15px',
                          border: '2px solid #e0e0e0',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)'}
                      >
                        {editingCode?.code === code ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div>
                                <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px', display: 'block' }}>สี</label>
                                <input
                                  type="color"
                                  value={editingCode.color}
                                  onChange={e => setEditingCode({ ...editingCode, color: e.target.value })}
                                  style={{ 
                                    width: '50px',
                                    height: '40px',
                                    padding: '4px', 
                                    border: '2px solid #667eea', 
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                  title="คลิกเพื่อเปลี่ยนสี"
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>รหัส</div>
                                <input
                                  type="text"
                                  value={editingCode.code}
                                  disabled
                                  style={{ 
                                    width: '100%',
                                    padding: '8px', 
                                    border: '1px solid #ddd', 
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    background: '#f5f5f5'
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px', display: 'block' }}>ชื่อกะงาน</label>
                              <input
                                type="text"
                                value={editingCode.label}
                                onChange={e => setEditingCode({ ...editingCode, label: e.target.value })}
                                style={{ 
                                  width: '100%',
                                  padding: '8px', 
                                  border: '2px solid #667eea', 
                                  borderRadius: '6px',
                                  fontSize: '0.9rem',
                                  fontFamily: "'Sukhumvit Set', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-success" 
                                onClick={handleSaveCode}
                                style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                              >
                                <Save size={14} />
                                บันทึก
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => setEditingCode(null)}
                                style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                              >
                                <X size={14} />
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div 
                                style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  borderRadius: '8px', 
                                  background: data.color,
                                  border: '2px solid #ddd',
                                  flexShrink: 0
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
                                  {code}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                  {data.label}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => handleEditCode(code)}
                                style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                              >
                                <Edit2 size={14} />
                                แก้ไข
                              </button>
                              <button 
                                className="btn btn-danger" 
                                onClick={() => handleDeleteCode(code)}
                                style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
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
                </div>
              </div>
            )}

            {/* Legend Display */}
            <div className="legend-grid">
              {Object.entries(shiftCodes).map(([code, data]) => (
                <div key={code} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <div 
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '4px', 
                      background: data.color,
                      border: '1px solid #ddd',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#333' }}>{code}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '8px' }}>= {data.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default ShiftScheduler;
