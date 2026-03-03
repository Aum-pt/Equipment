import { useEffect, useState } from 'react';
import ReturnForm from '../components/ReturnForm';
import { getActiveBorrows } from '../services/api';
import './Return.css';

export default function Return() {
  const [borrows, setBorrows] = useState([]);

  const loadBorrows = async () => {
    try {
      const res = await getActiveBorrows();
      setBorrows(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBorrows();
  }, []);

  return (
    <div className="equipment-dashboard">
      {/* Header แบบเดียวกับคลัง */}
      <div className="dashboard-header">
        <div className="header-left">
          <div>
            <h1 className="dashboard-title">ระบบคืนอุปกรณ์</h1>
            <p className="dashboard-subtitle">
              จัดการรายการอุปกรณ์ที่ยังยืมอยู่
            </p>
          </div>
        </div>
      </div>
      <div className="table-section">
        {borrows.length === 0 && (
          <div className="empty-state">
            <div className="empty-text">ไม่มีรายการที่ต้องคืน</div>
            <div className="empty-subtext">
              ขณะนี้ไม่มีอุปกรณ์ที่อยู่ระหว่างการยืม
            </div>
          </div>
        )}

        {borrows
          .filter(borrow => borrow.items.length > 0)  
          .map(borrow => (
          <div key={borrow._id} className="borrow-card">

          {/* HEADER */}
          <div className="doc-header">
            <div className="doc-title">ใบยืมอุปกรณ์</div>

            <div className="doc-info-grid">
              <div><span>แผนก:</span> {borrow.department}</div>
              <div><span>วัตถุประสงค์:</span> {borrow.purpose}</div>

              <div>
                <span>วันที่เบิก:</span>{" "}
                {new Date(borrow.borrowDate).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              <div><span>จำนวนรายการ:</span> {borrow.items.length} รายการ</div>
            </div>
          </div>

          {/* ITEMS */}
          <div className="borrow-items">
            {borrow.items.map(item => (
              <ReturnForm
                key={item._id}
                borrow={borrow}
                item={item}
                onSuccess={loadBorrows}
              />
            ))}
          </div>

        </div>
        ))}
          </div>
      </div>
  );
}