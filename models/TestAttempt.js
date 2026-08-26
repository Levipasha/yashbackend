const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.Mixed, ref: 'Test', required: true },
  studentId: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true },
  answers: [{ 
    questionIndex: Number,
    selectedOptionIndex: Number
  }],
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  wrongCount: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
