const mongoose = require('mongoose');
const Borrow = require('../models/Borrow');
const Equipment = require('../models/Equipment');
const Repair = require('../models/Repair');
const ActivityLog = require('../models/ActivityLog');

/* ================= BORROW ================= */
/**
 * เบิกอุปกรณ์
 * - รับรายการอุปกรณ์และจำนวนที่ต้องการเบิก
 * - รวมรายการซ้ำ → ตัด stock → สร้างใบเบิก → บันทึก log
 */
exports.borrowEquipment = async (req, res, next) => {
  // เปิด session สำหรับ MongoDB Transaction (เพื่อให้ทุก operation สำเร็จหรือล้มเหลวพร้อมกัน)
  const session = await mongoose.startSession();
  try {
    const { borrowDetails, department, purpose, note } = req.body;

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!department) {
      return res.status(400).json({ message: 'กรุณาระบุกองงาน' });
    }
    if (!Array.isArray(borrowDetails) || borrowDetails.length === 0) {
      return res.status(400).json({ message: 'ไม่มีรายการอุปกรณ์ที่ต้องการเบิก' });
    }

    session.startTransaction();

    // ตัวแปรเก็บข้อมูลสำหรับสร้าง log และ Borrow document
    const equipmentNames = [];
    const equipmentCodes = [];
    const items = [];
    let allConsumable = true; // ใช้ตัดสินว่า status ควรเป็น 'เสร็จสิ้น' หรือ 'ยืมอยู่'

    // =============================
    // 1️⃣ รวม equipment ซ้ำ
    //    กรณีที่ client ส่งอุปกรณ์ชิ้นเดียวกันมาหลายแถว ให้รวม quantity เข้าด้วยกัน
    // =============================
    const mergedMap = new Map(); // key = equipmentId, value = quantity รวม

    for (const item of borrowDetails) {
      const equipmentId = item.equipment;
      const qty = Number(item.quantity);

      // ตรวจสอบ ObjectId ว่าถูกรูปแบบหรือไม่
      if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        throw new Error(`equipmentId ไม่ถูกต้อง: ${equipmentId}`);
      }

      // ตรวจสอบจำนวนที่เบิกต้องเป็นตัวเลขบวกเท่านั้น
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`จำนวนเบิกไม่ถูกต้อง: ${qty}`);
      }

      // รวม quantity ถ้ามี equipment ซ้ำ
      if (mergedMap.has(equipmentId)) {
        mergedMap.set(equipmentId, mergedMap.get(equipmentId) + qty);
      } else {
        mergedMap.set(equipmentId, qty);
      }
    }

    // แปลง Map กลับเป็น array รูปแบบ [{ equipment, quantity }]
    const mergedBorrowDetails = Array.from(mergedMap.entries()).map(
      ([equipment, quantity]) => ({ equipment, quantity })
    );

    if (mergedBorrowDetails.length === 0) {
      throw new Error('ไม่มีรายการที่ถูกต้อง');
    }

    // =============================
    // 2️⃣ ตัด stock ตามรายการที่ merge แล้ว
    //    ใช้ findOneAndUpdate แบบ atomic เพื่อป้องกัน race condition
    //    (ตัดและตรวจสอบในคำสั่งเดียว ป้องกันการเบิกเกิน stock)
    // =============================
    for (const item of mergedBorrowDetails) {
      const equipmentId = item.equipment;
      const qty = item.quantity;

      // ลด available ลง qty เฉพาะเมื่อ available มีมากพอ (available >= qty)
      const equipment = await Equipment.findOneAndUpdate(
        { _id: equipmentId, available: { $gte: qty } },
        { $inc: { available: -qty } },
        { new: true, session }
      );

      // ถ้า equipment เป็น null แปลว่า stock ไม่พอหรือ id ไม่ถูกต้อง
      if (!equipment) {
        throw new Error('อุปกรณ์มีไม่พอ หรือถูกเบิกไปแล้ว');
      }

      // ถ้ามีอุปกรณ์ที่ไม่ใช่ consumable สักชิ้น → ต้องติดตามการคืน
      if (equipment.type !== 'consumable') {
        allConsumable = false;
      }

      // เก็บข้อมูลสำหรับสร้าง Borrow document และ log
      equipmentNames.push(equipment.name);
      equipmentCodes.push(equipment.code);
      items.push({ equipment: equipment._id, quantity: qty });
    }

    // =============================
    // 3️⃣ สร้าง Borrow document
    //    - status = 'เสร็จสิ้น' ถ้าเป็น consumable ทั้งหมด (ไม่ต้องคืน)
    //    - status = 'ยืมอยู่' ถ้ามีอุปกรณ์ที่ต้องคืน
    // =============================
    const borrow = new Borrow({
      department,
      purpose,
      note: note || '',
      status: allConsumable ? 'เสร็จสิ้น' : 'ยืมอยู่',
      items
    });
    await borrow.save({ session });

    // =============================
    // 4️⃣ บันทึก ActivityLog
    //    format: "เบิก N รายการ|1. ชื่อ จำนวน ชิ้น|2. ..."
    // =============================
    const descriptionText = [
      `เบิก ${mergedBorrowDetails.length} รายการ`,
      ...mergedBorrowDetails.map(
        (item, i) => `${i + 1}. ${equipmentNames[i]} ${item.quantity} ชิ้น`
      )
    ].join('|');

    await ActivityLog.create(
      [{
        action: 'BORROW',
        referenceId: borrow._id,
        department,
        description: descriptionText,
        equipmentName: equipmentNames.join(', '),
        equipmentCode: equipmentCodes.join(', ')
      }],
      { session }
    );

    // ยืนยัน transaction ทุก operation สำเร็จ
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'เบิกสำเร็จ', borrow });
  } catch (err) {
    // ถ้ามี error ใด ๆ → ยกเลิกทุก operation ใน transaction ทั้งหมด
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/* ================= RETURN ================= */
/**
 * คืนอุปกรณ์
 * - รับรายการ itemId, returnQty (ปกติ), damagedQty (ชำรุด)
 * - เพิ่ม stock คืน → สร้าง Repair ถ้ามีชำรุด → อัปเดต status ใบยืม
 */
exports.returnEquipment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;     // _id ของ Borrow document
    const { returns } = req.body;  // array ของ { itemId, returnQty, damagedQty, note }

    if (!returns || returns.length === 0) {
      return res.status(400).json({ message: 'ไม่มีรายการคืน' });
    }

    session.startTransaction();

    // ดึงใบยืมพร้อม populate ข้อมูลอุปกรณ์ใน items
    const borrow = await Borrow.findOne({ _id: id, isDeleted: false })
      .populate('items.equipment')
      .session(session);

    if (!borrow) throw new Error('ไม่พบใบยืม');

    for (const r of returns) {
      // หา sub-document ของ item ที่ต้องการคืน
      const item = borrow.items.id(r.itemId);
      if (!item) throw new Error('ไม่พบรายการอุปกรณ์');

      const equipment = item.equipment;

      // consumable ไม่ต้องคืน → ข้ามไป
      if (equipment.type === 'consumable') continue;

      const returnQty = Number(r.returnQty || 0);
      const damagedQty = Number(r.damagedQty || 0);

      // บันทึก note การคืน (ถ้ามี)
      if (r.note) {
        item.returnNote = r.note;
      }

      // ตรวจสอบว่าเป็นตัวเลขที่ถูกต้อง
      if (!Number.isFinite(returnQty) || !Number.isFinite(damagedQty)) {
        throw new Error('จำนวนคืนไม่ถูกต้อง');
      }
      if (returnQty < 0 || damagedQty < 0) {
        throw new Error('จำนวนคืนติดลบไม่ได้');
      }

      // คำนวณจำนวนที่ยังค้างอยู่ (ยังไม่ได้คืนและยังไม่ได้รายงานชำรุด)
      const remaining = item.quantity - (item.returnedQty || 0) - (item.damagedQty || 0);

      // ป้องกันการคืนเกินจำนวนที่ยืมไป
      if (returnQty + damagedQty > remaining) {
        throw new Error(`คืนเกินจำนวน (${equipment.name})`);
      }

      // อัปเดต returnedQty และ damagedQty สะสม
      item.returnedQty = (item.returnedQty || 0) + returnQty;
      item.damagedQty = (item.damagedQty || 0) + damagedQty;

      // เพิ่ม available stock คืน (เฉพาะของที่คืนปกติ ของชำรุดไม่นับกลับ)
      const updated = await Equipment.findOneAndUpdate(
        { _id: equipment._id },
        { $inc: { available: returnQty } },
        { new: true, session }
      );

      // sanity check: available ต้องไม่เกิน total
      if (updated.available > updated.total) {
        throw new Error('available เกิน total');
      }

      // ถ้ามีของชำรุด → สร้าง Repair document เพื่อติดตามการซ่อม
      if (damagedQty > 0) {
        const repair = new Repair({
          equipment: equipment._id,
          borrow: borrow._id,
          department: borrow.department,
          damagedQty
        });
        await repair.save({ session });
      }
    }

    // ตรวจสอบว่าคืนครบทุกรายการที่ไม่ใช่ consumable แล้วหรือยัง
    const allReturned = borrow.items
      .filter(i => i.equipment.type !== 'consumable')
      .every(
        i => i.quantity === (i.returnedQty || 0) + (i.damagedQty || 0)
      );

    // ถ้าคืนครบ → อัปเดต status เป็น 'คืนแล้ว'
    if (allReturned) borrow.status = 'คืนแล้ว';

    await borrow.save({ session });

    // รวบรวมข้อมูลสำหรับ log
    const equipmentNames = borrow.items.map(i => i.equipment?.name).filter(Boolean);
    const equipmentCodes = borrow.items.map(i => i.equipment?.code).filter(Boolean);

    // สร้าง description แสดงรายละเอียดการคืนแต่ละชิ้น
    const returnDetails = borrow.items
      .filter(i => (i.returnedQty || 0) > 0 || (i.damagedQty || 0) > 0)
      .map(i => {
        const name = i.equipment?.name;
        const normal = i.returnedQty || 0;
        const damaged = i.damagedQty || 0;
        return `${name} (ปกติ ${normal}, ชำรุด ${damaged})`;
      });

    await ActivityLog.create(
      [{
        action: 'RETURN',
        referenceId: borrow._id,
        department: borrow.department,
        description: returnDetails.join('|'),
        equipmentName: equipmentNames.join(', '),
        equipmentCode: equipmentCodes.join(', ')
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'คืนอุปกรณ์สำเร็จ', borrow });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/* ================= GET ACTIVE ================= */
/**
 * ดึงใบยืมที่กำลังยืมอยู่ (status = 'ยืมอยู่')
 * - กรอง items ที่เป็น consumable ออก เพราะไม่มีการคืน
 */
exports.getActiveBorrows = async (req, res, next) => {
  try {
    const borrows = await Borrow.find({ status: 'ยืมอยู่', isDeleted: false })
      .populate('items.equipment');

    // ตัด item ที่เป็น consumable ออกจาก response (แสดงเฉพาะที่ต้องคืน)
    const filtered = borrows.map(b => ({
      ...b.toObject(),
      items: b.items.filter(i => i.equipment.type !== 'consumable')
    }));

    res.json(filtered);
  } catch (err) {
    next(err);
  }
};

/* ================= GET ALL ================= */
/**
 * ดึงใบยืมทั้งหมด (ยกเว้นที่ถูก soft delete)
 */
exports.getAllBorrows = async (req, res, next) => {
  try {
    const borrows = await Borrow.find({ isDeleted: false })
      .populate('items.equipment');
    res.json(borrows);
  } catch (err) {
    next(err);
  }
};

/* ================= DELETE ================= */
/**
 * ลบใบยืม (Soft Delete)
 * - ถ้าใบยืมยังไม่ได้คืนครบ → คืน stock กลับให้อุปกรณ์ที่ยังค้างอยู่
 * - ตั้ง isDeleted = true แทนการลบจริง (เพื่อรักษา audit trail)
 */
exports.deleteBorrow = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const borrow = await Borrow.findOne({ _id: req.params.id, isDeleted: false })
      .populate('items.equipment')
      .session(session);

    if (!borrow) throw new Error('ไม่พบใบยืม');

    for (const item of borrow.items) {
      const equipment = item.equipment;

      // ถ้าคืนครบแล้ว → ไม่ต้องคืน stock (ถูกคืนไปแล้วตอน returnEquipment)
      if (borrow.status === 'คืนแล้ว') continue;

      // consumable ไม่มีการคืน stock
      if (equipment.type === 'consumable') continue;

      const borrowedQty = item.quantity;
      const returnedQty = item.returnedQty || 0;
      const damagedQty = item.damagedQty || 0;

      // คำนวณจำนวนที่ยังค้างอยู่ (ยังไม่ได้คืนและยังไม่ได้รายงานชำรุด)
      const stillOut = borrowedQty - returnedQty - damagedQty;

      // ไม่มีของค้างอยู่ → ข้ามไป
      if (stillOut <= 0) continue;

      // คืน stock กลับเฉพาะส่วนที่ยังค้างอยู่
      const updated = await Equipment.findOneAndUpdate(
        { _id: equipment._id },
        { $inc: { available: stillOut } },
        { new: true, session }
      );

      if (!updated) throw new Error('ไม่พบ equipment');

      // sanity check: available ต้องไม่เกิน total
      if (updated.available > updated.total) throw new Error('available เกิน total');
    }

    // Soft delete: ตั้ง flag isDeleted = true แทนการลบออกจาก DB จริง
    borrow.isDeleted = true;
    await borrow.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'ลบใบยืมสำเร็จ' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};