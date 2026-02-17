const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'BORROW',
      'RETURN',
      'REPAIR_COMPLETE',
      'ADD_EQUIPMENT',
      'UPDATE_EQUIPMENT',
      'DELETE_EQUIPMENT'
    ],
    required: true
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },

  description: {
    type: String
  },

  department: {
    type: String
  },

  equipmentName: {
    type: String
  },

  equipmentCode: {
    type: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
