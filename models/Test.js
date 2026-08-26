const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }], // e.g. ["10", "15", "25", "30"]
  correctOptionIndex: { type: Number, required: true }
});

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  subject: String,
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  targetType: { type: String, enum: ['ALL', 'GROUP', 'INDIVIDUAL'], default: 'ALL' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  durationMinutes: { type: Number, default: 30 },
  marksPerQuestion: { type: Number, default: 1 },
  passingScore: { type: Number, default: 50 }, // percentage
  availableDate: Date,
  closingDate: Date,
  fileUrl: String,
  fileName: String,
  questions: [questionSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Test', testSchema);

