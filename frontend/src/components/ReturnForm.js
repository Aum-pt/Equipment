import { useState } from 'react';
import { returnBorrow } from '../services/api';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import './ReturnForm.css';

export default function ReturnForm({ borrow, item, onSuccess }) {
  const [returnQty, setReturnQty] = useState(0);
  const [damagedQty, setDamagedQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const showAlert = (message) => setModal({ message });

  const alreadyReturned = (item.returnedQty || 0) + (item.damagedQty || 0);
  const remainingToReturn = Math.max(0, item.quantity - alreadyReturned);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (returnQty + damagedQty === 0) {
      showAlert('กรุณาระบุจำนวนคืนหรือชำรุด');
      return;
    }

    if (returnQty + damagedQty > remainingToReturn) {
      showAlert('จำนวนคืน + ชำรุด เกินจำนวนที่เหลือ');
      return;
    }

    setLoading(true);
    try {
      await returnBorrow(borrow._id, {
        returns: [{ itemId: item._id, returnQty, damagedQty, note }],
      });

      showToast('คืนอุปกรณ์เรียบร้อยแล้ว');
      setReturnQty(0);
      setDamagedQty(0);
      setNote('');

      setTimeout(async () => {
        await onSuccess();
      }, 1000);

    } catch (err) {
      showAlert(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="return-item-card">
      <div className="return-item-left">
        <div className="item-name">{item.equipment?.name}</div>

        <div className="item-meta">
          ยืมทั้งหมด {item.quantity} ชิ้น
          {alreadyReturned > 0 && (
            <span className="already-returned">(คืนแล้ว {alreadyReturned} ชิ้น)</span>
          )}
        </div>

        <div className="modern-note-group">
          <label className={note ? 'active' : ''}>หมายเหตุ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows="3"
            placeholder="เช่น อุปกรณ์มีรอยแตก / ใช้งานได้บางส่วน"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="return-inline-form">

        {/* คืนปกติ */}
        <div className="modern-qty-group normal-group">
          <label>คืนปกติ</label>
          <div className="modern-qty-control">
            <button type="button" onClick={() => setReturnQty(Math.max(0, returnQty - 1))} disabled={loading}>−</button>
            <input
              type="number"
              min="0"
              value={returnQty}
              onChange={(e) => setReturnQty(Math.max(0, Math.min(Number(e.target.value || 0), remainingToReturn - damagedQty)))}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setReturnQty(Math.min(remainingToReturn - damagedQty, returnQty + 1))}
              disabled={loading || returnQty >= remainingToReturn - damagedQty}
            >+</button>
          </div>
        </div>

        {/* ชำรุด */}
        <div className="modern-qty-group damaged-group">
          <label>ชำรุด</label>
          <div className="modern-qty-control">
            <button type="button" onClick={() => setDamagedQty(Math.max(0, damagedQty - 1))} disabled={loading}>−</button>
            <input
              type="number"
              min="0"
              value={damagedQty}
              onChange={(e) => setDamagedQty(Math.max(0, Math.min(Number(e.target.value || 0), remainingToReturn - returnQty)))}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setDamagedQty(Math.min(remainingToReturn - returnQty, damagedQty + 1))}
              disabled={loading || damagedQty >= remainingToReturn - returnQty}
            >+</button>
          </div>
        </div>

        {/* ปุ่มคืน */}
        <button
          type="submit"
          className="modern-return-btn"
          disabled={loading || returnQty + damagedQty === 0}
        >
          {loading ? 'กำลังดำเนินการ...' : 'คืนอุปกรณ์'}
        </button>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {modal && (
        <ConfirmModal message={modal.message} onClose={() => setModal(null)} />
      )}
    </div>
  );
}