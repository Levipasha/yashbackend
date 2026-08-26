const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  textAnswer: String,
  fileUrl: String,
  fileName: String,
  photos: [{
    fileUrl: String,
    fileName: String
  }],
  status: { type: String, enum: ['SUBMITTED', 'LATE', 'REVIEWED'], default: 'SUBMITTED' },
  marks: Number,
  feedback: String,
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date
});

module.exports = mongoose.model('Submission', submissionSchema);
