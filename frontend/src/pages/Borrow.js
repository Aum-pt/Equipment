import React, { useEffect, useState } from 'react';
import { getEquipment, borrowEquipment } from '../services/api';
import BorrowForm from '../components/BorrowForm';
import { LOW_STOCK_THRESHOLD } from '../config/constants';
import './Borrow.css';

export default function Borrow() {
  const [equipments, setEquipments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipments, setSelectedEquipments] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEquipments = async () => {
    setLoading(true);
    try {
      const res = await getEquipment();
      setEquipments(res.data || []);
    } catch (err) {
      console.error('Failed to load equipment:', err);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipments();
  }, []);

  const handleQuantityChange = (equipmentId, quantity) => {
    const equipment = equipments.find(e => e._id === equipmentId);
    if (!equipment) return;

    const maxQuantity = equipment.available;

    const newQuantity = Math.min(
      Math.max(0, quantity),
      maxQuantity
    );

    setQuantities(prev => ({
      ...prev,
      [equipmentId]: newQuantity
    }));

    if (newQuantity > 0) {
      setSelectedEquipments(prev => {
        const exists = prev.some(item => item._id === equipmentId);

        if (exists) {
          return prev.map(item =>
            item._id === equipmentId
              ? { ...item, borrowQuantity: newQuantity }
              : item
          );
        }

        return [...prev, { ...equipment, borrowQuantity: newQuantity }];
      });
    } else {
      setSelectedEquipments(prev =>
        prev.filter(item => item._id !== equipmentId)
      );
    }
  };

  const toggleSelectEquipment = (equipment) => {
  const isSelected = selectedEquipments.some(
    item => item._id === equipment._id
  );

  if (isSelected) {
    // ยกเลิกเลือก
    setSelectedEquipments(prev =>
      prev.filter(item => item._id !== equipment._id)
    );

    setQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[equipment._id];
      return newQuantities;
    });

  } else {

  if (equipment.available === 0) return; 

  setSelectedEquipments(prev => [
    ...prev,
    { ...equipment, borrowQuantity: 1 }
  ]);

  setQuantities(prev => ({
    ...prev,
    [equipment._id]: 1
  }));
}
}; 

  const handleConfirmBorrow = async (data) => {
    try {
      const { borrowDetails, department, purpose } = data;

      const validBorrowDetails = borrowDetails.filter(
        item => item.borrowQuantity > 0
      );

      if (validBorrowDetails.length === 0) {
        alert('ไม่มีอุปกรณ์ที่ระบุจำนวนการเบิก');
        return;
      }

      const borrowData = {
        borrowDetails: validBorrowDetails,
        totalItems: validBorrowDetails.length,
        totalQuantity: validBorrowDetails.reduce(
          (sum, item) => sum + item.borrowQuantity,
          0
        ),
        borrowDate: new Date().toISOString(),
        department,
        purpose
      };

      await borrowEquipment(borrowData);

      alert(`เบิกอุปกรณ์เรียบร้อย!
จำนวนรายการ: ${borrowData.totalItems}
จำนวนชิ้น: ${borrowData.totalQuantity}`);

      setSelectedEquipments([]);
      setQuantities({});
      setShowBorrowForm(false);

      loadEquipments();
    } catch (err) {
      console.error('Failed to borrow equipment:', err);
      alert(
        'เกิดข้อผิดพลาดในการเบิกอุปกรณ์: ' +
        (err.response?.data?.message || err.message)
      );
    }
  };

  const filteredEquipments = equipments.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatus = (available) => {
    if (available === 0) return { text: 'หมดสต็อก', type: 'out' };
    if (available <= LOW_STOCK_THRESHOLD) return { text: 'เหลือน้อย', type: 'low' };
    return { text: 'พร้อมใช้งาน', type: 'available' };
  };

  const totalSelectedQuantity = Object.values(quantities)
    .reduce((sum, qty) => sum + qty, 0);

  const hasZeroQuantityItems = selectedEquipments.some(
    item => (quantities[item._id] || 0) === 0
  );

  if (loading) {
    return (
      <div className="borrow-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">กำลังโหลดข้อมูลอุปกรณ์...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="borrow-dashboard">

      <div className="dashboard-header">
        <div className="header-left">
          <div>
            <h1 className="dashboard-title">ระบบเบิกอุปกรณ์</h1>
            <p className="dashboard-subtitle">
              เลือกและเบิกอุปกรณ์จากคลังสินค้า
            </p>
          </div>
        </div>
      </div>

      <div className="action-section">

        <div className="search-container">
          <input
            type="text"
            placeholder="ค้นหาอุปกรณ์ด้วยรหัสหรือชื่อ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

        <div className="selection-info">
          <div className="selected-stats">
            <div className="selected-count">
              เลือกแล้ว: <span className="count-number">
                {selectedEquipments.length}
              </span> รายการ
            </div>

            <div className="total-quantity">
              จำนวน: <span className="quantity-number">
                {totalSelectedQuantity}
              </span> ชิ้น
            </div>
          </div>

          <button
            className="borrow-action-btn"
            disabled={totalSelectedQuantity === 0}
            onClick={() => setShowBorrowForm(true)}
          >
            เบิกอุปกรณ์ ({totalSelectedQuantity})
          </button>
        </div>

      </div>

      {hasZeroQuantityItems && (
        <div className="zero-quantity-warning">
          ⚠️ มีอุปกรณ์ที่เลือกแต่ยังไม่ได้ระบุจำนวน
        </div>
      )}

      <div className="table-section">
        <table className="equipment-table">
          <thead>
            <tr>
              <th>เลือก</th>
              <th>รหัสอุปกรณ์</th>
              <th>ชื่ออุปกรณ์</th>
              <th>จำนวนในคลัง</th>
              <th>สถานะ</th>
              <th>จำนวนที่เบิก</th>
            </tr>
          </thead>

          <tbody>
            {filteredEquipments.map(e => {
              const isSelected = selectedEquipments.some(
                item => item._id === e._id
              );

              const currentQuantity = quantities[e._id] || 0;
              const status = getStatus(e.available);
              const availableQuantity = e.available;

              return (
                <tr
                  key={e._id}
                  className={`${isSelected ? 'selected-row' : ''}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectEquipment(e)}
                      disabled={availableQuantity === 0}
                    />
                  </td>

                  <td>{e.code}</td>
                  <td>{e.name}</td>
                  <td>{availableQuantity}</td>

                  <td>
                    <span className={`status-badge status-${status.type}`}>
                      {status.text}
                    </span>
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        handleQuantityChange(e._id, currentQuantity - 1)
                      }
                    >-</button>

                    <input
                      type="number"
                      value={currentQuantity}
                      min="0"
                      max={availableQuantity}
                      onChange={(ev) =>
                        handleQuantityChange(
                          e._id,
                          parseInt(ev.target.value) || 0
                        )
                      }
                    />

                    <button
                      onClick={() =>
                        handleQuantityChange(e._id, currentQuantity + 1)
                      }
                    >+</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showBorrowForm && (
        <BorrowForm
          selectedEquipments={selectedEquipments}
          quantities={quantities}
          onConfirm={handleConfirmBorrow}
          onCancel={() => setShowBorrowForm(false)}
        />
      )}

    </div>
  );
}
