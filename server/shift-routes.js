const express = require('express');
const Database = require('better-sqlite3');

const router = express.Router();
const db = new Database('leave_management.db');

// Initialize shift table
db.exec(`
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    date TEXT NOT NULL,
    shift_code TEXT,
    note TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );
`);

// Shift codes definition
const SHIFT_CODES = {
  'H': 'วันหยุดประจำ',
  'F': 'วันหยุดนักขัตฤก',
  'V': 'วันลาพักร้อน',
  '5': 'กะงาน 10:00 - 19:00',
  '10': 'กะงาน 12:00 - 21:00',
  '8': 'กะงาน 11:00 - 20:00',
  '12': 'กะงาน 13:00 - 22:00',
  'M': 'ประชุมสาขา',
  'HQ': 'ประชุม HQ',
  'T': 'อบรม',
  'T10': 'อบรมเข้ากะ 10',
  'ลป': 'ลาป่วย',
  'ลก': 'ลากิจ',
  'ลค': 'ลาคลอด',
  'ลบ': 'ลาบวช',
};

// Get all shift codes
router.get('/codes', (req, res) => {
  res.json(SHIFT_CODES);
});

// Get shifts for a date range
router.get('/range', (req, res) => {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'กรุณาระบุ start_date และ end_date' });
  }

  const shifts = db.prepare(`
    SELECT s.*, e.name, e.position
    FROM shifts s
    JOIN employees e ON s.employee_id = e.id
    WHERE s.date BETWEEN ? AND ?
    ORDER BY s.date, e.name
  `).all(start_date, end_date);

  res.json(shifts);
});

// Get shifts for specific employee and date range
router.get('/employee/:employee_id', (req, res) => {
  const { employee_id } = req.params;
  const { start_date, end_date } = req.query;

  let query = 'SELECT * FROM shifts WHERE employee_id = ?';
  const params = [employee_id];

  if (start_date && end_date) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  query += ' ORDER BY date';

  const shifts = db.prepare(query).all(...params);
  res.json(shifts);
});

// Get shift for specific date
router.get('/date/:date', (req, res) => {
  const { date } = req.params;

  const shifts = db.prepare(`
    SELECT s.*, e.name, e.position
    FROM shifts s
    JOIN employees e ON s.employee_id = e.id
    WHERE s.date = ?
    ORDER BY e.name
  `).get(date);

  res.json(shifts || []);
});

// Create or update shift
router.post('/', (req, res) => {
  const { employee_id, date, shift_code, note, created_by } = req.body;

  // Verify user is BSM or ABSM
  const user = db.prepare('SELECT role, position FROM employees WHERE id = ?').get(created_by);
  if (!user || !['manager', 'absm'].includes(user.role)) {
    return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เซ็ทกะงาน' });
  }

  if (!employee_id || !date) {
    return res.status(400).json({ error: 'กรุณาระบุ employee_id และ date' });
  }

  try {
    // Check if shift exists
    const existing = db.prepare('SELECT id FROM shifts WHERE employee_id = ? AND date = ?')
      .get(employee_id, date);

    if (existing) {
      // Update
      db.prepare(`
        UPDATE shifts
        SET shift_code = ?, note = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND date = ?
      `).run(shift_code || null, note || null, created_by, employee_id, date);
    } else {
      // Insert
      db.prepare(`
        INSERT INTO shifts (employee_id, date, shift_code, note, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(employee_id, date, shift_code || null, note || null, created_by);
    }

    const shift = db.prepare('SELECT * FROM shifts WHERE employee_id = ? AND date = ?')
      .get(employee_id, date);

    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

// Delete shift
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { deleted_by } = req.body;

  // Verify user is BSM or ABSM
  const user = db.prepare('SELECT role FROM employees WHERE id = ?').get(deleted_by);
  if (!user || !['manager', 'absm'].includes(user.role)) {
    return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบกะงาน' });
  }

  try {
    db.prepare('DELETE FROM shifts WHERE id = ?').run(id);
    res.json({ message: 'ลบกะงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
  }
});

// Bulk update shifts for a month
router.post('/bulk-update', (req, res) => {
  const { shifts, updated_by } = req.body;

  // Verify user is BSM or ABSM
  const user = db.prepare('SELECT role FROM employees WHERE id = ?').get(updated_by);
  if (!user || !['manager', 'absm'].includes(user.role)) {
    return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขกะงาน' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO shifts (employee_id, date, shift_code, note, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id, date) DO UPDATE SET
        shift_code = excluded.shift_code,
        note = excluded.note,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = db.transaction((shiftsData) => {
      shiftsData.forEach(shift => {
        stmt.run(
          shift.employee_id,
          shift.date,
          shift.shift_code || null,
          shift.note || null,
          updated_by,
          updated_by
        );
      });
    });

    transaction(shifts);
    res.json({ message: 'อัพเดทกะงานสำเร็จ', count: shifts.length });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

module.exports = router;
