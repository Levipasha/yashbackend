const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  dueDate: {
    type: Date,
    required: true
  },
  fileName: String,
  fileUrl: String,
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetType: { type: String, enum: ['ALL', 'GROUP', 'INDIVIDUAL'], default: 'ALL' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // If targetType is GROUP
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If targetType is INDIVIDUAL (single)
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // If targetType is INDIVIDUAL (multiple selected via checkboxes)
  maxMarks: { type: Number, default: 100 },
  subject: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Assignment', assignmentSchema);
