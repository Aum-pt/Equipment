const Borrow = require('../models/Borrow');
const Repair = require('../models/Repair');

function calculateStatus({ borrow, repair }) {

  if (repair?.reportDate && !repair?.completedDate) {
    return 'กำลังซ่อม';
  }

  if (repair?.completedDate) {
    return 'คืนแล้ว';
  }

  if (borrow.status === 'เสร็จสิ้น') {
    return 'เสร็จสิ้น';
  }

  if (borrow.status !== 'คืนแล้ว') {
    return 'ยืมอยู่';
  }

  return borrow.status;
}

exports.getReport = async (req, res) => {
  try {
    const { date, status, search } = req.query;

    const borrows = await Borrow.find()
      .populate('items.equipment')
      .sort({ createdAt: -1 });

    const repairs = await Repair.find();

    const repairMap = new Map();

    for (const repair of repairs) {
      const key = `${repair.borrow}_${repair.equipment}`;
      repairMap.set(key, repair);
    }

    let reportData = [];

    for (const borrow of borrows) {
      for (const item of borrow.items) {
        const equipment = item.equipment;
        if (!equipment) continue;

        const key = `${borrow._id}_${equipment._id}`;
        const repair = repairMap.get(key);

        const calculatedStatus = calculateStatus({ borrow, repair });

        reportData.push({
          borrowId: borrow._id,

          equipmentName: equipment.name,
          equipmentCode: equipment.code,
          quantity: item.quantity,
          borrowDate: borrow.borrowDate,
          returnDate: calculatedStatus === 'คืนแล้ว'
            ? borrow.updatedAt
            : null,

          repairDate: repair?.reportDate || null,
          repairCompletedDate: repair?.completedDate || null,
          status: calculatedStatus,
          borrowNote: borrow.note || '',
          returnNote: item.returnNote || ''
        });
      }
    }

    // ===== SEARCH =====
    if (search) {
      reportData = reportData.filter(r =>
        r.equipmentName?.toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    // ===== STATUS =====
    if (status) {
      reportData = reportData.filter(r => r.status === status);
    }

    // ===== SINGLE DATE FILTER =====
    function isSameDay(d1, d2) {
      if (!d1 || !d2) return false;

      const a = new Date(d1);
      const b = new Date(d2);

      return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
      );
    }

    if (date) {
      const selected = new Date(date);

      reportData = reportData.filter(r =>
        isSameDay(r.borrowDate, selected) ||
        isSameDay(r.returnDate, selected) ||
        isSameDay(r.repairDate, selected) ||
        isSameDay(r.repairCompletedDate, selected)
      );
    }

    res.json(reportData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};