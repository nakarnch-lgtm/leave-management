import React, { useState, useEffect } from 'react';
import { Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

// Default color mapping for shift types
const DEFAULT_SHIFT_COLORS = {
  'H': '#ffcccc',      // วันหยุดประจำ - ชมพู
  'F': '#ffcccc',      // วันหยุดนักขัตฤก - ชมพู
  'V': '#ffffcc',      // วันลาพักร้อน - เหลือง
  'ลป': '#ffffcc',     // ลาป่วย - เหลือง
  'ลก': '#ffffcc',     // ลากิจ - เหลือง
  'ลค': '#ffffcc',     // ลาคลอด - เหลือง
  'ลบ': '#ffffcc',     // ลาบวช - เหลือง
  '5': '#ccffcc',      // กะงาน 10:00-19:00 - เขียว
  '10': '#ccffcc',     // กะงาน 12:00-21:00 - เขียว
  '8': '#ccffcc',      // กะงาน 11:00-20:00 - เขียว
  '12': '#ccffcc',     // กะงาน 13:00-22:00 - เขียว
  'M': '#ccccff',      // ประชุมสาขา - น้ำเงิน
  'HQ': '#ccccff',     // ประชุม HQ - น้ำเงิน
  'T': '#ffccff',      // อบรม - ม่วง
  'T10': '#ffccff',    // อบรมเข้ากะ 10 - ม่วง
};

function ScheduleView({ currentUser }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState({});
  const [loading, setLoading] = useState(false);
  const [shiftCodes, setShiftCodes] = useState(DEFAULT_SHIFT_COLORS);
  const [shiftCodeLabels, setShiftCodeLabels] = useState({});

  useEffect(() => {
    loadData();
    // Load shift codes from localStorage
    const savedCodes = localStorage.getItem('shiftCodes');
    if (savedCodes) {
      try {
        const codesObj = JSON.parse(savedCodes);
        // Convert to color map and labels map
        const colorMap = {};
        const labelsMap = {};
        Object.entries(codesObj).forEach(([code, data]) => {
          colorMap[code] = data.color;
          labelsMap[code] = data.label;
        });
        setShiftCodes(colorMap);
        setShiftCodeLabels(labelsMap);
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
    } catch {
      alert('ไม่สามารถโหลดข้อมูลได้');
    }
    setLoading(false);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return daysInMonth;
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
    return shiftCodes[baseCode] || shiftCodes[shiftCode] || '#ffffff';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const daysInMonth = getDaysInMonth();
    
    let csv = `ตารางงาน ID1196 Studio7 Central Ayutthaya\n`;
    csv += `เดือน ${THAI_MONTHS[currentDate.getMonth()]} ปี ${year + 543}\n\n`;
    csv += `ID,ชื่อพนักงาน,ตำแหน่ง`;
    
    for (let day = 1; day <= daysInMonth; day++) {
      csv += `,${day}`;
    }
    csv += '\n';
    
    employees.forEach(emp => {
      csv += `${emp.id},"${emp.name}",${emp.position}`;
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = getShiftForCell(emp.id, day);
        csv += `,${shift?.shift_code || ''}`;
      }
      csv += '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule_${year}_${month}.csv`);
    link.click();
  };

  const daysInMonth = getDaysInMonth();
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
                const bgColor = getShiftColor(shift?.shift_code);
                return (
                  <td
                    key={day}
                    className="col-day"
                    style={{ backgroundColor: bgColor }}
                    title={shift?.note ? `${shift.shift_code} - ${shift.note}` : shift?.shift_code}
                  >
                    <div className="cell-content">
                      <div className="shift-code">{shift?.shift_code || ''}</div>
                      {shift?.note && <div className="shift-note">{shift.note}</div>}
                    </div>
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
          <h2>📊 ตารางงาน ID1196 Studio7 Central Ayutthaya</h2>
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
          <button className="btn btn-primary" onClick={handleDownloadCSV}>
            <Download size={18} />
            ดาวน์โหลด CSV
          </button>
        </div>
      </div>

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

          {/* Legend */}
          <div className="schedule-legend">
            <h4>รหัสกะงาน:</h4>
            <div className="legend-grid">
              {Object.entries(shiftCodes).map(([code, color]) => (
                <div key={code} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <div 
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '4px', 
                      background: color,
                      border: '1px solid #ddd',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#333' }}>{code}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '8px' }}>= {shiftCodeLabels[code] || ''}</span>
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

export default ScheduleView;
