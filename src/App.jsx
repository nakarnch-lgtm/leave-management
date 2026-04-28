import React, { useState, useEffect } from 'react';
import { Calendar, ClipboardList, CheckCircle, Settings, LogOut, BarChart3, Users } from 'lucide-react';
import EmployeeView from './components/EmployeeView';
import ManagerView from './components/ManagerView';
import ScheduleView from './components/ScheduleView';
import ShiftScheduler from './components/ShiftScheduler';
import EmployeeManagement from './components/EmployeeManagement';
import LoginPage from './components/LoginPage';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('request');

  const handleLogin = (user) => {
    setCurrentUser(user);
    setActiveTab(user.role === 'manager' ? 'approve' : 'request');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>📅 ระบบจัดการวันหยุด</h1>
        <p>Studio7 Central Ayutthaya (ID1196)</p>
      </div>

      <div className="user-bar">
        <div className="user-info">
          <div className="user-avatar">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="user-name">{currentUser.name}</div>
            <div className="user-position">{currentUser.position} {currentUser.role === 'manager' ? '(ผู้อนุมัติ)' : ''}</div>
          </div>
        </div>
        <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          ออกจากระบบ
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          <Calendar size={18} />
          ยื่นคำขอวันหยุด
        </button>
        <button
          className={`tab ${activeTab === 'my-requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-requests')}
        >
          <ClipboardList size={18} />
          คำขอของฉัน
        </button>
        {currentUser.role === 'manager' && (
          <button
            className={`tab ${activeTab === 'approve' ? 'active' : ''}`}
            onClick={() => setActiveTab('approve')}
          >
            <CheckCircle size={18} />
            อนุมัติคำขอ
          </button>
        )}
        <button
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <BarChart3 size={18} />
          ตารางงาน
        </button>
        {['manager', 'absm'].includes(currentUser.role) && (
          <button
            className={`tab ${activeTab === 'shift' ? 'active' : ''}`}
            onClick={() => setActiveTab('shift')}
          >
            <Settings size={18} />
            เซ็ทกะงาน
          </button>
        )}
        {currentUser.role === 'manager' && (
          <button
            className={`tab ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            <Users size={18} />
            จัดการพนักงาน
          </button>
        )}
      </div>

      <div className="content">
        {activeTab === 'request' && (
          <EmployeeView currentUser={currentUser} view="request" />
        )}
        {activeTab === 'my-requests' && (
          <EmployeeView currentUser={currentUser} view="my-requests" />
        )}
        {activeTab === 'approve' && currentUser.role === 'manager' && (
          <ManagerView currentUser={currentUser} />
        )}
        {activeTab === 'schedule' && (
          <ScheduleView currentUser={currentUser} />
        )}
        {activeTab === 'shift' && ['manager', 'absm'].includes(currentUser.role) && (
          <ShiftScheduler currentUser={currentUser} />
        )}
        {activeTab === 'employees' && currentUser.role === 'manager' && (
          <EmployeeManagement currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}

export default App;
