import { useEffect, useState } from 'react';
import { getActivityLogs, deleteAllLogs } from '../services/api';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import './History.css';

export default function History() {
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const showAlert = (message) => setModal({ message });

  useEffect(() => {
    getActivityLogs()
      .then(res => setLogs(res.data || []))
      .catch(() => setLogs([]));
  }, []);

  const handleDeleteLogs = () => {
    setConfirmAction({
      message: 'ลบประวัติทั้งหมดใช่หรือไม่?',
      onConfirm: async () => {
        try {
          await deleteAllLogs();
          setLogs([]);
          showToast('ลบประวัติทั้งหมดแล้ว');
        } catch {
          showAlert('เกิดข้อผิดพลาด');
        }
        setConfirmAction(null);
      }
    });
  };

  const getBadgeConfig = (action) => {
    switch (action) {
      case 'ADD_EQUIPMENT':    return { label: 'เพิ่มอุปกรณ์', cls: 'ADD_EQUIPMENT' };
      case 'UPDATE_EQUIPMENT': return { label: 'แก้ไขอุปกรณ์', cls: 'UPDATE_EQUIPMENT' };
      case 'DELETE_EQUIPMENT': return { label: 'ลบอุปกรณ์',    cls: 'DELETE_EQUIPMENT' };
      case 'BORROW':           return { label: 'เบิก',          cls: 'BORROW' };
      case 'RETURN':           return { label: 'คืน',           cls: 'RETURN' };
      case 'REPAIR_COMPLETE':  return { label: 'ซ่อมเสร็จ',    cls: 'REPAIR_COMPLETE' };
      default:                 return { label: action,           cls: '' };
    }
  };

  const renderBody = (log) => {
    const lines = (log.description || '').split('|').map(l => l.trim()).filter(Boolean);

    if (log.action === 'BORROW') {
      const [summary, ...items] = lines;
      return (
        <div className="history-body">
          {log.department && <div className="history-info">กองงาน: <span>{log.department}</span></div>}
          {summary && <div className="history-summary">{summary}</div>}
          {items.length > 0 && (
            <div className="history-items">
              {items.map((item, i) => <div key={i} className="history-item-row">{item}</div>)}
            </div>
          )}
        </div>
      );
    }

    if (log.action === 'RETURN') {
      return (
        <div className="history-body">
          {log.department && <div className="history-info">กองงาน: <span>{log.department}</span></div>}
          {lines.length > 0 && (
            <div className="history-items">
              {lines.map((line, i) => <div key={i} className="history-item-row">{line}</div>)}
            </div>
          )}
        </div>
      );
    }

    if (log.action === 'ADD_EQUIPMENT') {
      return (
        <div className="history-body">
          <div className="history-summary">เพิ่มอุปกรณ์ใหม่</div>
          <div className="history-items">
            {lines.map((line, i) => <div key={i} className="history-item-row">{line}</div>)}
          </div>
        </div>
      );
    }

    if (log.action === 'UPDATE_EQUIPMENT') {
      return (
        <div className="history-body">
          <div className="history-info">อุปกรณ์: <span>{log.equipmentName} ({log.equipmentCode})</span></div>
          {lines.length > 0 && (
            <>
              <div className="history-summary">สิ่งที่แก้ไข</div>
              <div className="history-items">
                {lines.map((line, i) => <div key={i} className="history-item-row">{line}</div>)}
              </div>
            </>
          )}
        </div>
      );
    }

    if (log.action === 'DELETE_EQUIPMENT') {
      return (
        <div className="history-body">
          <div className="history-info">อุปกรณ์: <span>{log.equipmentName} ({log.equipmentCode})</span></div>
          <div className="history-info" style={{ color: '#e53e3e' }}>ถูกลบออกจากระบบแล้ว</div>
        </div>
      );
    }

    if (log.action === 'REPAIR_COMPLETE') {
      return (
        <div className="history-body">
          {log.department && <div className="history-info">กองงาน: <span>{log.department}</span></div>}
          <div className="history-info">อุปกรณ์: <span>{log.equipmentName} ({log.equipmentCode})</span></div>
          {lines.length > 0 && (
            <div className="history-items">
              {lines.map((line, i) => <div key={i} className="history-item-row">{line}</div>)}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="history-body">
        {lines.map((line, i) => (
          <div key={i} className={i === 0 ? 'history-title' : 'history-info'}>{line}</div>
        ))}
        {log.department && <div className="history-info">กองงาน: <span>{log.department}</span></div>}
      </div>
    );
  };

  return (
    <div className="history-dashboard">
      <div className="history-header">
        <div className="history-header-text">
          <h1 className="history-main-title">ประวัติการใช้งานระบบ</h1>
          <p className="history-subtitle">รายการกิจกรรมทั้งหมดในระบบ</p>
        </div>
      </div>

      <div className="history-actions">
        <button className="danger-btn" onClick={handleDeleteLogs}>ลบประวัติทั้งหมด</button>
      </div>

      <div className="history-content">
        {logs.length === 0 && <div className="empty-box">ไม่มีประวัติการใช้งาน</div>}

        {logs.map(log => {
          const badge = getBadgeConfig(log.action);
          return (
            <div key={log._id} className="history-card">
              {/* แถบสีด้านซ้าย */}
              <div className={`history-card-accent ${badge.cls}`} />

              <div className="history-card-inner">
                <div className="history-card-header">
                  <div className={`history-action-badge ${badge.cls}`}>{badge.label}</div>
                  <div className="history-date">{new Date(log.createdAt).toLocaleString('th-TH')}</div>
                </div>
                {renderBody(log)}
              </div>
            </div>
          );
        })}
      </div>

      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          type="warning"
          showCancel={true}
          onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {modal && <ConfirmModal message={modal.message} onClose={() => setModal(null)} />}
    </div>
  );
}