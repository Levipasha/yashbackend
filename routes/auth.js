const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

// This endpoint is called by the frontend after a successful Firebase login
router.post('/login', async (req, res) => {
  try {
    const { email, role, firebaseUid, fullName } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const userRole = role || 'student';
    
    // Find or create the user
    let user = await User.findOne({ email, role: userRole });
    if (!user) {
      user = await User.findOne({ email });
    }
    
    if (!user) {
      let uidToUse = firebaseUid || `temp-${Date.now()}`;
      const existingUidUser = await User.findOne({ firebaseUid: uidToUse });
      if (existingUidUser) {
        uidToUse = `${uidToUse}-${userRole}-${Date.now()}`;
      }
      user = new User({
        email,
        role: userRole,
        firebaseUid: uidToUse,
        fullName: fullName || email.split('@')[0],
      });
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

module.exports = router;
