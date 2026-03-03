const mongoose = require('mongoose');
const Borrow = require('../models/Borrow');
const Equipment = require('../models/Equipment');
const Repair = require('../models/Repair');
const ActivityLog = require('../models/ActivityLog');


/* ================= QUERY ALL ================= */
exports.getAllBorrows = async (req, res, next) => {
  try {
    const borrows = await Borrow.find({ isDeleted: false })
      .populate('items.equipment')
      .sort({ createdAt: -1 });

    res.json(borrows);
  } catch (err) {
    next(err);
  }
};


/* ================= QUERY ACTIVE ================= */
exports.getActiveBorrows = async (req, res, next) => {
  try {
    const borrows = await Borrow.find({
      isDeleted: false,
      status: { $ne: 'คืนแล้ว' }
    })
      .populate('items.equipment')
      .sort({ createdAt: -1 });

    res.json(borrows);
  } catch (err) {
    next(err);
  }
};


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

    const mergedMap = new Map();

    for (const item of borrowDetails) {
      const equipmentId = item.equipment;
      const qty = Number(item.quantity);

      if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        throw new Error(`equipmentId ไม่ถูกต้อง: ${equipmentId}`);
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`จำนวนเบิกไม่ถูกต้อง`);
      }

      mergedMap.set(
        equipmentId,
        (mergedMap.get(equipmentId) || 0) + qty
      );
    }

    const mergedBorrowDetails = Array.from(mergedMap.entries()).map(
      ([equipment, quantity]) => ({ equipment, quantity })
    );

    const equipmentNames = [];
    const equipmentCodes = [];
    const items = [];
    let allConsumable = true;

    for (const item of mergedBorrowDetails) {

      const equipment = await Equipment.findOneAndUpdate(
        {
          _id: item.equipment,
          isDeleted: false,
          available: { $gte: item.quantity }
        },
        { $inc: { available: -item.quantity } },
        { new: true, session }
      );

      if (!equipment) {
        throw new Error('อุปกรณ์มีไม่พอ หรือถูกลบไปแล้ว');
      }

      if (equipment.type !== 'consumable') {
        allConsumable = false;
      }

      equipmentNames.push(equipment.name);
      equipmentCodes.push(equipment.code);

      items.push({
        equipment: equipment._id,
        quantity: item.quantity
      });
    }

    const borrow = new Borrow({
      department,
      purpose,
      note: note || '',
      status: allConsumable ? 'เสร็จสิ้น' : 'ยืมอยู่',
      items
    });

    await borrow.save({ session });

    await ActivityLog.create([{
      action: 'BORROW',
      referenceId: borrow._id,
      department,
      description: `เบิก ${items.length} รายการ`,
      equipmentName: equipmentNames.join(', '),
      equipmentCode: equipmentCodes.join(', ')
    }], { session });

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

    if (!Array.isArray(returns) || returns.length === 0) {
      return res.status(400).json({ message: 'ไม่มีรายการคืน' });
    }

    session.startTransaction();

    const borrow = await Borrow.findOne({
      _id: id,
      isDeleted: false
    })
      .populate('items.equipment')
      .session(session);

    if (!borrow) throw new Error('ไม่พบใบยืม');

    for (const r of returns) {

      const item = borrow.items.id(r.itemId);
      if (!item) throw new Error('ไม่พบรายการอุปกรณ์');

      const equipment = item.equipment;

      if (!equipment || equipment.isDeleted) {
        throw new Error('อุปกรณ์ถูกลบแล้ว');
      }

      if (equipment.type === 'consumable') continue;

      const returnQty = Number(r.returnQty || 0);
      const damagedQty = Number(r.damagedQty || 0);

      if (!Number.isFinite(returnQty) || !Number.isFinite(damagedQty)) {
        throw new Error('จำนวนคืนไม่ถูกต้อง');
      }

      if (returnQty < 0 || damagedQty < 0) {
        throw new Error('จำนวนคืนติดลบไม่ได้');
      }

      const remaining =
        item.quantity -
        (item.returnedQty || 0) -
        (item.damagedQty || 0);

      if (returnQty + damagedQty > remaining) {
        throw new Error(`คืนเกินจำนวน (${equipment.name})`);
      }

      item.returnedQty = (item.returnedQty || 0) + returnQty;
      item.damagedQty = (item.damagedQty || 0) + damagedQty;

      if (returnQty > 0) {

        const updated = await Equipment.findOneAndUpdate(
          {
            _id: equipment._id,
            isDeleted: false,
            $expr: {
              $lte: [
                { $add: ["$available", returnQty] },
                "$total"
              ]
            }
          },
          { $inc: { available: returnQty } },
          { new: true, session }
        );

        if (!updated) {
          throw new Error('คืนแล้ว stock เกิน total หรือ equipment ถูกลบ');
        }
      }

      if (damagedQty > 0) {
        await Repair.create([{
          equipment: equipment._id,
          borrow: borrow._id,
          department: borrow.department,
          damagedQty
        }], { session });
      }
    }

    const allReturned = borrow.items
      .filter(i => i.equipment.type !== 'consumable')
      .every(i =>
        i.quantity === (i.returnedQty || 0) + (i.damagedQty || 0)
      );

    if (allReturned) borrow.status = 'คืนแล้ว';

    await borrow.save({ session });

    await ActivityLog.create([{
      action: 'RETURN',
      referenceId: borrow._id,
      department: borrow.department,
      description: 'คืนอุปกรณ์',
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'คืนอุปกรณ์สำเร็จ', borrow });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};


/* ================= DELETE ================= */
exports.deleteBorrow = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {

    session.startTransaction();

    const borrow = await Borrow.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .populate('items.equipment')
      .session(session);

    if (!borrow) throw new Error('ไม่พบใบยืม');

    for (const item of borrow.items) {

      const equipment = item.equipment;
      if (!equipment || equipment.isDeleted) continue;
      if (equipment.type === 'consumable') continue;

      const borrowedQty = item.quantity;
      const returnedQty = item.returnedQty || 0;
      const damagedQty = item.damagedQty || 0;

      const stillOut = borrowedQty - returnedQty - damagedQty;

      if (stillOut > 0) {

        const updated = await Equipment.findOneAndUpdate(
          {
            _id: equipment._id,
            isDeleted: false,
            $expr: {
              $lte: [
                { $add: ["$available", stillOut] },
                "$total"
              ]
            }
          },
          { $inc: { available: stillOut } },
          { new: true, session }
        );

        if (!updated) {
          throw new Error('คืน stock ไม่สำเร็จ หรือ equipment ถูกลบ');
        }
      }
    }

    borrow.isDeleted = true;
    await borrow.save({ session });

    await ActivityLog.create([{
      action: 'DELETE_BORROW',
      referenceId: borrow._id,
      department: borrow.department,
      description: 'ลบใบยืม'
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'ลบใบยืมสำเร็จ' });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};