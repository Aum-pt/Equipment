import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './Report.css';

export default function Report() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  /* ================= FETCH REPORT ================= */

  const fetchReport = useCallback(async () => {
    try {
      const res = await api.get('/report', {
        params: {
          search,
          status,
          date: selectedDate,
        },
      });

      setReports(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [search, status, selectedDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ================= EXPORT EXCEL ================= */

  const handleExportExcel = async () => {
    if (reports.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    worksheet.columns = [
      { key: 'equipmentName', width: 28 },
      { key: 'quantity', width: 16 },
      { key: 'borrowDate', width: 16 },
      { key: 'returnDate', width: 16 },
      { key: 'repairDate', width: 16 },
      { key: 'repairCompletedDate', width: 16 },
      { key: 'status', width: 16 },
      { key: 'borrowNote', width: 30 },
      { key: 'returnNote', width: 30 },
    ];

    worksheet.getColumn(2).alignment = { horizontal: 'center' }; // จำนวน
    worksheet.getColumn(7).alignment = { horizontal: 'center' }; // สถานะ
    

    // TITLE
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'รายงานข้อมูลการเบิก คืน และซ่อมอุปกรณ์ทั้งหมด';
    titleCell.font = { size: 18, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'อุปกรณ์',
      'จำนวน',
      'วันที่เบิก',
      'วันที่คืน',
      'วันที่ซ่อม',
      'ซ่อมเสร็จ',
      'สถานะ',
      'หมายเหตุเบิก',   
      'หมายเหตุคืน'    
    ]);
    headerRow.height = 24;

    worksheet.views = [
      { state: 'frozen', ySplit: 3 }
    ];

    worksheet.autoFilter = {
      from: 'A3',
      to: 'G3',
    };

    headerRow.eachCell((cell) => {

  cell.font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  cell.alignment = {
  horizontal: cell.col === 1 ? 'left' : 'center',
  vertical: 'middle',
  wrapText: true,
};

  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D3748' },
  };

  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'medium' },   
    right: { style: 'thin' },
  };
});

  

    // DATA
    reports.forEach((r, index) => {
    const row = worksheet.addRow([
      r.equipmentName || '-',
      r.quantity ?? '-',
      r.borrowDate ? new Date(r.borrowDate) : '-',
      r.returnDate ? new Date(r.returnDate) : '-',
      r.repairDate ? new Date(r.repairDate) : '-',
      r.repairCompletedDate ? new Date(r.repairCompletedDate) : '-',
      r.status || '-',

      r.borrowNote || '-',   
      r.returnNote || '-',   
    ]);

    // จัด format วันที่เฉพาะ cell ที่เป็น Date จริง
    [3, 4, 5, 6].forEach((colIndex) => {
      const cell = row.getCell(colIndex);

      if (cell.value instanceof Date) {
        cell.numFmt = 'dd/mm/yyyy';
      } else {
        cell.numFmt = '@'; // text format สำหรับ "-"
      }
    });

      row.eachCell((cell) => {
        cell.alignment = {
        horizontal: cell.col === 1 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7FAFC' },
          };
        });
      }
    });

    // ===== เส้นหนาก่อนรวมทั้งหมด =====
if (reports.length > 0) {
  const lastDataRowNumber = worksheet.lastRow.number;

  worksheet.getRow(lastDataRowNumber).eachCell((cell) => {
    cell.border = {
      ...cell.border,
      bottom: { style: 'medium' }, 
    };
  });
}

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, 'รายงานข้อมูลการเบิก คืน และซ่อมอุปกรณ์ทั้งหมด.xlsx');
  };

  /* ================= HELPERS ================= */

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setSelectedDate('');
  };

  const todayString = new Date().toISOString().split('T')[0];

  /* ================= RENDER ================= */

  return (
    <div className="report-dashboard">

      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">รายงานข้อมูล</h1>
          <p className="dashboard-subtitle">
            สรุปข้อมูลการเบิก คืน และซ่อมอุปกรณ์ทั้งหมด
          </p>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="report-action-section">

        {/* SEARCH */}
        <div className="report-search-container">
          <input
            type="text"
            placeholder="ค้นหาอุปกรณ์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="report-search-input"
          />
        </div>

        {/* STATUS */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="report-status-filter"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="ยืมอยู่">ยืมอยู่</option>
          <option value="คืนแล้ว">คืนแล้ว</option>
          <option value="กำลังซ่อม">กำลังซ่อม</option>
        </select>

        {/* DATE */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="report-date-filter"
        />

        {/* TODAY */}
        <button
          className="today-btn"
          onClick={() => setSelectedDate(todayString)}
        >
          วันนี้
        </button>

        {/* CLEAR */}
        <button onClick={clearFilters} className="clear-filter-btn">
          ล้างตัวกรอง
        </button>

        {/* EXPORT */}
        <button onClick={handleExportExcel} className="export-btn">
          Export
        </button>

      </div>

      {/* TABLE */}
      <div className="report-table-section">
        <div className="report-card">
          <div className="report-table-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th>อุปกรณ์</th>
                  <th>จำนวน</th>
                  <th>วันที่เบิก</th>
                  <th>วันที่คืน</th>
                  <th>วันที่ซ่อม</th>
                  <th>ซ่อมเสร็จ</th>
                  <th>สถานะ</th>
                  <th>หมายเหตุเบิก</th>
                  <th>หมายเหตุคืน</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-cell">
                      ไม่พบข้อมูลรายงาน
                    </td>
                  </tr>
                ) : (
                  reports.map((r, index) => (
                    <tr key={index}>
                      <td>{r.equipmentName}</td>
                      <td className="center-column">{r.quantity}</td>
                      <td>{r.borrowDate ? new Date(r.borrowDate).toLocaleDateString() : '-'}</td>
                      <td>{r.returnDate ? new Date(r.returnDate).toLocaleDateString() : '-'}</td>
                      <td>{r.repairDate ? new Date(r.repairDate).toLocaleDateString() : '-'}</td>
                      <td>{r.repairCompletedDate ? new Date(r.repairCompletedDate).toLocaleDateString() : '-'}</td>
                      <td className="center-column">
                        <span className={`status-badge ${r.status?.trim()}`}>
                          {r.status}
                        </span>
                      </td>

                      {/* ✅ แยกจริง */}
                      <td>{r.borrowNote || '-'}</td>
                      <td>{r.returnNote || '-'}</td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}