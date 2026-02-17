const mongoose = require('mongoose');

// สร้าง schema สำหรับการซ่อมอุปกรณ์
const repairSchema = new mongoose.Schema({
  equipment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Equipment', 
    required: true 
  },

  borrow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrow'
  },

  department: {
    type: String,
    required: true
  },

  damagedQty: { 
    type: Number, 
    required: true 
  },

  reportDate: { 
    type: Date, 
    default: Date.now 
  },

  status: { 
    type: String,
    enum: ['กำลังซ่อม', 'ซ่อมเสร็จ'],
    default: 'กำลังซ่อม'
  }


});
repairSchema.index({ status: 1 });

module.exports = mongoose.model('Repair', repairSchema);
