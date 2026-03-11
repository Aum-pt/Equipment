const mongoose = require('mongoose');
const Borrow = require('../models/Borrow');
const Equipment = require('../models/Equipment');
const Repair = require('../models/Repair');
const ActivityLog = require('../models/ActivityLog');

/* ================= BORROW ================= */
exports.borrowEquipment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { borrowDetails, department, purpose, note } = req.body;

    if (!department) {
      return res.status(400).json({ message: 'กรุณาระบุกองงาน' });
    }
    if (!Array.isArray(borrowDetails) || borrowDetails.length === 0) {
      return res.status(400).json({ message: 'ไม่มีรายการอุปกรณ์ที่ต้องการเบิก' });
    }

    session.startTransaction();

    const equipmentNames = [];
    const equipmentCodes = [];
    const items = [];
    let allConsumable = true; 

    const mergedMap = new Map(); 

    for (const item of borrowDetails) {
      const equipmentId = item.equipment;
      const qty = Number(item.quantity);

      if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        throw new Error(`equipmentId ไม่ถูกต้อง: ${equipmentId}`);
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`จำนวนเบิกไม่ถูกต้อง: ${qty}`);
      }

      if (mergedMap.has(equipmentId)) {
        mergedMap.set(equipmentId, mergedMap.get(equipmentId) + qty);
      } else {
        mergedMap.set(equipmentId, qty);
      }
    }

    const mergedBorrowDetails = Array.from(mergedMap.entries()).map(
      ([equipment, quantity]) => ({ equipment, quantity })
    );

    if (mergedBorrowDetails.length === 0) {
      throw new Error('ไม่มีรายการที่ถูกต้อง');
    }

    for (const item of mergedBorrowDetails) {
      const equipmentId = item.equipment;
      const qty = item.quantity;

      const equipment = await Equipment.findOneAndUpdate(
        { _id: equipmentId, available: { $gte: qty } },
        { $inc: { available: -qty } },
        { new: true, session }
      );

      if (!equipment) {
        throw new Error('อุปกรณ์มีไม่พอ หรือถูกเบิกไปแล้ว');
      }

      if (equipment.type !== 'consumable') {
        allConsumable = false;
      }

      equipmentNames.push(equipment.name);
      equipmentCodes.push(equipment.code);
      items.push({ equipment: equipment._id, quantity: qty });
    }

    const borrow = new Borrow({
      department,
      purpose,
      note: note || '',
      status: allConsumable ? 'เสร็จสิ้น' : 'ยืมอยู่',
      items
    });
    await borrow.save({ session });

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

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'เบิกสำเร็จ', borrow });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/* ================= RETURN ================= */
exports.returnEquipment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;     
    const { returns } = req.body;  

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

      item.returnedQty = (item.returnedQty || 0) + returnQty;
      item.damagedQty = (item.damagedQty || 0) + damagedQty;

      const updated = await Equipment.findOneAndUpdate(
        { _id: equipment._id },
        { $inc: { available: returnQty } },
        { new: true, session }
      );

      if (updated.available > updated.total) {
        throw new Error('available เกิน total');
      }

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

    const allReturned = borrow.items
      .filter(i => i.equipment.type !== 'consumable')
      .every(
        i => i.quantity === (i.returnedQty || 0) + (i.damagedQty || 0)
      );

    if (allReturned) borrow.status = 'คืนแล้ว';

    await borrow.save({ session });

    const equipmentNames = borrow.items.map(i => i.equipment?.name).filter(Boolean);
    const equipmentCodes = borrow.items.map(i => i.equipment?.code).filter(Boolean);

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
exports.getActiveBorrows = async (req, res, next) => {
  try {
    const borrows = await Borrow.find({ status: 'ยืมอยู่', isDeleted: false })
      .populate('items.equipment');

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

      if (borrow.status === 'คืนแล้ว') continue;

      if (equipment.type === 'consumable') continue;

      const borrowedQty = item.quantity;
      const returnedQty = item.returnedQty || 0;
      const damagedQty = item.damagedQty || 0;
      const stillOut = borrowedQty - returnedQty - damagedQty;

      if (stillOut <= 0) continue;
      const updated = await Equipment.findOneAndUpdate(
        { _id: equipment._id },
        { $inc: { available: stillOut } },
        { new: true, session }
      );

      if (!updated) throw new Error('ไม่พบ equipment');
      if (updated.available > updated.total) throw new Error('available เกิน total');
    }

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