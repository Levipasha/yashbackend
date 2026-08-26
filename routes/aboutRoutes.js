const express = require('express');
const router = express.Router();
const About = require('../models/About');

const defaultWhyChooseUs = [
  { title: 'Expert Faculty', description: 'Experienced and dedicated teachers committed to student success.' },
  { title: 'Comprehensive Programs', description: 'Curriculum designed for every academic milestone.' },
  { title: 'Proven Results', description: 'High success rate with countless achievers and top performers.' },
  { title: 'Student-Centered Approach', description: 'Personal attention and mentorship for overall growth.' },
  { title: 'Safe & Supportive Environment', description: 'A positive atmosphere that encourages learning and confidence.' },
  { title: 'Future-Ready Learning', description: 'Building skills, critical thinking, and leadership for tomorrow.' }
];

const defaultCoreValues = [
  { title: 'Excellence', description: 'We strive for the highest standards in teaching and learning.' },
  { title: 'Integrity', description: 'Honesty, transparency, and strong moral values guide us.' },
  { title: 'Respect', description: 'We respect every individual and celebrate diversity.' },
  { title: 'Growth', description: 'We believe in continuous improvement and lifelong learning.' },
  { title: 'Commitment', description: 'We are dedicated to shaping bright futures with care and passion.' }
];

const defaultAboutData = {
  heroTitle: 'About Yash Educational Institute',
  heroDescription: 'At Yash Educational Institute, we believe every student has the potential to achieve greatness. We are committed to providing quality education, expert guidance, and a nurturing environment that inspires confidence, curiosity, and character.',
  heroImage: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
  heroCtaText: 'Explore Our Programs',
  heroCtaLink: '/courses',

  storyTitle: 'Our Story',
  storyP1: 'Founded with the vision of making quality education accessible and effective for all, Yash Educational Institute has grown into a trusted learning partner for thousands of students.',
  storyP2: 'From a small beginning, we have built a strong academic community driven by passion, dedication, and a student-first approach.',
  storyCtaText: 'Know More About Us',
  storyCtaLink: '/courses',
  storyImage: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80',
  storyBadgeTitle: 'Trusted by',
  storyBadgeText: 'Thousands of Students & Parents',

  missionVisionTitle: 'Our Mission & Vision',
  missionTitle: 'Our Mission',
  ourMission: 'Yash Educational Institute empowers every student to realize their potential by providing quality education, strong values, and the right guidance. We are committed to nurturing confident, skilled, and responsible individuals who contribute positively to society.',
  visionTitle: 'Our Vision',
  ourVision: 'To be a leading institute recognized for academic excellence, innovative teaching, and holistic development, preparing students to excel in a dynamic global world.',

  whyChooseUsTitle: 'Why Choose Us?',
  whyChooseUs: defaultWhyChooseUs,

  stats: {
    studentsEnrolled: '5,000+',
    studentsEnrolledLabel: 'Students Enrolled',
    expertFaculty: '50+',
    expertFacultyLabel: 'Expert Faculty',
    successRate: '98%',
    successRateLabel: 'Success Rate',
    coursesOffered: '120+',
    coursesOfferedLabel: 'Courses Offered'
  },

  valuesTitle: 'Our Values',
  coreValues: defaultCoreValues
};

// Get About Us content
router.get('/', async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) {
      about = new About(defaultAboutData);
      await about.save();
    }
    
    const aboutObj = about.toObject();
    const mergedResult = {
      ...defaultAboutData,
      ...aboutObj,
      stats: {
        ...defaultAboutData.stats,
        ...(aboutObj.stats || {})
      },
      whyChooseUs: Array.isArray(aboutObj.whyChooseUs) && aboutObj.whyChooseUs.length > 0 ? aboutObj.whyChooseUs : defaultWhyChooseUs,
      coreValues: Array.isArray(aboutObj.coreValues) && aboutObj.coreValues.length > 0 ? aboutObj.coreValues : defaultCoreValues
    };

    res.json(mergedResult);
  } catch (error) {
    console.error('Error fetching About Us content:', error);
    res.status(500).json({ message: 'Error fetching About Us content' });
  }
});

// Update About Us content (Admin)
router.put('/', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() };
    delete updateData._id;

    const about = await About.findOneAndUpdate({}, updateData, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    });

    console.log('[PUT /api/about] Successfully updated About Us content');
    res.json(about);
  } catch (error) {
    console.error('Error updating About Us content:', error);
    res.status(500).json({ message: 'Error updating About Us content', error: error.message });
  }
});

module.exports = router;
