const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.Mixed, required: true },
  receiverId: { type: mongoose.Schema.Types.Mixed }, // Null if group chat
  groupId: { type: mongoose.Schema.Types.Mixed }, // Null if private chat
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
