const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  instructor: {
    type: String,
    default: 'YashEdu Instructor',
  },
  rating: {
    type: Number,
    default: 5,
  },
  location: {
    type: String,
    default: '',
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  students: {
    type: String,
    default: '100+ Students',
  },
  price: {
    type: Number,
    default: 0,
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  videoUrl: {
    type: String,
    default: '',
  },
  overview: {
    type: String,
    default: '',
  },
  whatYouWillLearn: {
    type: String,
    default: '',
  },
  target: {
    type: String,
    default: '',
  },
  duration: {
    type: String,
    default: '',
  },
  materials: {
    type: String,
    default: 'Notes & Practice Sets',
  },
  certificate: {
    type: String,
    default: 'Certified Track',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Course', courseSchema);
