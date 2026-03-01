import React, { useEffect, useState } from 'react';
import { getEquipment, updateEquipment, deleteEquipment } from '../services/api';
import './EquipmentTable.css';

function EquipmentTable({ searchTerm, refreshTrigger }) {
  const [equipments, setEquipments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    code: '',
    name: '',
    total: 0,
    low_stock_threshold: 5
  });
  const [loading, setLoading] = useState(true);

  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const res = await getEquipment();
      setEquipments(res.data || []);
    } catch (err) {
      console.error('Failed to load equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, [refreshTrigger]);

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
    code: equipment.code || '',
    name: equipment.name || '',
    total: Number(equipment.total || 0),
    low_stock_threshold: equipment.low_stock_threshold ?? 5
  });
};


  const handleEdit = async (id) => {
    if (!editData.name) {
      alert('กรุณากรอกชื่ออุปกรณ์');
      return;
    }

    const newTotal = Number(editData.total);
    const newThreshold = Number(editData.low_stock_threshold);

    if (newTotal < 0) {
      alert('จำนวนอุปกรณ์ต้องไม่น้อยกว่า 0');
      return;
    }

    if (newThreshold < 0) {
      alert('ค่าแจ้งเตือนต้องไม่น้อยกว่า 0');
      return;
    }

    const equipment = equipments.find(e => e._id === id);
    if (!equipment) return;

    const available = equipment.available ?? equipment.total ?? 0;

    if (newTotal < available) {
      alert('จำนวนทั้งหมดห้ามน้อยกว่าจำนวนคงเหลือ');
      return;
    }

    try {
      await updateEquipment(id, {
      name: editData.name,
      total: newTotal,
      low_stock_threshold: newThreshold
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
    setEditData({
      code: '',
      name: '',
      total: 0,
      low_stock_threshold: 5
    });
  };

  const safeSearch = (searchTerm || '').toLowerCase();

  const filteredEquipments = equipments.filter(e => {
  const available = e.available ?? e.total ?? 0;
  const threshold = e.low_stock_threshold ?? 5;

  // ✅ filter จาก dashboard
  if (searchTerm === 'LOW_STOCK') {
    return e.type === 'reusable' && available > 0 && available <= threshold;
  }

  if (searchTerm === 'OUT_OF_STOCK') {
    return available === 0;
  }

  // ✅ search ปกติ
  return (
    (e.name || '').toLowerCase().includes(safeSearch) ||
    (e.code || '').toLowerCase().includes(safeSearch)
  );
});

  const getStatus = (equipment) => {
  const available = equipment.available ?? equipment.total ?? 0;
  const threshold = equipment.low_stock_threshold ?? 5;

  if (available <= 0) {
    return { text: 'หมดสต็อก', type: 'out' };
  }

  if (
    equipment.type === 'reusable' &&
    available <= threshold
  ) {
    return { text: 'เหลือน้อย', type: 'low' };
  }

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
              <th className="center-column">ชื่ออุปกรณ์</th>
              <th className="center-column">ประเภท</th>
              <th className="center-column">จำนวนคงเหลือ</th>
              <th className="center-column">ค่าแจ้งเตือน</th>  
              <th className="center-column">สถานะ</th>
              <th className="center-column">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
              {filteredEquipments.map(e => {
                const status = getStatus(e);
                const available = e.available ?? e.total ?? 0;

                if (editingId === e._id) {
                  return (
                    <tr key={e._id}>
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

                      <td>
                        {e.type === 'consumable' ? 'ใช้แล้วหมด' : 'ใช้ซ้ำได้'}
                      </td>

                      {/* total */}
                        <td className="center-column">
                          <input
                            type="number"
                            className="edit-input"
                            value={editData.total}
                            onChange={(ev) =>
                            setEditData({
                              ...editData,
                              total: Number(ev.target.value)
                            })
                          }
                            min="0"
                          />
                        </td>

                        {/* threshold */}
                        <td className="center-column">
                          <input
                            type="number"
                            className="edit-input"
                            value={editData.low_stock_threshold}
                            onChange={(ev) =>
                              setEditData({
                                ...editData,
                                low_stock_threshold: Number(ev.target.value)
                              })
                            }
                            min="0"
                            disabled={e.type === 'consumable'}
                          />
                        </td>
                      

                      <td className="center-column">
                        <span className="status-badge status-editing">
                          กำลังแก้ไข
                        </span>
                      </td>

                      <td className="center-column">
                        <div className="table-actions">
                          <button
                            className="action-btn btn-save"
                            onClick={() => handleEdit(e._id)}
                          >
                            บันทึก
                          </button>

                          <button
                            className="action-btn btn-cancel"
                            onClick={cancelEdit}
                          >
                            ✖ ยกเลิก
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={e._id}>
                    <td className="center-column">{e.code}</td>
                    <td>{e.name}</td>

                    <td>
                      {e.type === 'consumable' ? 'ใช้แล้วหมด' : 'ใช้ซ้ำได้'}
                    </td>
                      <td className="center-column">{available}</td>

                      <td className="center-column">
                        {e.low_stock_threshold ?? 5}
                      </td>

                    <td className="center-column">
                      <span className={`status-badge status-${status.type}`}>
                        {status.text}
                      </span>
                    </td>

                    <td className="center-column">
                      <div className="table-actions">
                        <button
                          className="action-btn btn-edit"
                          onClick={() => startEdit(e)}
                        >
                          แก้ไข
                        </button>

                        <button
                          className="action-btn btn-delete"
                          onClick={() => handleDelete(e._id)}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

        </table>
      </div>
    </div>
  );
}

export default EquipmentTable;
