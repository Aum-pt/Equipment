const Equipment = require('../models/Equipment');
const ActivityLog = require('../models/ActivityLog');

/* ================= ADD ================= */
/**
 * เพิ่มอุปกรณ์ใหม่เข้าระบบ
 * - ตรวจสอบข้อมูล → ตรวจ code ซ้ำ → สร้าง document → บันทึก log
 */
exports.addEquipment = async (req, res) => {
  try {
    let { code, name, total, type, low_stock_threshold } = req.body;

    // Normalize ข้อมูล: ตัด whitespace และแปลง code เป็นตัวพิมพ์ใหญ่
    code = code?.trim().toUpperCase();
    name = name?.trim();

    const parsedTotal = Number(total);

    // ตรวจสอบข้อมูลจำเป็น: code, name ต้องมีค่า และ total ต้องเป็นตัวเลขที่ไม่ติดลบ
    if (!code || !name || !Number.isFinite(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง' });
    }

    // ถ้า type ไม่ใช่ค่าที่กำหนด → default เป็น 'reusable'
    if (!['reusable', 'consumable'].includes(type)) {
      type = 'reusable';
    }

    // ตรวจสอบว่า code ซ้ำกับที่มีอยู่แล้วหรือไม่
    const existing = await Equipment.findOne({ code });
    if (existing) {
      return res.status(400).json({ message: 'รหัสอุปกรณ์นี้มีอยู่แล้ว' });
    }

    // สร้าง Equipment document ใหม่
    // available เริ่มต้น = total (ยังไม่มีใครยืม)
    const equipment = new Equipment({
      code,
      name,
      total: parsedTotal,
      available: parsedTotal,
      type,
      low_stock_threshold: Number(low_stock_threshold) || 5 // default แจ้งเตือนเมื่อเหลือ 5
    });

    await equipment.save();

    // บันทึก log การเพิ่มอุปกรณ์
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

    // error code 11000 = MongoDB duplicate key (กรณี unique index บน code)
    if (err.code === 11000) {
      return res.status(400).json({ message: 'รหัสอุปกรณ์ซ้ำ' });
    }
    res.status(500).json({ error: err.message });
  }
};

/* ================= GET ALL ================= */
/**
 * ดึงอุปกรณ์ทั้งหมด เรียงจากล่าสุดก่อน
 */
exports.getAllEquipment = async (req, res) => {
  try {
    // sort createdAt: -1 = เรียงจากใหม่ → เก่า
    const equipments = await Equipment.find().sort({ createdAt: -1 });
    res.json(equipments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= UPDATE ================= */
/**
 * แก้ไขข้อมูลอุปกรณ์ (total, name, code, low_stock_threshold)
 * - คำนวณ available ใหม่จาก total ที่เปลี่ยน โดยรักษา borrowed คงเดิม
 * - ติดตาม changes เพื่อบันทึก log ว่าแก้ไขอะไรบ้าง
 */
exports.updateEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์' });
    }

    // เก็บค่าเดิมไว้เพื่อเปรียบเทียบและบันทึก log
    const oldName = equipment.name;
    const oldTotal = equipment.total;
    const oldAvailable = equipment.available;
    const oldThreshold = equipment.low_stock_threshold;

    let { total, name, code, low_stock_threshold } = req.body;

    // array สำหรับเก็บรายการที่เปลี่ยนแปลง เช่น "จำนวนทั้งหมด: 10 → 20"
    const changes = [];

    // --- แก้ไข total ---
    if (total !== undefined) {
      const parsedTotal = Number(total);

      if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({ message: 'total ไม่ถูกต้อง' });
      }

      // borrowed = จำนวนที่ถูกยืมออกไปอยู่ในขณะนี้ (total - available)
      const borrowed = equipment.total - equipment.available;

      // ป้องกันการตั้ง total น้อยกว่าของที่ยืมออกไป
      if (parsedTotal < borrowed) {
        return res.status(400).json({
          message: `ไม่สามารถตั้ง total น้อยกว่าจำนวนที่ถูกยืมอยู่ (${borrowed})`
        });
      }

      // คำนวณ available ใหม่: รักษา borrowed เดิม แต่ปรับ total ใหม่
      equipment.total = parsedTotal;
      equipment.available = parsedTotal - borrowed;

      if (oldTotal !== parsedTotal) {
        changes.push(`จำนวนทั้งหมด: ${oldTotal} → ${parsedTotal}`);
      }
    }

    // --- แก้ไข name ---
    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({ message: 'ชื่ออุปกรณ์ห้ามว่าง' });
      }

      // บันทึก log เฉพาะเมื่อชื่อเปลี่ยนจริง
      if (trimmedName !== oldName) {
        equipment.name = trimmedName;
        changes.push(`ชื่อ: "${oldName}" → "${trimmedName}"`);
      }
    }

    // --- แก้ไข code ---
    if (code !== undefined && code !== equipment.code) {
      // ตรวจสอบว่า code ใหม่ซ้ำกับอุปกรณ์อื่นหรือไม่
      const existing = await Equipment.findOne({ code });
      if (existing) {
        return res.status(400).json({ message: 'รหัสอุปกรณ์นี้มีอยู่แล้ว' });
      }
      equipment.code = code;
      // หมายเหตุ: code ไม่ได้ถูก push ใน changes เพราะ log จะแสดง equipmentCode ใหม่อยู่แล้ว
    }

    // --- แก้ไข low_stock_threshold ---
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

    // บันทึก document ครั้งเดียวหลังแก้ไขทุก field (ลด DB round-trip)
    await equipment.save();

    // ตรวจสอบ available หลัง save (กรณี total เปลี่ยน) แล้ว push เพิ่ม
    if (oldAvailable !== equipment.available) {
      changes.push(`คงเหลือ: ${oldAvailable} → ${equipment.available}`);
    }

    // บันทึก log: ถ้ามีการเปลี่ยนแปลง → แสดง diff, ถ้าไม่มี → แสดงข้อความทั่วไป
    await ActivityLog.create({
      action: 'UPDATE_EQUIPMENT',
      referenceId: equipment._id,
      equipmentName: equipment.name,
      equipmentCode: equipment.code,
      description: changes.length > 0
        ? changes.join(' | ')
        : `แก้ไขอุปกรณ์ ${equipment.name}`
    });

    res.json(equipment);
  } catch (err) {
    console.log('UPDATE ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= INCREASE STOCK ================= */
/**
 * เพิ่มจำนวน stock (กรณีซื้อของเพิ่ม)
 * - เพิ่มทั้ง total และ available พร้อมกัน (ของใหม่ยังไม่ถูกยืม)
 */
exports.increaseStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { qty } = req.body;

    const parsedQty = Number(qty);

    // qty ต้องเป็นตัวเลขบวกเท่านั้น
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ message: "จำนวนไม่ถูกต้อง" });
    }

    // ใช้ $inc เพิ่ม total และ available พร้อมกันแบบ atomic
    const updated = await Equipment.findByIdAndUpdate(
      id,
      { $inc: { total: parsedQty, available: parsedQty } },
      { new: true } // คืนค่าหลัง update
    );

    if (!updated) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์" });
    }

    await ActivityLog.create({
      action: 'INCREASE_STOCK',
      referenceId: updated._id,
      equipmentName: updated.name,
      equipmentCode: updated.code,
      description: `เพิ่มสต๊อก +${parsedQty}`
    });

    res.json(updated);
  } catch (err) {
    console.error('INCREASE STOCK ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= DELETE ================= */
/**
 * ลบอุปกรณ์ออกจากระบบ (Hard Delete)
 * - reusable: ลบได้เฉพาะเมื่อไม่มีของค้างอยู่กับใคร
 * - consumable: ลบได้เลยเพราะไม่มีการคืน
 */
exports.deleteEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์' });
    }

    // เฉพาะ reusable ต้องตรวจสอบว่ามีของถูกยืมค้างอยู่หรือไม่
    // consumable ไม่ต้องตรวจ เพราะไม่มีการคืน
    if (equipment.type !== 'consumable') {
      const borrowed = equipment.total - equipment.available;
      if (borrowed > 0) {
        return res.status(400).json({
          message: `ไม่สามารถลบได้ — มีอุปกรณ์ถูกยืมอยู่ (${borrowed})`
        });
      }
    }

    // ลบ document ออกจาก DB จริง (ต่างจาก borrowController ที่ใช้ soft delete)
    await Equipment.findByIdAndDelete(req.params.id);

    // บันทึก log ก่อนข้อมูลหายไป (referenceId ยังคงอยู่ใน log แม้ document ถูกลบ)
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