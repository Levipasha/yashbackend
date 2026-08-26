const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get all children for a specific parent
router.get('/:parentId/children', async (req, res) => {
  try {
    const { parentId } = req.params;
    if (!parentId || parentId === 'undefined' || parentId === 'null' || parentId === 'invalid') {
      return res.json([]);
    }

    let parent = null;

    if (parentId.match(/^[0-9a-fA-F]{24}$/)) {
      parent = await User.findById(parentId).populate('children');
    } else {
      parent = await User.findOne({ email: parentId, role: 'parent' }).populate('children');
    }

    if (!parent) return res.json([]);

    let childrenList = parent.children ? [...parent.children] : [];

    // Also check if parent has a direct studentId string field (legacy/admin link)
    if (parent.studentId) {
      const studentByCode = await User.findOne({ studentId: parent.studentId, role: 'student' });
      if (studentByCode) {
        const exists = childrenList.some(c => c._id.toString() === studentByCode._id.toString());
        if (!exists) {
          childrenList.push(studentByCode);
        }
      }
    }

    res.json(childrenList);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ message: 'Error fetching children' });
  }
});

// Admin links a student to a parent
router.post('/:parentId/children', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { studentId } = req.body;
    
    const parent = await User.findById(req.params.parentId);
    if (!parent) return res.status(404).json({ message: 'Parent not found' });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (!parent.children.includes(studentId)) {
      parent.children.push(studentId);
      await parent.save();
    }
    
    // Also link back
    student.parentId = parent._id;
    await student.save();

    res.json({ message: 'Student linked to parent successfully', parent });
  } catch (error) {
    res.status(500).json({ message: 'Error linking student' });
  }
});

module.exports = router;
