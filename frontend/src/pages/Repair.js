import { useEffect, useState } from 'react';
import { getRepairs, completeRepair, deleteCompletedRepairs } from '../services/api';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import './Repair.css';

export default function Repair() {
  const [repairs, setRepairs] = useState([]);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const showAlert = (message) => setModal({ message });

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
      showToast('ซ่อมเสร็จแล้ว');
      setRepairs(prev =>
        prev.map(r => r._id === id ? { ...r, status: 'ซ่อมเสร็จ' } : r)
      );
    } catch {
      showAlert('เกิดข้อผิดพลาด');
    }
  };

  const handleDeleteCompleted = () => {
    setConfirmAction({
      message: 'ลบรายการซ่อมที่เสร็จแล้วทั้งหมด?',
      onConfirm: async () => {
        try {
          await deleteCompletedRepairs();
          setRepairs(prev => prev.filter(r => r.status !== 'ซ่อมเสร็จ'));
          showToast('ลบรายการซ่อมเสร็จแล้ว');
        } catch {
          showAlert('เกิดข้อผิดพลาด');
        }
        setConfirmAction(null);
      }
    });
  };

  return (
    <div className="repair-dashboard">

      <div className="repair-header">
        <div>
          <h1 className="repair-title">ระบบซ่อมอุปกรณ์</h1>
          <p className="repair-subtitle">รายการอุปกรณ์ที่แจ้งชำรุด</p>
        </div>
      </div>

      <div className="repair-actions">
        <button className="danger-btn" onClick={handleDeleteCompleted}>
          ลบรายการซ่อมเสร็จ
        </button>
      </div>

      {repairs.length === 0 && (
        <div className="empty-box">ไม่มีรายการซ่อม</div>
      )}

      {repairs.map(repair => (
        <div key={repair._id} className="repair-card">
          <div className="repair-card-header">
            <div className="repair-name">{repair.equipment?.name}</div>
            <div className={`repair-status-badge ${repair.status}`}>{repair.status}</div>
          </div>

          <div className="repair-body">
            <div className="repair-info">จำนวนชำรุด: {repair.damagedQty} ชิ้น</div>
            <div className="repair-info">กองงานแจ้ง: {repair.department}</div>
            <div className="repair-info">
              วันที่แจ้ง: {new Date(repair.reportDate).toLocaleDateString()}
            </div>
            {repair.status === 'กำลังซ่อม' && (
              <button className="complete-btn" onClick={() => handleComplete(repair._id)}>
                ✔ ซ่อมเสร็จแล้ว
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Confirm Modal สำหรับการลบ */}
      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          type="warning"
          showCancel={true}
          onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {modal && (
        <ConfirmModal message={modal.message} onClose={() => setModal(null)} />
      )}

    </div>
  );
}