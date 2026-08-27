require('dotenv').config();
const mongoose = require('mongoose');

const Course = require('./models/Course');
const Blog = require('./models/Blog');
const Subject = require('./models/Subject');
const About = require('./models/About');
const HomeLearningSection = require('./models/HomeLearningSection');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI || MONGO_URI.includes('<db_username>')) {
  console.error('ERROR: MONGO_URI is missing or contains placeholder <db_username>. Please update your backend/.env file with your valid MongoDB connection string.');
  process.exit(1);
}

const mockSubjects = [
  { name: 'Mathematics' },
  { name: 'Science' },
  { name: 'English' },
  { name: 'Social Studies' },
  { name: 'Computer Science' }
];

const mockCourses = [
  {
    title: 'Complete Mathematics & Calculus Mastery',
    instructor: 'Prof. Rajesh Sharma',
    rating: 4.9,
    location: 'YashEdu Main Campus & Online',
    duration: '6 Months',
    students: '1,240 Students',
    price: 4999,
    subject: 'Mathematics',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    title: 'Advanced Physics: Mechanics & Electromagnetism',
    instructor: 'Dr. Anita Verma',
    rating: 4.8,
    location: 'YashEdu Science Lab',
    duration: '4 Months',
    students: '980 Students',
    price: 5499,
    subject: 'Science',
    image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    title: 'Organic & Inorganic Chemistry Foundation',
    instructor: 'Dr. Suresh Kumar',
    rating: 4.9,
    location: 'Online Live Interactive',
    duration: '5 Months',
    students: '1,150 Students',
    price: 4799,
    subject: 'Science',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    title: 'English Communication & Literature Excellence',
    instructor: 'Ms. Priya Menon',
    rating: 4.7,
    location: 'YashEdu Language Wing',
    duration: '3 Months',
    students: '820 Students',
    price: 3499,
    subject: 'English',
    image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    title: 'Cell Biology & Human Anatomy Deep Dive',
    instructor: 'Dr. Meenakshi Sundaram',
    rating: 4.9,
    location: 'YashEdu Medical Prep Wing',
    duration: '6 Months',
    students: '1,420 Students',
    price: 5999,
    subject: 'Science',
    image: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    title: 'Competitive Mathematics & Olympiad Problem Solving',
    instructor: 'Prof. Rajesh Sharma',
    rating: 5.0,
    location: 'Online Live & Recorded',
    duration: '4 Months',
    students: '670 Students',
    price: 4299,
    subject: 'Mathematics',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  }
];

const mockBlogs = [
  {
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80",
    category: "Study Tips",
    title: "10 Proven Effective Strategies for Excelling in Competitive Exams",
    excerpt: "Master time management, structured revision, and effective test-taking strategies to boost your score in board and entrance examinations.",
    author: "Prof. Rajesh Sharma",
    date: "24 Aug 2026"
  },
  {
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80",
    category: "Technology",
    title: "The Future of AI in Modern Education and STEM Learning",
    excerpt: "Discover how AI tools and interactive digital platforms are transforming how students master complex science and mathematics concepts.",
    author: "Dr. Anita Verma",
    date: "18 Aug 2026"
  },
  {
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
    category: "Career Advice",
    title: "Choosing the Right Engineering or Medical Career Path After 12th",
    excerpt: "A complete step-by-step roadmap for parents and high school students to explore academic options, entrance exams, and career prospects.",
    author: "Ms. Priya Menon",
    date: "12 Aug 2026"
  },
  {
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80",
    category: "Success Stories",
    title: "YashEdu Achievers: Celebrating Top Scorers in State Examinations",
    excerpt: "Highlighting our student success stories and how dedicated mentorship helped them achieve top ranks in state & national examinations.",
    author: "Academy Team",
    date: "05 Aug 2026"
  }
];

const seedAll = async () => {
  try {
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    // Seed Subjects
    await Subject.deleteMany({});
    await Subject.insertMany(mockSubjects);
    console.log('✅ Subjects seeded successfully.');

    // Seed Courses
    await Course.deleteMany({});
    await Course.insertMany(mockCourses);
    console.log('✅ Courses seeded successfully.');

    // Seed Blogs
    await Blog.deleteMany({});
    await Blog.insertMany(mockBlogs);
    console.log('✅ Blogs seeded successfully.');

    // Seed About Info
    await About.deleteMany({});
    await About.create({
      heroTitle: 'About Yash Educational Institute',
      heroDescription: 'At Yash Educational Institute, we believe every student has the potential to achieve greatness. We are committed to providing quality education, expert guidance, and a nurturing environment that inspires confidence, curiosity, and character.',
      storyTitle: 'Our Story',
      storyP1: 'Founded with the vision of making quality education accessible and effective for all, Yash Educational Institute has grown into a trusted learning partner for thousands of students.',
      storyP2: 'From a small beginning, we have built a strong academic community driven by passion, dedication, and a student-first approach.',
      whyChooseUs: [
        { title: 'Experienced Faculty', description: 'Learn from highly qualified educators with proven track records.' },
        { title: 'Personalized Attention', description: 'Small batch sizes to focus on every student’s individual growth.' },
        { title: 'Interactive Learning', description: 'Engaging live sessions, practical examples, and regular assessments.' }
      ]
    });
    console.log('✅ About Us content seeded successfully.');

    // Seed Home Learning Section
    await HomeLearningSection.deleteMany({});
    await HomeLearningSection.create({
      dialogText: 'Every lesson makes you stronger, every practice makes you better, and every step moves you closer to success.',
      dialogSecondaryText: 'LEARN. PRACTICE. GROW. LEAD.',
      characterImage: 'https://cdn.pixabay.com/photo/2023/08/19/13/26/anime-8200639_1280.png',
      showParentProgress: true,
      parentProgressTitle: 'Parent Progress Live Tracking',
      parentProgressSubtitle: 'Real-time student growth, regular tests & report updates',
      parentProgressQuizScore: '96%',
      parentProgressAttendance: '98%',
      parentProgressRegularTests: 'Weekly',
      parentProgressBatchRank: 'Top 5%'
    });
    console.log('✅ Home Learning Section seeded successfully.');

    console.log('\n🎉 ALL DATA SEEDED SUCCESSFULLY TO MONGODB!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedAll();
