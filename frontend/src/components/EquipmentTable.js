import React, { useEffect, useState } from 'react';
import { getEquipment, updateEquipment, deleteEquipment } from '../services/api';
import { LOW_STOCK_THRESHOLD } from '../config/constants';
import './EquipmentTable.css';

function EquipmentTable({ searchTerm, refreshTrigger }) {
  const [equipments, setEquipments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ code: '', name: '', total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const res = await getEquipment();
      setEquipments(res.data);
    } catch (err) {
      console.error('Failed to load equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, [refreshTrigger]);

  const getStockStatus = (item) => {
  if (item.available === 0) return 'หมด';
  if (item.available <= LOW_STOCK_THRESHOLD) return 'ใกล้หมด';
  return 'ปกติ';
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณต้องการลบอุปกรณ์นี้ใช่หรือไม่?')) {
      try {
        await deleteEquipment(id);
        fetchEquipments();
      } catch (err) {
        console.error('Failed to delete equipment:', err);
        alert('เกิดข้อผิดพลาดในการลบอุปกรณ์');
      }
    }
  };

  const startEdit = (equipment) => {
    setEditingId(equipment._id);
    setEditData({
      code: equipment.code,
      name: equipment.name,
      total: equipment.total
    });
  };

  const handleEdit = async (id) => {
    if (!editData.name) {
      alert('กรุณากรอกชื่ออุปกรณ์');
      return;
    }

    const newTotal = Number(editData.total);

    if (newTotal < 0) {
      alert('จำนวนอุปกรณ์ต้องไม่น้อยกว่า 0');
      return;
    }

    const equipment = equipments.find(e => e._id === id);
    if (!equipment) return;

    if (newTotal < equipment.available) {
      alert('จำนวนทั้งหมดห้ามน้อยกว่าจำนวนคงเหลือ');
      return;
    }

    try {
      await updateEquipment(id, {
        name: editData.name,
        total: newTotal
      });

      setEditingId(null);
      fetchEquipments();
    } catch (err) {
      console.error('Failed to update equipment:', err);
      alert('เกิดข้อผิดพลาดในการแก้ไขอุปกรณ์');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ code: '', name: '', total: 0 });
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (filteredEquipments.length === 0) {
    return (
      <div className="equipment-table-container">
        <div className="empty-state">
          <div className="empty-text">ไม่พบข้อมูลอุปกรณ์</div>
        </div>
      </div>
    );
  }

  return (
    <div className="equipment-table-container">
      <div className="table-scroll-container">
        <table className="equipment-table">
          <thead>
            <tr>
              <th className="center-column">รหัสอุปกรณ์</th>
              <th>ชื่ออุปกรณ์</th>
              <th className="center-column">จำนวนทั้งหมด</th>
              <th className="center-column">สถานะ</th>
              <th className="center-column">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredEquipments.map(e => (
              <tr key={e._id}>
                {editingId === e._id ? (
                  <>
                    {/* ✅ LOCK CODE ตรงนี้ */}
                    <td className="center-column">
                      <input
                        type="text"
                        className="edit-input"
                        value={editData.code}
                        disabled
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        className="edit-input"
                        value={editData.name}
                        onChange={(ev) =>
                          setEditData({ ...editData, name: ev.target.value })
                        }
                      />
                    </td>

                    <td className="center-column">
                      <input
                        type="number"
                        className="edit-input"
                        value={editData.total}
                        onChange={(ev) =>
                          setEditData({ ...editData, total: ev.target.value })
                        }
                        min="0"
                      />
                    </td>

                    <td className="center-column">
                      <span className="status-badge status-editing">
                        กำลังแก้ไข
                      </span>
                    </td>

                    <td className="center-column">
                      <button onClick={() => handleEdit(e._id)}>บันทึก</button>
                      <button onClick={cancelEdit}>ยกเลิก</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="center-column">{e.code}</td>
                    <td>{e.name}</td>
                    <td className="center-column">{e.total}</td>
                    <td className="center-column">
                      {(() => {
                        const status = getStatus(e.available);
                        return (
                          <span className={`status-badge status-${status.type}`}>
                            {status.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="center-column">
                      <button onClick={() => startEdit(e)}>แก้ไข</button>
                      <button onClick={() => handleDelete(e._id)}>ลบ</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EquipmentTable;
