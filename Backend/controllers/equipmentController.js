const Equipment = require('../models/Equipment');
const ActivityLog = require('../models/ActivityLog');


/* ================= ADD ================= */

exports.addEquipment = async (req, res) => {
  try {
    let { code, name, total } = req.body;

    const parsedTotal = Number(total);

    // ✅ Guard input
    if (!code || !name || !Number.isFinite(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({
        message: 'ข้อมูลไม่ถูกต้อง'
      });
    }

    const equipment = new Equipment({
      code,
      name,
      total: parsedTotal,
      available: parsedTotal
    });

    await equipment.save();

    await ActivityLog.create({
      action: 'ADD_EQUIPMENT',
      referenceId: equipment._id,
      description: `เพิ่มอุปกรณ์ ${equipment.name}`,
      equipmentName: equipment.name,
      equipmentCode: equipment.code
    });

    res.json(equipment);

  } catch (err) {
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

    let { total, name, code } = req.body;

    // ✅ Guard total (จุดสำคัญมาก)
    if (total !== undefined) {

      const parsedTotal = Number(total);

      if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({
          message: 'total ไม่ถูกต้อง'
        });
      }

      const borrowed = equipment.total - equipment.available;

      if (parsedTotal < borrowed) {
        return res.status(400).json({
          message: `ไม่สามารถตั้ง total น้อยกว่าจำนวนที่ถูกยืมอยู่ (${borrowed})`
        });
      }

      equipment.total = parsedTotal;
      equipment.available = parsedTotal - borrowed;
    }

    if (name !== undefined) equipment.name = name;
    if (code !== undefined) equipment.code = code;

    await equipment.save();

    await ActivityLog.create({
      action: 'UPDATE_EQUIPMENT',
      referenceId: equipment._id,
      description: `แก้ไขอุปกรณ์ ${equipment.name}`,
      equipmentName: equipment.name,
      equipmentCode: equipment.code
    });

    res.json(equipment);

  } catch (err) {
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

    const borrowed = equipment.total - equipment.available;

    // ✅ Guard แบบ production system
    if (borrowed > 0) {
      return res.status(400).json({
        message: `ไม่สามารถลบได้ — มีอุปกรณ์ถูกยืมอยู่ (${borrowed})`
      });
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
    res.status(500).json({ error: err.message });
  }
};
