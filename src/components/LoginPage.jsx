import React, { useState, useEffect } from 'react';
import { User, Lock } from 'lucide-react';

function LoginPage({ onLogin }) {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(data => {
        setEmployees(data);
        setLoading(false);
      })
      .catch(() => {
        setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        setLoading(false);
      });
  }, []);

  const handleLogin = async () => {
    if (!selectedId) {
      setError('กรุณาเลือกชื่อพนักงาน');
      return;
    }
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, password })
      });

      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const error = await res.json();
        setError(error.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
    setIsLoggingIn(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span>📅</span>
        </div>
        <h1>ระบบจัดการวันหยุด</h1>
        <p className="login-subtitle">Studio7 Central Ayutthaya</p>

        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : (
          <div className="login-form">
            <div className="form-group">
              <label>
                <User size={16} />
                เลือกชื่อพนักงาน
              </label>
              <select
                value={selectedId}
                onChange={e => {
                  setSelectedId(e.target.value);
                  setPassword('');
                  setError('');
                }}
              >
                <option value="">-- เลือกพนักงาน --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                    {emp.role === 'manager' ? ' ⭐' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <Lock size={16} />
                รหัสผ่าน (5 ตัวท้ายบัตรประชาชน)
              </label>
              <input
                type="password"
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }}
              />
            </div>

            <button
              className="btn btn-primary login-btn"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              <Lock size={16} />
              {isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </div>
        )}

        <div className="login-note">
          <p>⭐ = BSM (ผู้อนุมัติ)</p>
          <p style={{ fontSize: '0.85rem', marginTop: '8px', color: '#666' }}>รหัสผ่านคือ 5 ตัวท้ายของเลขบัตรประชาชน</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
