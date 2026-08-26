const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get all assignments (Admin/Global)
router.get('/', async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
});

// Create assignment
router.post('/', async (req, res) => {
  try {
    const { title, description, dueDate, fileUrl, fileName, tutorId, targetType, groupId, studentId, studentIds, subject } = req.body;
    
    let finalTutorId = tutorId;
    if (!finalTutorId) {
      const adminUser = await Assignment.db.model('User').findOne({ role: { $in: ['admin', 'teacher'] } });
      if (adminUser) {
        finalTutorId = adminUser._id;
      }
    }

    const assignment = new Assignment({
      title,
      description,
      dueDate,
      fileUrl,
      fileName,
      tutorId: finalTutorId,
      targetType: targetType || 'ALL',
      groupId,
      studentId: (studentIds && studentIds.length > 0) ? studentIds[0] : studentId,
      studentIds: studentIds || (studentId ? [studentId] : []),
      subject
    });

    await assignment.save();
    console.log('Successfully created assignment:', assignment);
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Error creating assignment', error: error.message });
  }
});

// Delete assignment
router.delete('/:id', async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting assignment' });
  }
});

// Get assignments for a student (based on targeting)
router.get('/student', async (req, res) => {
  try {
    const studentId = req.query.studentId || (req.user ? req.user._id : null);
    const filter = studentId
      ? { $or: [{ targetType: 'ALL' }, { targetType: 'INDIVIDUAL', studentId }, { targetType: 'INDIVIDUAL', studentIds: studentId }] }
      : { targetType: 'ALL' };
      
    const assignments = await Assignment.find(filter).sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student assignments' });
  }
});

// Get ALL student submissions for Admin/Teacher panel
router.get('/submissions/all', async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate('assignmentId')
      .populate('studentId', 'fullName email studentId')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching all submissions:', error);
    res.status(500).json({ message: 'Error fetching all submissions' });
  }
});

// Get submissions for a student
router.get('/submissions/student/:studentId', async (req, res) => {
  try {
    let studentId = req.params.studentId;
    if (studentId && studentId.includes('@')) {
      const u = await Assignment.db.model('User').findOne({ email: studentId });
      if (u) studentId = u._id;
    }
    const submissions = await Submission.find({ studentId }).populate('assignmentId');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

// Submit assignment photo / file (Student - Max 6 photos)
router.post('/:id/submit', async (req, res) => {
  try {
    const { studentId, textAnswer, fileUrl, fileName, photos } = req.body;
    let targetStudent = req.user;

    const rawId = studentId || req.headers['user-email'];
    if (!targetStudent && rawId) {
      if (rawId.includes('@')) {
        targetStudent = await Assignment.db.model('User').findOne({ email: rawId });
      } else if (rawId !== 'guest_student') {
        targetStudent = await Assignment.db.model('User').findById(rawId).catch(() => null);
      }
    }

    if (!targetStudent) {
      targetStudent = await Assignment.db.model('User').findOne({ role: 'student' });
    }

    if (!targetStudent) {
      return res.status(400).json({ message: 'Student user not found' });
    }

    const finalStudentId = targetStudent._id;

    let submission = await Submission.findOne({ assignmentId: req.params.id, studentId: finalStudentId });
    
    if (!submission) {
      const initialPhotos = (photos && Array.isArray(photos)) 
        ? photos.map(p => ({ fileUrl: p.fileUrl, fileName: p.fileName })).slice(0, 6) 
        : (fileUrl ? [{ fileUrl, fileName }] : []);
      submission = new Submission({
        assignmentId: req.params.id,
        studentId: finalStudentId,
        textAnswer,
        fileUrl: initialPhotos[0]?.fileUrl || fileUrl || '',
        fileName: initialPhotos[0]?.fileName || fileName || '',
        photos: initialPhotos,
        status: 'SUBMITTED'
      });
    } else {
      let updatedPhotos = [];
      if (photos && Array.isArray(photos)) {
        updatedPhotos = photos.map(p => ({ fileUrl: p.fileUrl, fileName: p.fileName })).slice(0, 6);
      } else if (fileUrl) {
        let existing = Array.isArray(submission.photos) ? submission.photos.map(p => ({ fileUrl: p.fileUrl, fileName: p.fileName })) : [];
        if (submission.fileUrl && existing.length === 0) {
          existing.push({ fileUrl: submission.fileUrl, fileName: submission.fileName });
        }
        if (!existing.some(p => p.fileUrl === fileUrl)) {
          existing.push({ fileUrl, fileName });
        }
        updatedPhotos = existing.slice(0, 6);
      } else {
        updatedPhotos = (submission.photos || []).map(p => ({ fileUrl: p.fileUrl, fileName: p.fileName }));
      }

      submission.photos = updatedPhotos;
      submission.markModified('photos');
      if (updatedPhotos.length > 0) {
        submission.fileUrl = updatedPhotos[0].fileUrl;
        submission.fileName = updatedPhotos[0].fileName;
      }
      submission.status = 'SUBMITTED';
      submission.submittedAt = Date.now();
    }

    await submission.save();

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('assignmentId')
      .populate('studentId', 'fullName email studentId');

    const io = req.app.get('io');
    if (io) {
      io.emit('newSubmission', populatedSubmission);
    }

    console.log('Assignment submission saved & broadcasted:', populatedSubmission);
    res.status(201).json(populatedSubmission);
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ message: 'Error submitting assignment', error: error.message });
  }
});

// Remove single photo from student submission
router.post('/:id/delete-photo', async (req, res) => {
  try {
    const { studentId, photoUrl } = req.body;
    let targetStudent = req.user;
    if (!targetStudent && studentId) {
      if (studentId.includes('@')) {
        targetStudent = await Assignment.db.model('User').findOne({ email: studentId });
      } else if (studentId !== 'guest_student') {
        targetStudent = await Assignment.db.model('User').findById(studentId).catch(() => null);
      }
    }
    if (!targetStudent) targetStudent = await Assignment.db.model('User').findOne({ role: 'student' });
    if (!targetStudent) return res.status(400).json({ message: 'Student user not found' });

    const submission = await Submission.findOne({ assignmentId: req.params.id, studentId: targetStudent._id });
    if (submission) {
      submission.photos = (submission.photos || []).filter(p => p.fileUrl !== photoUrl);
      if (submission.photos.length > 0) {
        submission.fileUrl = submission.photos[0].fileUrl;
        submission.fileName = submission.photos[0].fileName;
      } else {
        submission.fileUrl = '';
        submission.fileName = '';
      }
      await submission.save();
      return res.json(submission);
    }
    res.status(404).json({ message: 'Submission not found' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting photo' });
  }
});

// Grade submission (Tutor)
router.post('/submissions/:submissionId/grade', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { marks, feedback } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.submissionId,
      { marks, feedback, status: 'REVIEWED', reviewedAt: Date.now() },
      { new: true }
    );
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error grading submission' });
  }
});

module.exports = router;
