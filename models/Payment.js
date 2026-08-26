const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  feeCycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeCycle' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'PAID', 'OVERDUE', 'FAILED'], default: 'PENDING' },
  paymentMethod: { type: String, enum: ['ONLINE', 'CASH', 'NONE'], default: 'NONE' },
  dueDate: { type: Date, required: true },
  paymentDate: { type: Date },
  transactionId: { type: String }, // From payment gateway
  cashConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Tutor who confirmed
  isOnlinePaid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
