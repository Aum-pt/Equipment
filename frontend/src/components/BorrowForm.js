import React, { useState } from 'react';
import './BorrowForm.css';

export default function BorrowForm({ 
  selectedEquipments, 
  quantities,
  onConfirm, 
  onCancel 
}) {

  const [form, setForm] = useState({
    department: 'กองงาน1',
    purpose: 'ติดตั้ง'
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedEquipments.length === 0) {
      alert('กรุณาเลือกอุปกรณ์ที่ต้องการเบิก');
      return;
    }

    const borrowDetails = selectedEquipments.map(item => ({
      ...item,
      borrowQuantity: quantities[item._id] || 0
    }));

    onConfirm({
      borrowDetails,
      department: form.department,
      purpose: form.purpose
    });
  };   // ← ต้องมีตัวนี้

  const totalQuantity = selectedEquipments.reduce(
    (sum, item) => sum + (quantities[item._id] || 0),
    0
  );


  return (
    <div 
      className="borrow-form-overlay"
      onClick={(e) => {
        if (e.target.classList.contains('borrow-form-overlay')) {
          onCancel();
        }
      }}
    >
      <div className="borrow-form-container">

        <div className="borrow-form-header">
          <h3 className="borrow-form-title">
            รายการเบิกอุปกรณ์ ({selectedEquipments.length} รายการ)
          </h3>
          <button 
            className="borrow-form-close-btn" 
            onClick={onCancel}
          >
            ✕
          </button>
        </div>

        {/* สรุปยอด */}
        <div className="borrow-summary">
          <div className="summary-item">
            <span className="summary-label">รวมจำนวน:</span>
            <span className="summary-value quantity-total">
              {totalQuantity} ชิ้น
            </span>
          </div>
        </div>

        {/* รายการอุปกรณ์ที่เลือก */}
        <div className="selected-equipments-section">
          <h4>
            อุปกรณ์ที่เลือก ({selectedEquipments.length} รายการ)
          </h4>

          <div className="selected-equipments-list">
            {selectedEquipments.map((item, index) => (
              <div key={item._id || index} className="selected-equipment-item">
                <div className="equipment-summary">
                  <span className="equipment-code-badge">
                    {item.code}
                  </span>
                  <span className="equipment-name">
                    {item.name}
                  </span>
                  <span className="equipment-quantity">
                    จำนวน: <strong>{quantities[item._id] || 0}</strong> ชิ้น
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ฟอร์มรายละเอียด */}
        <form onSubmit={handleSubmit} className="borrow-details-form">
          <div className="form-section">
            <h4>รายละเอียดการเบิก</h4>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">กองงาน</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="form-select"
                >
                  <option value="กองงาน1">กองงาน 1</option>
                  <option value="กองงาน2">กองงาน 2</option>
                  <option value="กองงาน3">กองงาน 3</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ประเภทการเบิก</label>
                <select
                  name="purpose"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="form-select"
                >
                  <option value="ติดตั้ง">ติดตั้ง</option>
                  <option value="ซ่อมบำรุง">ซ่อมบำรุง</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button 
              type="button" 
              className="btn btn-cancel" 
              onClick={onCancel}
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className="btn btn-confirm"
            >
              ยืนยันการเบิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

