const Equipment = require('../models/Equipment');
const ActivityLog = require('../models/ActivityLog');

/* ================= ADD ================= */

exports.addEquipment = async (req, res) => {
  try {
    let { code, name, total, type, low_stock_threshold } = req.body;

    code = code?.trim().toUpperCase();
    name = name?.trim();

    const parsedTotal = Number(total);

    if (!code || !name || !Number.isFinite(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง' });
    }

    if (!['reusable', 'consumable'].includes(type)) {
      type = 'reusable';
    }

    const existing = await Equipment.findOne({ code });

    if (existing) {
      return res.status(400).json({ message: 'รหัสอุปกรณ์นี้มีอยู่แล้ว' });
    }

    const equipment = new Equipment({
      code,
      name,
      total: parsedTotal,
      available: parsedTotal,
      type,
      low_stock_threshold: Number(low_stock_threshold) || 5
    });


    await equipment.save();

    await ActivityLog.create({
    action: 'ADD_EQUIPMENT',
    referenceId: equipment._id,
    equipmentName: equipment.name,
    equipmentCode: equipment.code,
    description: [
      `รหัส: ${equipment.code}`,
      `ชื่อ: ${equipment.name}`,
      `จำนวนทั้งหมด: ${equipment.total}`,
      `ประเภท: ${equipment.type === 'reusable' ? 'ใช้ซ้ำได้' : 'ใช้แล้วหมด'}`,
      `ค่าแจ้งเตือน: ${equipment.low_stock_threshold}`
    ].join(' | ')
  });
    res.json(equipment);

  } catch (err) {
    console.error('ADD EQUIPMENT ERROR >>>', err);

    if (err.code === 11000) {
      return res.status(400).json({ message: 'รหัสอุปกรณ์ซ้ำ' });
    }

    res.status(500).json({ error: err.message });
  }
};

/* ================= GET ALL ================= */

exports.getAllEquipment = async (req, res) => {
  try {
    const equipments = await Equipment.find().sort({ createdAt: -1 });
    res.json(equipments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= UPDATE ================= */

exports.updateEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์' });
    }

    const oldName = equipment.name;
    const oldTotal = equipment.total;
    const oldAvailable = equipment.available;
    const oldThreshold = equipment.low_stock_threshold;

    let { total, name, code, low_stock_threshold } = req.body;

    // ✅ เก็บ changes ไว้ก่อนเลย (แก้ bug)
    const changes = [];

    if (total !== undefined) {
      const parsedTotal = Number(total);

      if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({ message: 'total ไม่ถูกต้อง' });
      }

      const borrowed = equipment.total - equipment.available;

      if (parsedTotal < borrowed) {
        return res.status(400).json({
          message: `ไม่สามารถตั้ง total น้อยกว่าจำนวนที่ถูกยืมอยู่ (${borrowed})`
        });
      }

      equipment.total = parsedTotal;
      equipment.available = parsedTotal - borrowed;

      if (oldTotal !== parsedTotal) {
        changes.push(`จำนวนทั้งหมด: ${oldTotal} → ${parsedTotal}`);
      }
    }

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({ message: 'ชื่ออุปกรณ์ห้ามว่าง' });
      }

      if (trimmedName !== oldName) {
        equipment.name = trimmedName;
        changes.push(`ชื่อ: "${oldName}" → "${trimmedName}"`);
      }
    }

    if (code !== undefined && code !== equipment.code) {
      const existing = await Equipment.findOne({ code });

      if (existing) {
        return res.status(400).json({ message: 'รหัสอุปกรณ์นี้มีอยู่แล้ว' });
      }

      equipment.code = code;
    }

    // ✅ threshold
    if (low_stock_threshold !== undefined) {
      const newThreshold = Number(low_stock_threshold);

      if (!Number.isFinite(newThreshold) || newThreshold < 0) {
        return res.status(400).json({ message: 'threshold ไม่ถูกต้อง' });
      }

      if (newThreshold !== oldThreshold) {
        equipment.low_stock_threshold = newThreshold;
        changes.push(`ค่าแจ้งเตือน: ${oldThreshold} → ${newThreshold}`);
      }
    }

    // ✅ save ทีเดียวหลังแก้ทุกอย่าง
    await equipment.save();

    if (oldAvailable !== equipment.available) {
      changes.push(`คงเหลือ: ${oldAvailable} → ${equipment.available}`);
    }

    await ActivityLog.create({
      action: 'UPDATE_EQUIPMENT',
      referenceId: equipment._id,
      equipmentName: equipment.name,
      equipmentCode: equipment.code,
      description:
        changes.length > 0
          ? changes.join(' | ')
          : `แก้ไขอุปกรณ์ ${equipment.name}`
    });

    res.json(equipment);

  } catch (err) {
    console.log('UPDATE ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= DELETE ================= */

exports.deleteEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์' });
    }

    /* ✅ consumable ไม่ต้องสน borrowed */
    if (equipment.type !== 'consumable') {

      const borrowed = equipment.total - equipment.available;

      if (borrowed > 0) {
        return res.status(400).json({
          message: `ไม่สามารถลบได้ — มีอุปกรณ์ถูกยืมอยู่ (${borrowed})`
        });
      }
    }

    await Equipment.findByIdAndDelete(req.params.id);

    await ActivityLog.create({
      action: 'DELETE_EQUIPMENT',
      referenceId: equipment._id,
      description: `ลบอุปกรณ์ ${equipment.name}`,
      equipmentName: equipment.name,
      equipmentCode: equipment.code
    });

    res.json({ message: 'Deleted' });

  } catch (err) {
    console.error('DELETE EQUIPMENT ERROR >>>', err);
    res.status(500).json({ error: err.message });
  }
};
