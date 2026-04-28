const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const shiftRoutes = require('./shift-routes');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new Database('leave_management.db');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    role TEXT DEFAULT 'employee',
    id_card TEXT,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    approved_by TEXT,
    approved_at TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );
`);

// Insert initial employee data
const insertEmployee = db.prepare(`
  INSERT OR REPLACE INTO employees (id, name, position, role, id_card, password) 
  VALUES (?, ?, ?, ?, ?, ?)
`);

const employees = [
  ['66337', 'ณกานต์', 'BSM', 'manager', '1-4699-00066-33-7', '66337'],
  ['02219', 'จิรายุ', 'ABSM', 'absm', '1-1014-01302-21-9', '02219'],
  ['76898', 'พุฒิพงศ์', 'DP', 'employee', '1-7205-01176-89-8', '76898'],
  ['80360', 'ศุภกานต์', 'PIA', 'employee', '1-1042-00080-36-0', '80360'],
  ['38197', 'ถิรกานต์', 'PIA', 'employee', '1-1005-00738-19-7', '38197'],
  ['58997', 'ศิมาภรณ์', 'PIA', 'employee', '1-1501-00058-99-7', '58997'],
  ['80673', 'กันต์กนิษฐ์', 'PIA', 'employee', '1-1499-00880-67-3', '80673'],
  ['25932', 'ชนิสร', 'PIA', 'employee', '1-1499-00625-93-2', '25932'],
  ['69769', 'วาบุญ', 'PIA', 'employee', '1-1005-01469-76-9', '69769'],
  ['17256', 'เฉลิมพร', 'SPS', 'employee', '2-1408-00017-25-6', '17256'],
  ['87301', 'นัฐดนัย', 'PIA BTB', 'employee', '1-5099-01487-30-1', '87301'],
  ['18954', 'พิมพ์พัชร์', 'Part Time', 'employee', '1-6002-00118-95-4', '18954'],
  ['23885', 'ฐิตาภา', 'Bilateral Student', 'employee', '1-1205-00123-88-5', '23885'],
  ['69561', 'เมธาวี', 'Bilateral Student', 'employee', '1-6005-01269-56-1', '69561']
];

employees.forEach(emp => insertEmployee.run(...emp));

// Shift routes
app.use('/api/shifts', shiftRoutes);

// API Routes

// Get all employees
app.get('/api/employees', (req, res) => {
  const employees = db.prepare(`
    SELECT * FROM employees 
    ORDER BY 
      CASE position
        WHEN 'BSM' THEN 1
        WHEN 'ABSM' THEN 2
        WHEN 'DP' THEN 3
        WHEN 'PIA' THEN 4
        WHEN 'SPS' THEN 5
        WHEN 'PIA BTB' THEN 6
        WHEN 'PC TRUE' THEN 7
        ELSE 8
      END,
      id
  `).all();
  res.json(employees);
});

// Login endpoint - validate password
app.post('/api/login', (req, res) => {
  const { id, password } = req.body;
  
  if (!id || !password) {
    return res.status(400).json({ error: 'กรุณากรอกรหัสและรหัสผ่าน' });
  }
  
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  
  if (!employee) {
    return res.status(401).json({ error: 'ไม่พบพนักงาน' });
  }
  
  // Verify password (last 5 digits of ID card)
  if (password !== employee.password) {
    return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
  }
  
  // Return employee data on successful login
  res.json({
    id: employee.id,
    name: employee.name,
    position: employee.position,
    role: employee.role,
    id_card: employee.id_card
  });
});

// Get employee by ID
app.get('/api/employees/:id', (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (employee) {
    res.json(employee);
  } else {
    res.status(404).json({ error: 'ไม่พบพนักงาน' });
  }
});

// Add new employee
app.post('/api/employees', (req, res) => {
  const { id, name, position, role } = req.body;
  
  if (!id || !name || !position) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }
  
  // Check if employee already exists
  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (existing) {
    return res.status(400).json({ error: 'รหัสพนักงานนี้มีอยู่แล้ว' });
  }
  
  try {
    db.prepare('INSERT INTO employees (id, name, position, role) VALUES (?, ?, ?, ?)').run(
      id, name, position, role || 'employee'
    );
    const newEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน' });
  }
});

// Update employee
app.patch('/api/employees/:id', (req, res) => {
  const { name, position, role } = req.body;
  const { id } = req.params;
  
  if (!name || !position) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }
  
  try {
    db.prepare('UPDATE employees SET name = ?, position = ?, role = ? WHERE id = ?').run(
      name, position, role || 'employee', id
    );
    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขพนักงาน' });
  }
});

// Delete employee
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  
  // Prevent deleting BSM and ABSM
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (employee && ['manager', 'absm'].includes(employee.role)) {
    return res.status(403).json({ error: 'ไม่สามารถลบ BSM หรือ ABSM ได้' });
  }
  
  try {
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    res.json({ message: 'ลบพนักงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบพนักงาน' });
  }
});

// Get all leave requests
app.get('/api/leave-requests', (req, res) => {
  const { status, employee_id } = req.query;
  let query = `
    SELECT lr.*, e.name as employee_name, e.position 
    FROM leave_requests lr 
    JOIN employees e ON lr.employee_id = e.id
  `;
  const params = [];
  
  if (status || employee_id) {
    query += ' WHERE';
    if (status) {
      query += ' lr.status = ?';
      params.push(status);
    }
    if (employee_id) {
      if (status) query += ' AND';
      query += ' lr.employee_id = ?';
      params.push(employee_id);
    }
  }
  
  query += ' ORDER BY lr.created_at DESC';
  
  const requests = db.prepare(query).all(...params);
  res.json(requests);
});

// Check leave conflicts for a date range
app.post('/api/leave-requests/check-conflicts', (req, res) => {
  const { start_date, end_date, exclude_id } = req.body;
  
  const conflicts = [];
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayQuery = `
      SELECT COUNT(*) as count
      FROM leave_requests
      WHERE status = 'approved'
      AND ? BETWEEN start_date AND end_date
      ${exclude_id ? 'AND id != ?' : ''}
    `;
    const dayParams = exclude_id ? [dateStr, exclude_id] : [dateStr];
    const result = db.prepare(dayQuery).get(...dayParams);
    
    if (result.count >= 3) {
      conflicts.push({
        date: dateStr,
        count: result.count
      });
    }
  }
  
  res.json({
    hasConflict: conflicts.length > 0,
    conflicts
  });
});

// Create leave request
app.post('/api/leave-requests', (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;
  
  if (!employee_id || !leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }
  
  const conflicts = [];
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM leave_requests
      WHERE status = 'approved'
      AND ? BETWEEN start_date AND end_date
    `).get(dateStr);
    
    if (result.count >= 3) {
      conflicts.push(dateStr);
    }
  }
  
  if (conflicts.length > 0) {
    return res.status(400).json({ 
      error: 'มีพนักงานลาเกิน 3 คนในวันที่: ' + conflicts.join(', ')
    });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(employee_id, leave_type, start_date, end_date, reason);
    
    const newRequest = db.prepare(`
      SELECT lr.*, e.name as employee_name, e.position 
      FROM leave_requests lr 
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

// Update leave request status (approve/reject)
app.patch('/api/leave-requests/:id', (req, res) => {
  const { status, approved_by } = req.body;
  const { id } = req.params;
  
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
  }
  
  const approver = db.prepare('SELECT role FROM employees WHERE id = ?').get(approved_by);
  if (!approver || !['manager', 'absm'].includes(approver.role)) {
    return res.status(403).json({ error: 'คุณไม่มีสิทธิ์อนุมัติ' });
  }
  
  if (status === 'approved') {
    const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    const conflicts = [];
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM leave_requests
        WHERE status = 'approved'
        AND ? BETWEEN start_date AND end_date
        AND id != ?
      `).get(dateStr, id);
      
      if (result.count >= 3) {
        conflicts.push(dateStr);
      }
    }
    
    if (conflicts.length > 0) {
      return res.status(400).json({ 
        error: 'มีพนักงานลาเกิน 3 คนในวันที่: ' + conflicts.join(', ')
      });
    }
  }
  
  try {
    db.prepare(`
      UPDATE leave_requests 
      SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, approved_by, id);
    
    const updated = db.prepare(`
      SELECT lr.*, e.name as employee_name, e.position 
      FROM leave_requests lr 
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.id = ?
    `).get(id);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล' });
  }
});

// Delete leave request
app.delete('/api/leave-requests/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    db.prepare('DELETE FROM leave_requests WHERE id = ?').run(id);
    res.json({ message: 'ลบคำขอสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
  }
});

// Get leave statistics
app.get('/api/statistics', (req, res) => {
  const stats = {
    pending: db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE status = "pending"').get().count,
    approved: db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE status = "approved"').get().count,
    rejected: db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE status = "rejected"').get().count,
    total_employees: db.prepare('SELECT COUNT(*) as count FROM employees').get().count
  };
  
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
