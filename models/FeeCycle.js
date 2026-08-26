const mongoose = require('mongoose');

const feeCycleSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  feeAmount: { type: Number, required: true },
  feeType: { type: String, default: 'Tuition' },
  cycleDays: { type: Number, required: true }, // e.g. 30 for monthly, 7 for weekly
  startDate: { type: Date, default: Date.now },
  nextDueDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FeeCycle', feeCycleSchema);
