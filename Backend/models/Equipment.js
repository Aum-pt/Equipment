const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
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
    validate: {
      validator: function(v) {
        // ⭐ กัน available มากกว่า total
        return v <= this.total;
      },
      message: 'available มากกว่า total ไม่ได้'
    }
  }
}, {
  timestamps: true
});


// ✅ Guard กัน corruption ตอน save()
equipmentSchema.pre('save', function(next) {

  if (!Number.isFinite(this.total) || this.total < 0) {
    return next(new Error('total ไม่ถูกต้อง'));
  }

  if (!Number.isFinite(this.available) || this.available < 0) {
    return next(new Error('available ไม่ถูกต้อง'));
  }

  if (this.available > this.total) {
    return next(new Error('available มากกว่า total ไม่ได้'));
  }

  next();
});


module.exports = mongoose.model('Equipment', equipmentSchema);
