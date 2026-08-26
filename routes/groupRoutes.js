const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const { requireAuth, requireRole } = require('../middleware/auth');

// Create group
router.post('/', async (req, res) => {
  try {
    const { name, description, members, tutorId } = req.body;
    const group = new Group({
      name,
      description,
      tutorId: tutorId || (req.user ? req.user._id : '60c72b2f9b1d8b001c8e4a99'),
      members: members || []
    });
    await group.save();
    const populated = await Group.findById(group._id).populate('members', 'fullName email studentId role');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Error creating group' });
  }
});

// Get all groups
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find().populate('members', 'fullName email studentId role').sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// Get tutor's groups
router.get('/tutor', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const groups = await Group.find({ tutorId: req.user._id }).populate('members', 'fullName email studentId role');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// Get student's groups
router.get('/student/:studentId', async (req, res) => {
  try {
    const groups = await Group.find({ members: req.params.studentId }).populate('members', 'fullName email studentId role');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student groups' });
  }
});

module.exports = router;
