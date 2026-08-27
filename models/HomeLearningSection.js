const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  image: { type: String, required: true },
  altText: { type: String, default: 'Study image' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
});

const classCardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  tag: { type: String, default: 'Primary' },
  description: { type: String, default: '' },
  highlights: [{ type: String }],
  themeColor: { type: String, default: 'red' },
  buttonText: { type: String, default: 'Explore Classes' },
  linkUrl: { type: String, default: '/courses' },
  active: { type: Boolean, default: true }
});

const teachingStepSchema = new mongoose.Schema({
  step: { type: String, default: '01' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  badge: { type: String, default: 'Step 1' },
  themeColor: { type: String, default: 'red' },
  active: { type: Boolean, default: true }
});

const homeLearningSectionSchema = new mongoose.Schema({
  isVisible: { type: Boolean, default: true },
  sectionTitle: { type: String, default: 'Your Learning Journey' },
  sectionDescription: { type: String, default: 'Discover new skills and build your future.' },
  dialogText: { type: String, default: 'Your journey to success starts with one step.' },
  dialogSecondaryText: { type: String, default: 'Learn. Practice. Grow.' },
  characterImage: { type: String, default: 'https://cdn.pixabay.com/photo/2023/08/19/13/26/anime-8200639_1280.png' },
  galleryImages: [galleryImageSchema],
  animationEnabled: { type: Boolean, default: true },
  showParentProgress: { type: Boolean, default: true },
  parentProgressTitle: { type: String, default: 'Parent Progress Live Tracking' },
  parentProgressSubtitle: { type: String, default: 'Real-time student growth, regular tests & report updates' },
  parentProgressStatusText: { type: String, default: 'Active Live' },
  parentProgressQuizScore: { type: String, default: '96%' },
  parentProgressAttendance: { type: String, default: '98%' },
  parentProgressRegularTests: { type: String, default: 'Weekly' },
  parentProgressBatchRank: { type: String, default: 'Top 5%' },
  classesWeTeachSectionTitle: { type: String, default: 'Classes We Teach' },
  classesWeTeachSectionSubtitle: { type: String, default: 'Tailored curriculum and expert coaching designed for every milestone of your academic journey.' },
  classesWeTeachCards: [classCardSchema],
  
  // Teaching Method Section
  teachingMethodVisible: { type: Boolean, default: true },
  teachingMethodBadge: { type: String, default: 'Our Teaching Method' },
  teachingMethodTitle: { type: String, default: 'How We Help Students Improve' },
  teachingMethodDescription: { type: String, default: 'A proven 4-step structured learning journey designed to build conceptual clarity, boost confidence, and drive continuous academic growth.' },
  teachingMethodSteps: [teachingStepSchema],
  teachingMethodAssuranceTitle: { type: String, default: 'Why Parents Trust Our Methodology' },
  teachingMethodAssuranceDesc: { type: String, default: 'Every student gets personalized attention with weekly updates delivered directly to parents.' },
  
  // Hero Section Fields
  heroBadgeText: { type: String, default: 'QUALITY EDUCATION. BRIGHTER FUTURES.' },
  heroTitleLine1: { type: String, default: 'Learn Without' },
  heroTitleLine2: { type: String, default: 'Limits.' },
  heroDescription1: { type: String, default: 'Give your child the right guidance, personal attention, and strong academic foundation they need to succeed.' },
  heroDescription2: { type: String, default: 'Our tuition program provides a supportive and engaging learning environment for every student. We focus on helping students understand concepts clearly rather than simply memorizing answers.' },
  heroButtonText: { type: String, default: 'Start Learning' },
  heroButtonLink: { type: String, default: '/courses' },
  heroImage: { type: String, default: '' },
  heroStat1Value: { type: String, default: '50K+' },
  heroStat1Label: { type: String, default: 'Students' },
  heroStat2Value: { type: String, default: 'Live Classes' },
  heroStat2Label: { type: String, default: 'Daily' },
  heroStat3Value: { type: String, default: '500+' },
  heroStat3Label: { type: String, default: 'Courses' },

  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HomeLearningSection', homeLearningSectionSchema);
