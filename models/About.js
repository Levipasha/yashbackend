const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
  // Hero Section
  heroTitle: { type: String, default: 'About Yash Educational Institute' },
  heroDescription: { type: String, default: 'At Yash Educational Institute, we believe every student has the potential to achieve greatness. We are committed to providing quality education, expert guidance, and a nurturing environment that inspires confidence, curiosity, and character.' },
  heroImage: { type: String, default: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80' },
  heroCtaText: { type: String, default: 'Explore Our Programs' },
  heroCtaLink: { type: String, default: '/courses' },

  // Story Section
  storyTitle: { type: String, default: 'Our Story' },
  storyP1: { type: String, default: 'Founded with the vision of making quality education accessible and effective for all, Yash Educational Institute has grown into a trusted learning partner for thousands of students.' },
  storyP2: { type: String, default: 'From a small beginning, we have built a strong academic community driven by passion, dedication, and a student-first approach.' },
  storyCtaText: { type: String, default: 'Know More About Us' },
  storyCtaLink: { type: String, default: '/courses' },
  storyImage: { type: String, default: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80' },
  storyBadgeTitle: { type: String, default: 'Trusted by' },
  storyBadgeText: { type: String, default: 'Thousands of Students & Parents' },

  // Mission & Vision Section
  missionVisionTitle: { type: String, default: 'Our Mission & Vision' },
  missionTitle: { type: String, default: 'Our Mission' },
  ourMission: { type: String, default: 'Yash Educational Institute empowers every student to realize their potential by providing quality education, strong values, and the right guidance. We are committed to nurturing confident, skilled, and responsible individuals who contribute positively to society.' },
  visionTitle: { type: String, default: 'Our Vision' },
  ourVision: { type: String, default: 'To be a leading institute recognized for academic excellence, innovative teaching, and holistic development, preparing students to excel in a dynamic global world.' },

  // Why Choose Us Section
  whyChooseUsTitle: { type: String, default: 'Why Choose Us?' },
  whyChooseUs: [
    { title: String, description: String }
  ],

  // Statistics Banner Section
  stats: {
    studentsEnrolled: { type: String, default: '5,000+' },
    studentsEnrolledLabel: { type: String, default: 'Students Enrolled' },
    expertFaculty: { type: String, default: '50+' },
    expertFacultyLabel: { type: String, default: 'Expert Faculty' },
    successRate: { type: String, default: '98%' },
    successRateLabel: { type: String, default: 'Success Rate' },
    coursesOffered: { type: String, default: '120+' },
    coursesOfferedLabel: { type: String, default: 'Courses Offered' }
  },

  // Values Section
  valuesTitle: { type: String, default: 'Our Values' },
  coreValues: [
    { title: String, description: String }
  ],

  // Legacy fallback fields
  title: { type: String, default: 'About Yash Educational Institute' },
  subtitle: { type: String, default: 'At Yash Educational Institute, we believe every student has the potential to achieve greatness...' },

  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('About', aboutSchema);

