import { useEffect, useState } from 'react';
import { getRepairs, completeRepair, deleteCompletedRepairs } from '../services/api';
import './Repair.css';

export default function Repair() {
  const [repairs, setRepairs] = useState([]);

  useEffect(() => {
    loadRepairs();
  }, []);

  const loadRepairs = async () => {
    const res = await getRepairs();
    setRepairs(res.data);
  };

  const handleComplete = async (id) => {
    try {
      await completeRepair(id);

      alert('ซ่อมเสร็จแล้ว');

      setRepairs(prev =>
        prev.map(r =>
          r._id === id ? { ...r, status: 'ซ่อมเสร็จ' } : r
        )
      );

    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  const handleDeleteCompleted = async () => {
    if (!window.confirm('ลบรายการซ่อมที่เสร็จแล้วทั้งหมด ?')) return;

    try {
      await deleteCompletedRepairs();
      setRepairs(prev => prev.filter(r => r.status !== 'ซ่อมเสร็จ'));
      alert('ลบแล้ว');
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="repair-dashboard">

      {/* ===== Header ===== */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">ระบบซ่อมอุปกรณ์</h1>
          <p className="dashboard-subtitle">รายการอุปกรณ์ที่แจ้งชำรุด</p>
        </div>
      </div>

      {/* ===== Action Bar (เหมือนหน้าคลัง) ===== */}
      <div className="repair-actions">
        <button className="danger-btn" onClick={handleDeleteCompleted}>
          ลบรายการซ่อมเสร็จ
        </button>
      </div>

      {/* ===== Empty State ===== */}
      {repairs.length === 0 && (
        <div className="empty-box">ไม่มีรายการซ่อม</div>
      )}

      {/* ===== Cards ===== */}
      {repairs.map(repair => (
        <div key={repair._id} className="repair-card">
          <div className="repair-card-header">
            <div className="repair-name">
              {repair.equipment?.name}
            </div>

            <div className={`repair-status-badge ${repair.status}`}>
              {repair.status}
            </div>
          </div>

          <div className="repair-body">
            <div className="repair-info">
              จำนวนชำรุด: {repair.damagedQty} ชิ้น
            </div>

            <div className="repair-info">
              กองงานแจ้ง: {repair.department}
            </div>

            <div className="repair-info">
              วันที่แจ้ง: {new Date(repair.reportDate).toLocaleDateString()}
            </div>

            {repair.status === 'กำลังซ่อม' && (
              <button
                className="complete-btn"
                onClick={() => handleComplete(repair._id)}
              >
                ✔ ซ่อมเสร็จแล้ว
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
