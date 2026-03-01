const mongoose = require('mongoose');

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
    default: 0,
    min: 0
  },

  returnNote: {      
    type: String,
    default: ''
  },

  damagedQty: {
    type: Number,
    default: 0,
    min: 0
  }
});

/* ⭐ ใส่ตรงนี้ */
borrowItemSchema.pre('save', function () {
  if (this.returnedQty + this.damagedQty > this.quantity) {
    throw new Error('returnedQty + damagedQty เกิน quantity');
  }
});

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

  note: {                    
    type: String,
    default: ''
  },

  borrowDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ยืมอยู่', 'คืนแล้ว', 'เสร็จสิ้น'],
    default: 'ยืมอยู่'
  },
  items: {
    type: [borrowItemSchema],
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Borrow', borrowSchema);