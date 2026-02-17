import { useEffect, useState } from 'react';
import { getActivityLogs } from '../services/api';
import './History.css';

export default function History() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
  getActivityLogs()
    .then(res => setLogs(res.data || []))   
    .catch(() => setLogs([]));
}, []);


return (
  <div className="history-dashboard">

    <div className="dashboard-header">
      <div className="header-left">
        <div className="logo-container">
          <div>
            <h1 className="dashboard-title">ประวัติการใช้งานระบบ</h1>
            <p className="dashboard-subtitle">รายการกิจกรรมทั้งหมดในระบบ</p>
          </div>
        </div>
      </div>
    </div>

    {/* ✅ ครอบเนื้อหาทั้งหมด */}
    <div className="history-content">

      {logs.length === 0 && (
        <div className="empty-box">
          ไม่มีประวัติการใช้งาน
        </div>
      )}

      {/* ✅ Logs */}
      {logs.map(log => (
        <div key={log._id} className="history-card">

          <div className="history-card-header">
            <div className={`history-action-badge ${log.action}`}>
              {log.action}
            </div>

            <div className="history-date">
              {new Date(log.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="history-body">
            <div className="history-info">
              {log.description}
            </div>

            {log.department && (
              <div className="history-info">
                หน่วยงาน: {log.department}
              </div>
            )}
          </div>

        </div>
      ))}
 </div>
    </div>
  );
}
