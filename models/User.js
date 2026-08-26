const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'parent', 'teacher', 'admin'],
    default: 'student'
  },
  studentId: String,
  profilePicUrl: {
    type: String,
    default: ''
  },
  teacherRemarks: {
    type: String,
    default: ''
  },
  age: String,
  dob: String,
  
  // Parent ↔ Student relationship
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Tutor ↔ Student relationship
  assignedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Link student directly back to parent (optional but useful for quick queries)
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gender: String,
  phone: String,
  attendance: {
    type: String,
    default: '94%'
  },
  attendanceStatus: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Excused', 'Not Marked'],
    default: 'Not Marked'
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid', 'Active', 'Inactive'],
    default: 'Unpaid'
  },
  termFee: {
    type: String,
    default: '₹2,000'
  },
  reportCardUrl: String,
  reportCardName: String,
  teacherMessage: String,
  studentMessage: String,
  courseName: String,
  maxMarks: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      Mathematics: 100,
      Physics: 100,
      Chemistry: 100,
      Biology: 100,
      English: 100
    }
  },
  marksObtained: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      Mathematics: 0,
      Physics: 0,
      Chemistry: 0,
      Biology: 0,
      English: 0
    }
  },
  performanceScores: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      Mathematics: 0,
      Physics: 0,
      Chemistry: 0,
      Biology: 0,
      English: 0
    }
  },
  checklist: {
    type: mongoose.Schema.Types.Mixed,
    default: [
      { id: 'profile', text: 'Enrollment & Profile Completed', completed: true },
      { id: 'fees', text: 'Fee Payment Verified', completed: true },
      { id: 'documents', text: 'Identity & Report Card Uploaded', completed: false },
      { id: 'attendance', text: 'Attendance Marked', completed: false },
      { id: 'homework', text: 'Homework & Assignments Assigned', completed: false },
      { id: 'parent', text: 'Parent Account Linked', completed: false }
    ]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Allow same email for different roles (e.g. one student and one parent account per email)
userSchema.index({ email: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
