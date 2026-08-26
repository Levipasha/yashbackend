const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['FEE', 'PAYMENT', 'ASSIGNMENT', 'TEST', 'MESSAGE', 'GENERAL'], default: 'GENERAL' },
  isRead: { type: Boolean, default: false },
  link: String, // Optional URL to navigate to when clicked
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
