import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

const LEAVE_TYPE_COLORS = {
  'H': '#6c757d',
  'V': '#28a745',
  'ลป': '#dc3545',
  'ลก': '#fd7e14',
  'ลค': '#e83e8c',
  'ลบ': '#6f42c1',
};

const LEAVE_TYPE_LABELS = {
  'H': 'หยุดประจำ',
  'V': 'พักร้อน',
  'ลป': 'ลาป่วย',
  'ลก': 'ลากิจ',
  'ลค': 'ลาคลอด',
  'ลบ': 'ลาบวช',
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function TeamCalendar({ currentUser }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesRes, empRes] = await Promise.all([
        fetch('/api/leave-requests?status=approved'),
        fetch('/api/employees')
      ]);
      const leaves = await leavesRes.json();
      const emps = await empRes.json();
      setApprovedLeaves(leaves);
      setEmployees(emps);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const getLeavesForDate = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return approvedLeaves.filter(leave => {
      return dateStr >= leave.start_date && dateStr <= leave.end_date;
    });
  };

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : id;
  };

  const { firstDay, daysInMonth } = getDaysInMonth();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const selectedDayLeaves = selectedDay ? getLeavesForDate(selectedDay) : [];

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>
        <Users size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
        ตารางวันหยุดทีม
      </h2>

      {loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : (
        <>
          {/* Calendar Header */}
          <div className="calendar-container">
            <div className="calendar-header">
              <button className="btn btn-secondary" onClick={prevMonth}>
                <ChevronLeft size={18} />
              </button>
              <h3>
                {THAI_MONTHS[month]} {year + 543}
              </h3>
              <button className="btn btn-secondary" onClick={nextMonth}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="calendar-grid">
              {THAI_DAYS.map(day => (
                <div key={day} className="calendar-day-header">{day}</div>
              ))}

              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="calendar-cell empty" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const leaves = getLeavesForDate(day);
                const isToday = today.getDate() === day &&
                  today.getMonth() === month &&
                  today.getFullYear() === year;
                const isSelected = selectedDay === day;
                const isFull = leaves.length >= 3;

                return (
                  <div
                    key={day}
                    className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  >
                    <div className="day-number">{day}</div>
                    {leaves.length > 0 && (
                      <div className="leave-indicators">
                        {leaves.slice(0, 3).map((leave, idx) => (
                          <div
                            key={idx}
                            className="leave-dot"
                            style={{ background: LEAVE_TYPE_COLORS[leave.leave_type] || '#667eea' }}
                            title={`${leave.employee_name} - ${LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}`}
                          />
                        ))}
                        {leaves.length > 3 && (
                          <div className="leave-more">+{leaves.length - 3}</div>
                        )}
                      </div>
                    )}
                    {leaves.length > 0 && (
                      <div className={`leave-count ${isFull ? 'full' : ''}`}>
                        {leaves.length}/3
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="legend">
            <h4>สัญลักษณ์:</h4>
            <div className="legend-items">
              {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                <div key={key} className="legend-item">
                  <div className="legend-dot" style={{ background: LEAVE_TYPE_COLORS[key] }} />
                  <span>{key} - {label}</span>
                </div>
              ))}
              <div className="legend-item">
                <div className="legend-dot full-indicator" />
                <span>เต็ม (3 คน)</span>
              </div>
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="day-detail">
              <h3>
                วันที่ {selectedDay} {THAI_MONTHS[month]} {year + 543}
                <span className={`leave-count-badge ${selectedDayLeaves.length >= 3 ? 'full' : ''}`}>
                  {selectedDayLeaves.length}/3 คน
                </span>
              </h3>
              {selectedDayLeaves.length === 0 ? (
                <p style={{ color: '#666' }}>ไม่มีพนักงานลาในวันนี้</p>
              ) : (
                <div className="day-leaves-list">
                  {selectedDayLeaves.map(leave => (
                    <div key={leave.id} className="day-leave-item">
                      <div
                        className="leave-type-badge"
                        style={{ background: LEAVE_TYPE_COLORS[leave.leave_type] || '#667eea' }}
                      >
                        {leave.leave_type}
                      </div>
                      <div>
                        <strong>{leave.employee_name}</strong>
                        <span className="position-tag">{leave.position}</span>
                      </div>
                      <div className="leave-type-label">
                        {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedDayLeaves.length >= 3 && (
                <div className="alert alert-warning" style={{ marginTop: '15px' }}>
                  ⚠️ วันนี้มีพนักงานลาครบ 3 คนแล้ว ไม่สามารถลาเพิ่มได้
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TeamCalendar;
