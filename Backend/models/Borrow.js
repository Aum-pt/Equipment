const mongoose = require('mongoose');

// รายการอุปกรณ์ในใบยืม
const borrowItemSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  returnedQty: {
    type: Number,
    default: 0
  },
  damagedQty: {
    type: Number,
    default: 0
  }
});

// ใบยืม (Borrow Transaction)
const borrowSchema = new mongoose.Schema({
  department: {
    type: String,
    enum: ['กองงาน1', 'กองงาน2', 'กองงาน3'],
    required: true
  },
  purpose: {
    type: String,
    enum: ['ติดตั้ง', 'ซ่อมบำรุง'],
    required: true
  },
  borrowDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ยืมอยู่', 'คืนแล้ว'],
    default: 'ยืมอยู่'
  },
  items: {
    type: [borrowItemSchema],
    required: true
  }
});

borrowSchema.index({ status: 1 });
module.exports = mongoose.model('Borrow', borrowSchema);
