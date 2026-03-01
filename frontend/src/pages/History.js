import { useEffect, useState } from 'react';
import { getActivityLogs, deleteAllLogs } from '../services/api';
import './History.css';

export default function History() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getActivityLogs()
      .then(res => setLogs(res.data || []))
      .catch(() => setLogs([]));
  }, []);

  const handleDeleteLogs = async () => {
    if (!window.confirm('ลบประวัติทั้งหมด ?')) return;

    try {
      await deleteAllLogs();
      setLogs([]);
      alert('ลบแล้ว');
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    }
  };

  const formatAction = (action) => {
    switch (action) {
      case 'ADD_EQUIPMENT': return 'ADD';
      case 'UPDATE_EQUIPMENT': return 'UPDATE';
      case 'DELETE_EQUIPMENT': return 'DELETE';
      case 'BORROW': return 'BORROW';
      case 'RETURN': return 'RETURN';
      case 'REPAIR_COMPLETE': return 'REPAIR';
      default: return action;
    }
  };

  return (
    <div className="history-dashboard">

      <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">ประวัติการใช้งานระบบ</h1>
            <p className="dashboard-subtitle">รายการกิจกรรมทั้งหมดในระบบ</p>
          </div>
        </div>

        {/* ✅ Action Bar เหมือนหน้า Repair / Equipment */}
        <div className="history-actions">
          <button className="danger-btn" onClick={handleDeleteLogs}>
            ลบประวัติทั้งหมด
          </button>
        </div>

        <div className="history-content">


        {logs.length === 0 && (
          <div className="empty-box">
            ไม่มีประวัติการใช้งาน
          </div>
        )}

        {logs.map(log => (
          <div key={log._id} className="history-card">

            <div className="history-card-header">
              <div className={`history-action-badge ${log.action}`}>
                {formatAction(log.action)}
              </div>

              <div className="history-date">
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="history-body">

              {log.description?.split('|').map((line, index) => (
                <div 
                  key={index} 
                  className={index === 0 ? "history-title" : "history-info"}
                >
                  {line.trim()}
                </div>
              ))}

              {log.department && (
                <div className="history-info">
                  หน่วยงาน: <span>{log.department}</span>
                </div>
              )}

            </div>

          </div>
        ))}

      </div>
    </div>
  );
}
