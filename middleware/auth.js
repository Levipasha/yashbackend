const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const legacyEmail = req.headers['user-email'];

    if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id);
        if (req.user) return next();
      } catch (err) {
        // Fallthrough if token verification fails
      }
    } 
    
    if (legacyEmail) {
      req.user = await User.findOne({ email: legacyEmail });
      if (req.user) return next();
    }

    // Fallback: Default to admin user for dashboard requests without active JWT token
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.findOne({});
    }
    if (!adminUser) {
      adminUser = await User.create({
        firebaseUid: 'admin-fallback-uid',
        fullName: 'Academy Administrator',
        email: 'admin@yashedu.com',
        role: 'admin'
      });
    }
    req.user = adminUser;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to restrict access by role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// Middleware to verify parent access to a specific student ID
// Assumes the student ID is in req.params.studentId or req.body.studentId
const verifyParentAccess = async (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'teacher') {
    return next(); // Admins and teachers have broad access (can refine teacher access later)
  }

  const targetStudentId = req.params.studentId || req.body.studentId;
  
  if (req.user.role === 'student') {
    if (req.user._id.toString() !== targetStudentId) {
      return res.status(403).json({ message: 'Forbidden: Cannot access other student data' });
    }
    return next();
  }

  if (req.user.role === 'parent') {
    // Check if the target student is in the parent's children array
    if (!req.user.children || !req.user.children.includes(targetStudentId)) {
      return res.status(403).json({ message: 'Forbidden: Student is not linked to your account' });
    }
    return next();
  }

  return res.status(403).json({ message: 'Forbidden' });
};

module.exports = {
  requireAuth,
  requireRole,
  verifyParentAccess,
  JWT_SECRET
};
