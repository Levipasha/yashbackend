const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to resolve Student User object
async function resolveStudent(sId) {
  if (!sId) return null;
  if (mongoose.Types.ObjectId.isValid(sId)) {
    const user = await User.findById(sId);
    if (user) return user;
  }
  const user = await User.findOne({
    $or: [{ email: sId }, { studentId: sId }]
  });
  return user;
}

// Helper to resolve Test object with full questions array
async function resolveTest(tId) {
  if (!tId) return null;
  if (typeof tId === 'object' && Array.isArray(tId.questions) && tId.questions.length > 0) {
    return tId;
  }
  const targetId = (typeof tId === 'object' && tId._id) ? tId._id : tId;
  if (mongoose.Types.ObjectId.isValid(targetId)) {
    const test = await Test.findById(targetId).lean();
    if (test) return test;
  }
  if (typeof targetId === 'string') {
    const test = await Test.findById(targetId).lean();
    if (test) return test;
  }
  return typeof tId === 'object' ? tId : null;
}

// Get all tests (Admin / All)
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tests' });
  }
});

// Create a new test (Admin/Tutor)
router.post('/', async (req, res) => {
  try {
    const testData = { ...req.body };
    if (!testData.tutorId && req.user?._id) {
      testData.tutorId = req.user._id;
    }
    const test = new Test(testData);
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ message: 'Error creating test', error: error.message });
  }
});

// Get all tests available for a student
router.get('/student', async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tests' });
  }
});

// Get all test attempts across all students (Admin overview)
router.get('/results', async (req, res) => {
  try {
    const rawAttempts = await TestAttempt.find().sort({ submittedAt: -1 }).lean();
    console.log(`[GET /api/tests/results] Found ${rawAttempts.length} raw attempts in database.`);

    const enrichedAttempts = await Promise.all(rawAttempts.map(async (att) => {
      const testDoc = await resolveTest(att.testId);
      const studentDoc = await resolveStudent(att.studentId);

      return {
        ...att,
        testId: testDoc || { title: 'Practice Test', subject: 'General', questions: [] },
        studentId: studentDoc ? {
          _id: studentDoc._id,
          fullName: studentDoc.fullName,
          email: studentDoc.email,
          studentId: studentDoc.studentId
        } : {
          fullName: String(att.studentId || 'Student'),
          email: 'N/A'
        }
      };
    }));

    res.json(enrichedAttempts);
  } catch (error) {
    console.error('Error fetching all test attempts:', error);
    res.status(500).json({ message: 'Error fetching test attempts', error: error.message });
  }
});

// Get test results for a student (accessible by student, parent, tutor)
router.get('/results/student/:studentId', async (req, res) => {
  try {
    const sId = req.params.studentId;
    const studentUser = await resolveStudent(sId);
    const targetIds = studentUser 
      ? [studentUser._id, studentUser._id.toString(), sId, studentUser.email, studentUser.studentId].filter(Boolean)
      : [sId];

    const rawAttempts = await TestAttempt.find({ 
      $or: [
        { studentId: { $in: targetIds } },
        { studentId: sId }
      ]
    }).sort({ submittedAt: -1 }).lean();

    const enrichedResults = await Promise.all(rawAttempts.map(async (att) => {
      const testDoc = await resolveTest(att.testId);
      return {
        ...att,
        testId: testDoc || { title: 'Practice Test', subject: 'General', questions: [] }
      };
    }));

    res.json(enrichedResults);
  } catch (error) {
    console.error('Error fetching student test results:', error);
    res.status(500).json({ message: 'Error fetching results' });
  }
});

// Get test attempts for a specific test ID (Admin)
router.get('/:testId/results', async (req, res) => {
  try {
    const testId = req.params.testId;
    const rawAttempts = await TestAttempt.find({ 
      $or: [
        { testId: testId },
        { testId: mongoose.Types.ObjectId.isValid(testId) ? new mongoose.Types.ObjectId(testId) : testId }
      ]
    }).sort({ submittedAt: -1 }).lean();

    const enriched = await Promise.all(rawAttempts.map(async (att) => {
      const studentDoc = await resolveStudent(att.studentId);
      const testDoc = await resolveTest(att.testId);

      return {
        ...att,
        testId: testDoc || { title: 'Practice Test', subject: 'General', questions: [] },
        studentId: studentDoc ? {
          _id: studentDoc._id,
          fullName: studentDoc.fullName,
          email: studentDoc.email,
          studentId: studentDoc.studentId
        } : {
          fullName: String(att.studentId || 'Student'),
          email: 'N/A'
        }
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching test attempts for test:', error);
    res.status(500).json({ message: 'Error fetching test attempts' });
  }
});

// Delete a test by ID
router.delete('/:id', async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting test' });
  }
});

// Submit a test attempt
router.post('/:testId/submit', async (req, res) => {
  try {
    const { answers, studentId } = req.body;
    const testId = req.params.testId;
    const sId = studentId || req.user?._id;

    if (!sId) {
      return res.status(400).json({ message: 'Student ID required for test submission' });
    }

    const studentUser = await resolveStudent(sId);
    const targetStudentId = studentUser ? studentUser._id : sId;
    
    // Prevent multiple submissions
    const existingAttempt = await TestAttempt.findOne({ 
      $or: [
        { testId: testId, studentId: targetStudentId },
        { testId: testId, studentId: sId }
      ]
    });
    if (existingAttempt) {
      return res.status(400).json({ message: 'You have already submitted this test.' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    let correctCount = 0;
    
    // Grade answers
    (answers || []).forEach(ans => {
      const question = test.questions[ans.questionIndex];
      if (question && question.correctOptionIndex === ans.selectedOptionIndex) {
        correctCount++;
      }
    });

    const totalQuestions = test.questions.length || 1;
    const marksPerQ = test.marksPerQuestion || 1;
    const score = correctCount * marksPerQ;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    const attempt = new TestAttempt({
      testId: test._id,
      studentId: targetStudentId,
      answers,
      score,
      percentage,
      correctCount,
      wrongCount: Math.max(0, totalQuestions - correctCount)
    });

    await attempt.save();
    console.log(`[POST /api/tests/${testId}/submit] Saved attempt for ${studentUser?.fullName || sId}: Score ${score}/${totalQuestions * marksPerQ}`);
    res.status(201).json(attempt);
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ message: 'Error submitting test', error: error.message });
  }
});

module.exports = router;
