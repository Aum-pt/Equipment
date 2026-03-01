const Equipment = require('../models/Equipment');
const Borrow = require('../models/Borrow');
const Repair = require('../models/Repair');

const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK || 5);

 // ปรับได้

exports.getDashboardStats = async (req, res) => {
  try {

    /** ✅ อุปกรณ์ทั้งหมด */
    const totalEquipment = await Equipment.countDocuments();

    /** ✅ ใกล้หมด */
    const lowStockCount = await Equipment.countDocuments({
      type: 'consumable',
      available: { $gt: 0, $lte: LOW_STOCK_THRESHOLD }
    });


    const outOfStockCount = await Equipment.countDocuments({
      available: 0
    });

    const equipments = await Equipment.find();

    const lowStock = equipments.filter(e => {
      const threshold = e.low_stock_threshold || 5;
      return (
        e.type === 'reusable' &&
        e.available > 0 &&
        e.available <= threshold
      );
    });


    const outOfStock = await Equipment.find({
      available: 0
    });


    /** ✅ ใช้งานเยอะที่สุด */
    const mostUsed = await Borrow.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.equipment",
          totalUsed: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalUsed: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "equipment",
          localField: "_id",
          foreignField: "_id",
          as: "equipment"
        }
      },
      { $unwind: "$equipment" }
    ]);

    /** ✅ ซ่อมบ่อยที่สุด */
    const mostRepaired = await Repair.aggregate([
      {
        $group: {
          _id: "$equipment",
          totalRepair: { $sum: "$damagedQty" }
        }
      },
      { $sort: { totalRepair: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "equipment",
          localField: "_id",
          foreignField: "_id",
          as: "equipment"
        }
      },
      { $unwind: "$equipment" }
    ]);

    res.json({
    totalEquipment,
    lowStockCount,
    outOfStockCount,
    lowStock,
    outOfStock,
    mostUsed,
    mostRepaired
  });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
