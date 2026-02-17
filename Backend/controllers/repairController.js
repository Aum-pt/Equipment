const Repair = require('../models/Repair');
const Equipment = require('../models/Equipment');
const ActivityLog = require('../models/ActivityLog');

/**
 * GET /api/repair
 * ดึงรายการซ่อมทั้งหมด
 */
exports.getRepairs = async (req, res) => {
  try {
    const repairs = await Repair.find()
      .populate('equipment')
      .sort({ reportDate: -1 });

    res.json(repairs);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * PUT /api/repair/:id/complete
 * เปลี่ยนสถานะเป็น "ซ่อมเสร็จ"
 */
exports.completeRepair = async (req, res) => {
  try {
    const { id } = req.params;

    const repair = await Repair.findById(id).populate('equipment');

    if (!repair) {
      return res.status(404).json({ message: 'ไม่พบรายการซ่อม' });
    }

    if (repair.status === 'ซ่อมเสร็จ') {
      return res.status(400).json({ message: 'รายการนี้ซ่อมเสร็จแล้ว' });
    }

    /** ✅ เพิ่มของกลับเข้าคลัง (เฉพาะ available) */
    const equipment = await Equipment.findById(repair.equipment._id);

    if (!equipment) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์' });
    }

    if (equipment.available + repair.damagedQty > equipment.total) {
      return res.status(400).json({
        message: 'available เกิน total (data corruption)'
      });
    }

    equipment.available += repair.damagedQty;
    await equipment.save();


    /** ✅ เปลี่ยนสถานะ */
    repair.status = 'ซ่อมเสร็จ';
    await repair.save();

    /** ✅ บันทึก Activity Log */
    await ActivityLog.create({
      action: 'REPAIR_COMPLETE',
      referenceId: repair._id,
      department: repair.department,
      description: `ซ่อมอุปกรณ์ ${repair.equipment.name} เสร็จ ${repair.damagedQty} ชิ้น`,
      equipmentName: repair.equipment.name,
      equipmentCode: repair.equipment.code
    });

    res.json({
      message: 'ซ่อมเสร็จเรียบร้อย',
      repair
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
