const Borrow = require('../models/Borrow');
const { createObjectCsvWriter } = require('csv-writer');

// รายงานรายเดือน
exports.monthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    // ดึงข้อมูลการเบิกในเดือนนั้น
    const borrows = await Borrow.find({ date: { $gte: start, $lte: end } }).populate('equipment');

    const summary = {};
    borrows.forEach(b => {
      if (!summary[b.equipment.name]) summary[b.equipment.name] = 0;
      summary[b.equipment.name] += b.quantity;
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// export รายงานเป็น CSV
exports.exportCSV = async (req, res) => {
  try {
    const borrows = await Borrow.find().populate('equipment');
    const csvWriter = createObjectCsvWriter({
      path: 'report.csv',
      header: [
        { id: 'equipment', title: 'Equipment' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'department', title: 'Department' },
        { id: 'purpose', title: 'Purpose' },
        { id: 'date', title: 'Date' }
      ]
    });

    const records = borrows.map(b => ({
      equipment: b.equipment.name,
      quantity: b.quantity,
      department: b.department,
      purpose: b.purpose,
      date: b.date
    }));

    await csvWriter.writeRecords(records);
    res.download('report.csv'); // ส่งไฟล์ให้ดาวน์โหลด
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
