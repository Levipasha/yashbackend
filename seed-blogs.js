require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('./models/Blog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yashedu';

const mockBlogs = [
  {
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "Study Tips",
    title: "How to Maximize Your Learning Potential in 2024",
    excerpt: "Discover science-backed techniques to improve your memory, focus, and overall learning efficiency. Learn how to study smarter, not harder.",
    author: "Dr. Emily Chen",
    date: "Oct 12, 2024"
  },
  {
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "Technology",
    title: "The Future of AI in Education",
    excerpt: "Artificial Intelligence is reshaping how we learn. Explore how personalized AI tutors and adaptive learning platforms are changing the educational landscape.",
    author: "Mark Stevenson",
    date: "Oct 08, 2024"
  },
  {
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "Career Advice",
    title: "Top 5 Tech Skills Employers Are Looking For",
    excerpt: "Stay ahead of the curve. Here are the top 5 technical skills you should focus on acquiring to boost your employability in the modern tech industry.",
    author: "Sarah Jenkins",
    date: "Oct 01, 2024"
  },
  {
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "News",
    title: "YashEdu Platform Update: New Interactive Classrooms",
    excerpt: "We've completely revamped our live classroom experience. See what's new in the latest platform update including whiteboards, breakout rooms, and more.",
    author: "Product Team",
    date: "Sep 28, 2024"
  },
  {
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "Success Stories",
    title: "From Zero to Full Stack Developer in 6 Months",
    excerpt: "Read inspiring stories from our alumni who successfully transitioned into tech careers using our comprehensive bootcamps.",
    author: "Alex Johnson",
    date: "Sep 15, 2024"
  },
  {
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "Study Tips",
    title: "Managing Stress During Exam Season",
    excerpt: "Exams can be overwhelming. Learn effective strategies for managing stress, getting enough sleep, and performing your best when it counts.",
    author: "Dr. Emily Chen",
    date: "Sep 10, 2024"
  }
];

const seedBlogs = async () => {
  try {
    console.log('Connecting to MongoDB at', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding blogs...');

    // Clear existing data
    await Blog.deleteMany({});
    console.log('Existing blogs removed.');

    // Insert new data
    await Blog.insertMany(mockBlogs);
    console.log('Blogs seeded successfully!');

  } catch (error) {
    console.error('Error seeding blogs:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedBlogs();
