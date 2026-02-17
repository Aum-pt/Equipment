import { useEffect, useState } from 'react';
import { getRepairs, completeRepair } from '../services/api';
import './Repair.css';

export default function Repair() {
  const [repairs, setRepairs] = useState([]);

  const loadRepairs = async () => {
    const res = await getRepairs();
    setRepairs(res.data);
  };

  useEffect(() => {
    loadRepairs();
  }, []);

  const handleComplete = async (id) => {
  try {
    await completeRepair(id);

    alert('ซ่อมเสร็จแล้ว');

    setRepairs(prev =>
      prev.map(r =>
        r._id === id
          ? { ...r, status: 'ซ่อมเสร็จ' }
          : r
      )
    );

  } catch (err) {
    alert('เกิดข้อผิดพลาด');
  }
};

  return (
    <div className="repair-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">ระบบซ่อมอุปกรณ์</h1>
          <p className="dashboard-subtitle">รายการอุปกรณ์ที่แจ้งชำรุด</p>
        </div>
      </div>



      {repairs.length === 0 && (
        <div className="empty-box">
          ไม่มีรายการซ่อม
        </div>
      )}

        {repairs.map(repair => (
        <div key={repair._id} className="repair-card">

            {/* แถวบน: ชื่อ + สถานะ */}
            <div className="repair-card-header">
            <div className="repair-name">
                {repair.equipment?.name}
            </div>

            <div className={`repair-status-badge ${repair.status}`}>
                {repair.status}
            </div>
            </div>

            {/* เนื้อหา */}
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

            {/* ปุ่มแทนตำแหน่งสถานะเก่า */}
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
