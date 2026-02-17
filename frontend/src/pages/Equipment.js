import React, { useState, useEffect } from 'react';
import EquipmentTable from '../components/EquipmentTable';
import { getEquipment, addEquipment, updateEquipment } from '../services/api';
import { LOW_STOCK_THRESHOLD } from '../config/constants';
import './Equipment.css';

function Equipment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    code: '',
    name: '',
    total: 0
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [equipmentStats, setEquipmentStats] = useState({
    total: 0,
    available: 0,
    lowStock: 0,
    outOfStock: 0
  });

  /* =========================
     โหลดสถิติอุปกรณ์
  ========================== */
useEffect(() => {
  const loadStats = async () => {
    try {
      const res = await getEquipment();
      const equipments = res.data || [];

      const stats = {
        total: equipments.length,

        available: equipments.filter(e => {
          const available = e.available ?? e.total ?? 0;
          return available > LOW_STOCK_THRESHOLD;
        }).length,

        lowStock: equipments.filter(e => {
          const available = e.available ?? e.total ?? 0;
          return available > 0 && available <= LOW_STOCK_THRESHOLD;
        }).length,

        outOfStock: equipments.filter(e => {
          const available = e.available ?? e.total ?? 0;
          return available === 0;
        }).length
      };

      setEquipmentStats(stats);

    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  loadStats();
}, [refreshTrigger]);



  /* =========================
     Handlers
  ========================== */

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddEquipment = async () => {
  if (!newEquipment.code || !newEquipment.name) {
    alert('กรุณากรอกรหัสและชื่ออุปกรณ์');
    return;
  }

  const qty = Number(newEquipment.total);

  if (qty < 0) {
    alert('จำนวนอุปกรณ์ต้องไม่น้อยกว่า 0');
    return;
  }

  try {
    // ✅ โหลดข้อมูลทั้งหมดก่อน
    const res = await getEquipment();
    const equipments = res.data || [];

    // ✅ หา code ซ้ำ
    const code = newEquipment.code.trim().toUpperCase();
    const existing = equipments.find(
      e => e.code.trim().toUpperCase() === code
    );


    if (existing) {
      // ✅ ถ้ามีอยู่แล้ว → บวกจำนวน
      await updateEquipment(existing._id, {
        total: Number(existing.total) + qty
      });

      alert('อัปเดตจำนวนอุปกรณ์เรียบร้อยแล้ว');
    } else {
      // ✅ ถ้าไม่มี → เพิ่มใหม่
      await addEquipment({
      code,
      name: newEquipment.name.trim(),
      total: qty,
    });


      alert('เพิ่มอุปกรณ์ใหม่เรียบร้อยแล้ว');
    }

    setRefreshTrigger(prev => prev + 1);

    setNewEquipment({ code: '', name: '', total: 0 });
    setShowModal(false);

  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาด');
  }
};


  const handleResetForm = () => {
    setNewEquipment({
      code: '',
      name: '',
      total: 0
    });
  };

  /* =========================
     UI
  ========================== */

  return (
    <div className="equipment-dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <div>
            <h1 className="dashboard-title">ระบบจัดการคลังอุปกรณ์</h1>
            <p className="dashboard-subtitle">
              จัดการข้อมูลอุปกรณ์ทั้งหมดในคลังสินค้า
            </p>
          </div>
        </div>
      </div>

      {/* Search + Buttons */}
      <div className="action-section">

        <div className="search-container">
          <input
            type="text"
            placeholder="ค้นหาอุปกรณ์ด้วยรหัสหรือชื่อ..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />

          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="action-buttons-group">
          <button
            onClick={() => setShowModal(true)}
            className="add-equipment-btn"
          >
            <span className="add-icon">+</span>
            เพิ่มอุปกรณ์ใหม่
          </button>

          <button
            className="export-btn"
            onClick={() => alert('ส่งออกข้อมูล (ใส่ logic เพิ่มได้)')}
          >
            ส่งออกข้อมูล
          </button>
        </div>

      </div>


      {/* Table */}
      <div className="table-section">
        <EquipmentTable
          searchTerm={searchTerm}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">

            <div className="modal-header">
              <h3 className="modal-title">เพิ่มอุปกรณ์ใหม่</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">

              <div className="form-group">
                <label className="form-label">
                  <span className="required-asterisk">*</span>
                  รหัสอุปกรณ์
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newEquipment.code}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, code: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="required-asterisk">*</span>
                  ชื่ออุปกรณ์
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newEquipment.name}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">จำนวนทั้งหมด</label>
                <input
                  type="number"
                  className="form-input"
                  value={newEquipment.total}
                  min="0"
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, total: e.target.value })
                  }
                />
              </div>

            </div>

            <div className="modal-footer">
              <button className="btn btn-reset" onClick={handleResetForm}>
                รีเซ็ต
              </button>

              <div className="modal-actions">
                <button
                  className="btn btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  ยกเลิก
                </button>

                <button
                  className="btn btn-confirm"
                  onClick={handleAddEquipment}
                  disabled={!newEquipment.code || !newEquipment.name}
                >
                  บันทึก
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Equipment;
