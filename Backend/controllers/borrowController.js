const mongoose = require('mongoose');
const Borrow = require('../models/Borrow');
const Equipment = require('../models/Equipment');
const Repair = require('../models/Repair');
const ActivityLog = require('../models/ActivityLog');

/* ================= BORROW ================= */

exports.borrowEquipment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { borrowDetails, department, purpose } = req.body;

    if (!borrowDetails || borrowDetails.length === 0) {
      return res.status(400).json({ message: 'ไม่มีรายการอุปกรณ์ที่ต้องการเบิก' });
    }

    session.startTransaction();

    const equipmentNames = [];
    const equipmentCodes = [];
    const items = [];

    for (const item of borrowDetails) {
      const qty = Number(item.borrowQuantity);

      // ✅ Guard input
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('จำนวนเบิกไม่ถูกต้อง');
      }

      // ✅ Atomic stock update (กัน race condition)
      const equipment = await Equipment.findOneAndUpdate(
        { _id: item._id, available: { $gte: qty } },
        { $inc: { available: -qty } },
        { new: true, session }
      );

      if (!equipment) {
        throw new Error(`อุปกรณ์ไม่พอในคลัง`);
      }

      equipmentNames.push(equipment.name);
      equipmentCodes.push(equipment.code);

      items.push({
        equipment: equipment._id,
        quantity: qty
      });
    }

    const borrow = new Borrow({
      department,
      purpose,
      status: 'ยืมอยู่',
      items
    });

    await borrow.save({ session });

    await ActivityLog.create([{
      action: 'BORROW',
      referenceId: borrow._id,
      department,
      description: `เบิก ${items.length} รายการ (${equipmentNames.join(', ')})`,
      equipmentName: equipmentNames.join(', '),
      equipmentCode: equipmentCodes.join(', ')
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json(borrow);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
};

/* ================= RETURN ================= */

exports.returnEquipment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { returns } = req.body;

    if (!returns || returns.length === 0) {
      return res.status(400).json({ message: 'ไม่มีรายการคืน' });
    }

    session.startTransaction();

    const borrow = await Borrow.findById(id)
      .populate('items.equipment')
      .session(session);

    if (!borrow) throw new Error('ไม่พบใบยืม');

    for (const r of returns) {
      const item = borrow.items.id(r.itemId);
      if (!item) throw new Error('ไม่พบรายการอุปกรณ์');

      const returnQty = Number(r.returnQty || 0);
      const damagedQty = Number(r.damagedQty || 0);

      // ✅ Guard input
      if (!Number.isFinite(returnQty) || !Number.isFinite(damagedQty)) {
        throw new Error('จำนวนคืนไม่ถูกต้อง');
      }

      if (returnQty < 0 || damagedQty < 0) {
        throw new Error('จำนวนคืนติดลบไม่ได้');
      }

      if (item.returnedQty + item.damagedQty > item.quantity) {
        throw new Error('ข้อมูล Borrow เสีย (returned > quantity)');
      }

      const remaining = item.quantity - item.returnedQty - item.damagedQty;


            if (returnQty + damagedQty > remaining) {
        throw new Error(`คืนเกินจำนวน (${item.equipment.name})`);
      }

      item.returnedQty += returnQty;
      item.damagedQty += damagedQty;

      if (returnQty > 0) {
        const equipment = await Equipment.findById(item.equipment._id)
          .session(session);

        if (!equipment) throw new Error('ไม่พบอุปกรณ์');

        // ✅ Guard corruption
        if (equipment.available + returnQty > equipment.total) {
          throw new Error('available เกิน total (data corruption)');
        }

        equipment.available += returnQty;
        await equipment.save({ session });
      }

      if (damagedQty > 0) {
        const repair = new Repair({
          equipment: item.equipment._id,
          borrow: borrow._id,
          department: borrow.department,
          damagedQty
        });

        await repair.save({ session });
      }
    }

    const allReturned = borrow.items.every(i =>
      i.quantity === i.returnedQty + i.damagedQty
    );

    if (allReturned) borrow.status = 'คืนแล้ว';

    await borrow.save({ session });

    const names = borrow.items.map(i => i.equipment.name);
    const codes = borrow.items.map(i => i.equipment.code);

    await ActivityLog.create([{
      action: 'RETURN',
      referenceId: borrow._id,
      department: borrow.department,
      description: `คืนอุปกรณ์ (${borrow.department})`,
      equipmentName: names.join(', '),
      equipmentCode: codes.join(', ')
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'คืนอุปกรณ์สำเร็จ', borrow });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
};

/* ================= GET ACTIVE ================= */

exports.getActiveBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find({ status: 'ยืมอยู่' })
      .populate('items.equipment');

    res.json(borrows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= GET ALL ================= */

exports.getAllBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find()
      .populate('items.equipment');

    res.json(borrows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
