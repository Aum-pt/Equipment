import React, { useState, useEffect } from 'react';
import EquipmentTable from '../components/EquipmentTable';
import { getEquipment, addEquipment, updateEquipment } from '../services/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useLocation } from 'react-router-dom';
import './Equipment.css';

function Equipment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [newEquipment, setNewEquipment] = useState({
    code: '',
    name: '',
    total: 0,
    type: 'reusable',
    low_stock_threshold: 5
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();


useEffect(() => {
  const params = new URLSearchParams(location.search);
  const filter = params.get('filter');

  if (filter === 'LOW_STOCK') {
    setSearchTerm('LOW_STOCK');
  } else if (filter === 'OUT_OF_STOCK') {
    setSearchTerm('OUT_OF_STOCK');
  } else {
    setSearchTerm('');
  }
}, [location]);

const FILTER_LABEL = {
  LOW_STOCK: 'ใกล้หมด',
  OUT_OF_STOCK: 'หมดแล้ว'
};


  /* =========================
     Handlers
  ========================== */

  const handleSearchChange = (e) => {
  const value = e.target.value;

  const reverseMap = {
    'ใกล้หมด': 'LOW_STOCK',
    'หมดแล้ว': 'OUT_OF_STOCK'
  };

  setSearchTerm(reverseMap[value] || value);
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
      const res = await getEquipment();
      const equipments = res.data || [];

      const code = newEquipment.code.trim().toUpperCase();

      const existing = equipments.find(
        e => e.code.trim().toUpperCase() === code
      );

      if (existing) {
        await updateEquipment(existing._id, {
          total: Number(existing.total) + qty
        });

        alert('อัปเดตจำนวนอุปกรณ์เรียบร้อยแล้ว');
      } else {
        await addEquipment({
          code,
          name: newEquipment.name.trim(),
          total: qty,
          type: newEquipment.type,
          low_stock_threshold: Number(newEquipment.low_stock_threshold)
        });

        alert('เพิ่มอุปกรณ์ใหม่เรียบร้อยแล้ว');
      }

      setRefreshTrigger(prev => prev + 1);

      setNewEquipment({
        code: '',
        name: '',
        total: 0,
        type: 'reusable',
        low_stock_threshold: 5
      });

      setShowModal(false);

    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาด');
    }
  };

  // ================================
// EXPORT EXCEL (ExcelJS Version)
// ================================

const handleExportExcel = async () => {
  try {
    const res = await getEquipment();
    const equipments = res.data || [];

    if (equipments.length === 0) {
      alert('ไม่มีข้อมูลให้ส่งออก');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Equipment Report');

    /* ================================
       🏷 Title
    ================================= */

    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'รายงานคลังอุปกรณ์';
    titleCell.font = { size: 20, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]);

    /* ================================
       Header Row (แถวจริง)
    ================================= */

    const headerRowIndex = worksheet.lastRow.number + 1;

    const headerRow = worksheet.addRow([
      'ลำดับ',
      'รหัสอุปกรณ์',
      'ชื่ออุปกรณ์',
      'จำนวนคงเหลือ',    
      'ค่าแจ้งเตือน',     
      'ประเภท', 
      'สถานะ' 
    ]);

    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    /* ================================
       Data Rows
    ================================= */

    const getStatusText = (e) => {
    const available = e.available ?? e.total ?? 0;
    const threshold = e.low_stock_threshold ?? 5;

    if (available <= 0) return 'หมดสต็อก';
    if (e.type === 'reusable' && available <= threshold) return 'เหลือน้อย';
    return 'พร้อมใช้งาน';
  };

    equipments.forEach((e, index) => {
  const available = e.available ?? e.total ?? 0; 
  const status = getStatusText(e); 

  const row = worksheet.addRow([
    index + 1,
    e.code,
    e.name,
    available,
    e.low_stock_threshold ?? 5,
    e.type === 'reusable' ? 'ใช้ซ้ำได้' : 'ใช้แล้วหมด',
    status
  ]);

  // style ปกติ
  row.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };

    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    if (colNumber === 4) {
      cell.numFmt = '#,##0';
    }
  });

  // zebra
  if (index % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF7F7F7' }
      };
    });
  }
});
    
    /* ================================
       Layout
    ================================= */

    worksheet.columns = [
    { width: 10 },
    { width: 20 },
    { width: 35 },
    { width: 18 }, 
    { width: 18 }, 
    { width: 18 },
    { width: 18 },
  ];

    // ✅ สำคัญมาก — ใช้ headerRowIndex จริง
    worksheet.autoFilter = `A${headerRowIndex}:G${headerRowIndex}`;

    worksheet.views = [
      { state: 'frozen', ySplit: headerRowIndex }
    ];

    /* ================================
       Export
    ================================= */

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, 'รายงานคลังอุปกรณ์.xlsx');

  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการส่งออก Excel');
  }
};

    const handleResetForm = () => {
      setNewEquipment({
        code: '',
        name: '',
        total: 0,
        type: 'reusable',
        low_stock_threshold: 5
      });
    };

/* =========================
   UI
========================== */


  return (
    <div className="equipment-dashboard">

      <div className="equipment-header">
        <div className="header-left">
          <div>
            <h1 className="equipment-title">ระบบจัดการคลังอุปกรณ์</h1>
            <p className="equipment-subtitle">
              จัดการข้อมูลอุปกรณ์ทั้งหมดในคลังสินค้า
            </p>
          </div>
        </div>
      </div>

      <div className="action-section">

        <div className="search-container">
          <input
            type="text"
            placeholder="ค้นหาอุปกรณ์ด้วยรหัสหรือชื่อ..."
            value={FILTER_LABEL[searchTerm] || searchTerm}
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
            เพิ่มอุปกรณ์ใหม่
          </button>

          <button
            className="export-btn"
            onClick={handleExportExcel}
          >
            Export
          </button>
        </div>

      </div>

      <div className="table-section">
        <EquipmentTable
          searchTerm={searchTerm}
          refreshTrigger={refreshTrigger}
        />
      </div>

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
                  setNewEquipment({
                    ...newEquipment,
                    code: e.target.value
                  })
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
                  setNewEquipment({
                    ...newEquipment,
                    name: e.target.value
                  })
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
                  setNewEquipment({
                    ...newEquipment,
                    total: Number(e.target.value)
                  })
                }
                />
              </div>

              <div className="form-group">
                <label className="form-label">ประเภทอุปกรณ์</label>
                <select
                  className="form-input"
                  value={newEquipment.type}
                  onChange={(e) =>
                  setNewEquipment({
                    ...newEquipment,
                    type: e.target.value,
                    low_stock_threshold: e.target.value === 'consumable' ? 0 : newEquipment.low_stock_threshold
                  })
                }
                >
                  <option value="reusable">ใช้ซ้ำได้</option>
                  <option value="consumable">ใช้แล้วหมด</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">จำนวนขั้นต่ำ (แจ้งเตือน)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newEquipment.low_stock_threshold}
                  min="0"
                  disabled={newEquipment.type === 'consumable'}  
                  onChange={(e) =>
                    setNewEquipment({
                      ...newEquipment,
                      low_stock_threshold: Number(e.target.value)
                    })
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
