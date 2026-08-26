const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { requireAuth } = require('../middleware/auth');

const mongoose = require('mongoose');
const User = require('../models/User');

// Get private chat history between two specific users
router.get('/between/:user1Id/:user2Id', async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;

    const u1 = await User.findOne({ $or: [{ _id: mongoose.isValidObjectId(user1Id) ? user1Id : null }, { email: user1Id }] }).catch(() => null);
    const u2 = await User.findOne({ $or: [{ _id: mongoose.isValidObjectId(user2Id) ? user2Id : null }, { email: user2Id }] }).catch(() => null);

    const ids1 = new Set([user1Id, '60c72b2f9b1d8b001c8e4a99', 'admin']);
    if (u1) {
      ids1.add(u1._id.toString());
      if (u1.email) ids1.add(u1.email);
    }

    const ids2 = new Set([user2Id]);
    if (u2) {
      ids2.add(u2._id.toString());
      if (u2.email) ids2.add(u2.email);
    }

    const array1 = Array.from(ids1);
    const array2 = Array.from(ids2);

    const messages = await Message.find({
      $or: [
        { senderId: { $in: array1 }, receiverId: { $in: array2 } },
        { senderId: { $in: array2 }, receiverId: { $in: array1 } }
      ],
      groupId: null
    }).sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Error fetching chat history' });
  }
});

// Get private chat history between authenticated user and another user
router.get('/private/:otherUserId', requireAuth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: req.params.otherUserId },
        { senderId: req.params.otherUserId, receiverId: req.user._id }
      ],
      groupId: null
    }).sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat history' });
  }
});

// Get group chat history
router.get('/group/:groupId', async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.groupId })
      .populate('senderId', 'fullName role email')
      .sort({ createdAt: 1 });
      
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching group history' });
  }
});

// Send a message (private or group)
router.post('/send', async (req, res) => {
  try {
    const { senderId, receiverId, groupId, content } = req.body;
    if (!senderId || !content) {
      return res.status(400).json({ message: 'Sender ID and content are required' });
    }

    const newMessage = new Message({
      senderId,
      receiverId: receiverId || null,
      groupId: groupId || null,
      content,
      createdAt: new Date()
    });

    await newMessage.save();

    const io = req.app.get('io');
    if (io) {
      if (receiverId) {
        io.to(receiverId.toString()).emit('receiveMessage', newMessage);
        io.to(senderId.toString()).emit('receiveMessage', newMessage);
      } else if (groupId) {
        io.to(groupId.toString()).emit('receiveMessage', newMessage);
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

module.exports = router;
