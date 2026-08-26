require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yashedu';

const mockCourses = [
  {
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    title: "Advanced React & Next.js Masterclass",
    instructor: "Sarah Jenkins",
    rating: 4.9,
    duration: "32 Hours",
    students: "12.5k",
    price: 89
  },
  {
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    title: "Complete Python Bootcamp: Go from Zero to Hero",
    instructor: "Dr. Angela Yu",
    rating: 4.8,
    duration: "45 Hours",
    students: "89k",
    price: 129
  },
  {
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    title: "Machine Learning A-Z: Hands-On Python",
    instructor: "Kirill Eremenko",
    rating: 4.7,
    duration: "42 Hours",
    students: "45k",
    price: 95
  },
  {
    image: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    title: "UI/UX Design Masterclass 2024",
    instructor: "Gary Simon",
    rating: 4.9,
    duration: "28 Hours",
    students: "21k",
    price: 79
  },
  {
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    title: "Cybersecurity for Beginners",
    instructor: "David Thompson",
    rating: 4.8,
    duration: "20 Hours",
    students: "15k",
    price: 69
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    title: "Digital Marketing Masterclass",
    instructor: "Emma Watson",
    rating: 4.6,
    duration: "35 Hours",
    students: "32k",
    price: 85
  },
  {
    image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    title: "iOS App Development with Swift",
    instructor: "Marcus Lee",
    rating: 4.9,
    duration: "50 Hours",
    students: "18k",
    price: 149
  },
  {
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    title: "Data Science and Analytics",
    instructor: "Dr. Robert Chen",
    rating: 4.7,
    duration: "60 Hours",
    students: "25k",
    price: 110
  }
];

const seedDB = async () => {
  try {
    console.log('Connecting to MongoDB at', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await Course.deleteMany({});
    console.log('Existing courses removed.');

    // Insert new data
    await Course.insertMany(mockCourses);
    console.log('Courses seeded successfully!');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
  }
};

seedDB();
