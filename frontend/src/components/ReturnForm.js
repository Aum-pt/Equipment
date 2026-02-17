import { useState } from 'react';
import { returnBorrow } from '../services/api';

export default function ReturnForm({ borrow, item, onSuccess }) {
  const [returnQty, setReturnQty] = useState(0);
  const [damagedQty, setDamagedQty] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (returnQty + damagedQty === 0) {
      alert('กรุณาระบุจำนวนคืนหรือชำรุด');
      return;
    }

    if (returnQty + damagedQty > item.quantity) {
      alert('จำนวนคืน + ชำรุด เกินจำนวนที่ยืม');
      return;
    }

    try {
      await returnBorrow(borrow._id, {
        returns: [
          {
            itemId: item._id,
            returnQty,
            damagedQty
          }
        ]
      });

      setReturnQty(0);
      setDamagedQty(0);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
  };

return (
  <div className="return-item-card">

    <div className="return-item-left">
      <div className="item-name">
        {item.equipment?.name}
      </div>

      <div className="item-meta">
        ยืมทั้งหมด {item.quantity} ชิ้น
      </div>
    </div>

    <form onSubmit={handleSubmit} className="return-item-right">

      <div className="qty-group">
        <label>คืนปกติ</label>
        <input
          type="number"
          min="0"
          max={item.quantity}
          value={returnQty}
          onChange={(e) => setReturnQty(+e.target.value)}
        />
      </div>

      <div className="qty-group">
        <label>ชำรุด</label>
        <input
          type="number"
          min="0"
          max={item.quantity}
          value={damagedQty}
          onChange={(e) => setDamagedQty(+e.target.value)}
        />
      </div>

      <button type="submit" className="return-btn">
        คืนอุปกรณ์
      </button>
    </form>

  </div>
);

}
