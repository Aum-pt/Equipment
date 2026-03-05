const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema(
{
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },

  type: {
    type: String,
    enum: ['reusable', 'consumable'],
    default: 'reusable'
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  total: {
    type: Number,
    required: true,
    min: 0
  },

 available: {
  type: Number,
  required: true,
  min: 0,
  index: true,
  validate: {
    validator: function (v) {
      return v <= this.total;
    },
    message: 'available มากกว่า total ไม่ได้'
  }

  },

    low_stock_threshold: {
    type: Number,
    default: 5
  }
},
{
  timestamps: true
}
);

/* ================= PRE SAVE GUARD ================= */
/* mongoose รุ่นใหม่ → ไม่ต้องใช้ next */

equipmentSchema.pre('save', async function () {

  // ⭐ normalize (กัน user input เพี้ยน)
  if (typeof this.code === 'string') {
    this.code = this.code.trim().toUpperCase();
  }

  if (typeof this.name === 'string') {
    this.name = this.name.trim();
  }

  // ⭐ guard total
  if (!Number.isFinite(this.total) || this.total < 0) {
    throw new Error('total ไม่ถูกต้อง');
  }

  // ⭐ guard available
  if (!Number.isFinite(this.available) || this.available < 0) {
    throw new Error('available ไม่ถูกต้อง');
  }

  if (this.available > this.total) {
    throw new Error('available มากกว่า total ไม่ได้');
  }
});

equipmentSchema.index({ type: 1 });
equipmentSchema.index({ name: 1 });
equipmentSchema.index({ isDeleted: 1 });
module.exports = mongoose.model('Equipment', equipmentSchema);