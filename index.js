require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cloudinary = require('cloudinary').v2;

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const app = express();
let server = app;
let io = null;

if (!process.env.VERCEL) {
  server = http.createServer(app);
  try {
    const { Server } = require("socket.io");
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    app.set('io', io);

    const Message = require('./models/Message');

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      socket.on('joinRoom', (roomId) => {
        if (roomId) {
          socket.join(roomId.toString());
          console.log(`Socket ${socket.id} joined room ${roomId}`);
        }
      });

      socket.on('sendPrivateMessage', async (data) => {
        try {
          const { senderId, receiverId, content } = data;
          if (!senderId || !content) return;

          const newMessage = new Message({
            senderId,
            receiverId: receiverId || null,
            content,
            createdAt: new Date()
          });
          await newMessage.save();

          if (receiverId) {
            io.to(receiverId.toString()).emit('receiveMessage', newMessage);
          }
          io.to(senderId.toString()).emit('receiveMessage', newMessage);
        } catch (err) {
          console.error('Socket sendPrivateMessage error:', err);
        }
      });

      socket.on('sendGroupMessage', async (data) => {
        try {
          const { senderId, groupId, content } = data;
          if (!senderId || !groupId || !content) return;

          const newMessage = new Message({
            senderId,
            groupId,
            content,
            createdAt: new Date()
          });
          await newMessage.save();

          io.to(groupId.toString()).emit('receiveMessage', newMessage);
        } catch (err) {
          console.error('Socket sendGroupMessage error:', err);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });
  } catch (socketErr) {
    console.warn('Socket.io skipped on serverless env:', socketErr.message);
  }
}

const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists (safely handle Vercel read-only filesystem)
const uploadsDir = process.env.VERCEL ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Uploads directory creation warning:', err.message);
}

// URL Normalization Middleware for Vercel Serverless Function Rewrites
app.use((req, res, next) => {
  if (req.url.length > 1 && req.url.includes('/?') ) {
    req.url = req.url.replace('/?', '?');
  }
  if (req.url.length > 1 && req.url.endsWith('/') && !req.url.includes('?')) {
    req.url = req.url.slice(0, -1);
  }
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace('/api/index.js', '/api');
  }
  if (!req.url.startsWith('/api') && !req.url.startsWith('/uploads') && req.url !== '/') {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }
  next();
});

// CORS & Middleware Configuration

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization, Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection for Serverless & Local
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('MONGO_URI or MONGODB_URI missing in environment variables');
    return;
  }
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
};

app.use(async (req, res, next) => {
  await connectDB();
  next();
});


// Cloudinary Configuration
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Passport Google Auth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id') {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      // In a real app, find or create the user in the database here
      console.log('Google Profile:', profile);
      return cb(null, profile);
    }
  ));
} else {
  console.warn('Google OAuth strategy skipped: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured.');
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

const Course = require('./models/Course');
const Blog = require('./models/Blog');
const User = require('./models/User');
const Contact = require('./models/Contact');
const Assignment = require('./models/Assignment');
const Subject = require('./models/Subject');
const HomeLearningSection = require('./models/HomeLearningSection');

// Routes
const authRoutes = require('./routes/auth');
const parentRoutes = require('./routes/parentRoutes');
const feeRoutes = require('./routes/feeRoutes');
const groupRoutes = require('./routes/groupRoutes');
const testRoutes = require('./routes/testRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aboutRoutes = require('./routes/aboutRoutes');
const About = require('./models/About');

app.use('/api/auth', authRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/about', aboutRoutes);

// General Routes
app.get('/', (req, res) => {
  res.send('Backend Server is running');
});

// Subject Routes
app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects' });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Subject name is required' });
    
    let subject = await Subject.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (!subject) {
      subject = new Subject({ name });
      await subject.save();
    }
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error creating subject' });
  }
});

app.delete('/api/subjects/:id', async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject' });
  }
});

// API Routes
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses' });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const newCourse = new Course(req.body);
    await newCourse.save();
    console.log(`[POST /api/courses] Created course with videoUrl: "${newCourse.videoUrl}"`);
    res.status(201).json(newCourse);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course' });
  }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    delete updatePayload._id;
    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    console.log(`[PUT /api/courses/${req.params.id}] Updated course with videoUrl: "${updatedCourse?.videoUrl}"`);
    res.json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
});

app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

app.post('/api/blogs', async (req, res) => {
  try {
    const newBlog = new Blog(req.body);
    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    res.status(500).json({ message: 'Error creating blog' });
  }
});

app.put('/api/blogs/:id', async (req, res) => {
  try {
    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedBlog);
  } catch (error) {
    res.status(500).json({ message: 'Error updating blog' });
  }
});

app.delete('/api/blogs/:id', async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting blog' });
  }
});

// Assignments routes are now handled in routes/assignmentRoutes.js

// Contact Routes
app.post('/api/contact', async (req, res) => {
  try {
    const newContact = new Contact(req.body);
    await newContact.save();
    res.status(201).json(newContact);
  } catch (error) {
    console.error("Contact Form Submission Error:", error);
    res.status(500).json({ message: 'Error submitting contact form', error: error.message });
  }
});

// PDF File Upload Route
app.post('/api/upload-pdf', async (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData) {
      return res.status(400).json({ message: 'No file data provided' });
    }

    const safeName = (fileName || 'ReportCard.pdf').replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Extract base64 payload
    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, '').replace(/^data:.*?;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${uniqueFileName}`;
    console.log(`PDF saved to disk: ${filePath} -> ${fileUrl}`);
    res.json({ fileUrl, fileName: safeName });
  } catch (error) {
    console.error('Error saving uploaded PDF file:', error);
    res.status(500).json({ message: 'Error saving PDF file on server' });
  }
});

// General Image Upload Route
app.post('/api/upload-image', async (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData) {
      return res.status(400).json({ message: 'No image file data provided' });
    }

    // Try Cloudinary upload if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const uploadResult = await cloudinary.uploader.upload(fileData, {
          folder: 'yashedu_uploads',
          resource_type: 'auto'
        });
        console.log('Image uploaded to Cloudinary:', uploadResult.secure_url);
        return res.json({ 
          imageUrl: uploadResult.secure_url, 
          fileUrl: uploadResult.secure_url, 
          fileName: fileName || uploadResult.public_id 
        });
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr.message);
      }
    }

    // On Vercel serverless environment, return base64 URL directly if Cloudinary is not set
    if (process.env.VERCEL && fileData.startsWith('data:image/')) {
      return res.json({ 
        imageUrl: fileData, 
        fileUrl: fileData, 
        fileName: fileName || 'image.png' 
      });
    }

    const safeName = (fileName || 'image.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    const base64Data = fileData.replace(/^data:image\/[a-zA-Z]+;base64,/, '').replace(/^data:.*?;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${uniqueFileName}`;
    console.log(`Image saved to disk: ${filePath} -> ${fileUrl}`);
    res.json({ imageUrl: fileUrl, fileUrl, fileName: safeName });
  } catch (error) {
    console.error('Error saving uploaded image file:', error);
    res.status(500).json({ message: 'Error saving image file on server' });
  }
});

// PDF to MCQ Conversion Route
app.post('/api/convert-pdf-to-mcq', async (req, res) => {
  try {
    const pdfParse = require('pdf-parse');
    const { fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ message: 'No PDF file data provided' });
    }

    // Convert base64 data to buffer
    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, '').replace(/^data:.*?;base64,/, '');
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    // Extract text from PDF
    const parsedData = await pdfParse(pdfBuffer);
    const pdfText = parsedData.text || '';
    console.log(`PDF text extracted (${pdfText.length} characters)`);

    const questions = [];
    const cleanText = pdfText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Strategy 1: Look for numbered questions or Q1., Q2., Question 1, etc.
    const questionBlocks = cleanText.split(/(?=(?:Q(?:uestion)?\s*\d+|^\s*\d+[\.\)])\s+)/im);
    
    for (const block of questionBlocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      
      const optionMatches = [...trimmed.matchAll(/(?:(?:\(([a-d1-4])\)|(?:^|\s+)([a-d1-4])[\.\)]))\s*([^\n\(\)]+)/gi)];
      
      if (optionMatches.length >= 2) {
        const firstOptIndex = trimmed.search(/(?:\([a-d1-4]\)|(?:^|\s+)[a-d1-4][\.\)])/i);
        let qText = firstOptIndex > 0 ? trimmed.substring(0, firstOptIndex).trim() : trimmed;
        qText = qText.replace(/^(?:Q(?:uestion)?\s*\d+[\.\:]?|\d+[\.\)])\s*/i, '').trim();
        
        const options = [];
        let correctOptionIndex = 0;
        
        optionMatches.slice(0, 4).forEach((match) => {
          const optVal = match[3].trim();
          if (optVal) options.push(optVal);
        });

        while (options.length < 4) {
          options.push(`Option ${String.fromCharCode(65 + options.length)}`);
        }

        const ansMatch = trimmed.match(/(?:Ans(?:wer)?|Correct)\s*[\:\=]?\s*\(?([a-d1-4])\)?/i);
        if (ansMatch) {
          const ansChar = ansMatch[1].toUpperCase();
          if (ansChar === 'A' || ansChar === '1') correctOptionIndex = 0;
          else if (ansChar === 'B' || ansChar === '2') correctOptionIndex = 1;
          else if (ansChar === 'C' || ansChar === '3') correctOptionIndex = 2;
          else if (ansChar === 'D' || ansChar === '4') correctOptionIndex = 3;
        }

        if (qText.length > 3) {
          questions.push({
            questionText: qText.substring(0, 250),
            options: options.slice(0, 4),
            correctOptionIndex
          });
        }
      }
    }

    // Strategy 2: Fallback generator if standard MCQ pattern wasn't in PDF
    if (questions.length === 0) {
      const sentences = cleanText
        .split(/(?:[\.\?\!\n]+)/)
        .map(s => s.trim())
        .filter(s => s.length > 15 && s.length < 150 && !s.toLowerCase().includes('http') && !s.toLowerCase().includes('www'));

      for (let i = 0; i < Math.min(sentences.length, 10); i += 2) {
        const sentence = sentences[i];
        if (!sentence) continue;

        const words = sentence.split(/\s+/);
        if (words.length < 3) continue;

        const keyWord = words[Math.floor(words.length / 2)] || 'Details';
        const questionText = `Based on the PDF content: "${sentence.substring(0, 80)}..." - Which statement is correct?`;
        
        const options = [
          `This statement correctly matches the PDF content.`,
          `This statement contradicts the PDF content.`,
          `This information is not provided in the PDF.`,
          `None of the above.`
        ];

        questions.push({
          questionText,
          options,
          correctOptionIndex: 0
        });
      }
    }

    console.log(`Converted PDF into ${questions.length} MCQs`);
    res.json({ questions, totalConverted: questions.length });
  } catch (error) {
    console.error('Error converting PDF to MCQ:', error);
    res.status(500).json({ message: 'Failed to extract MCQs from PDF file', error: error.message });
  }
});

// Generate & Send Official PDF Report Card Route
app.post('/api/users/generate-report-card', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { studentId, maxMarks, marksObtained, teacherRemarks, attendance, attendanceStatus } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID required' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (attendance) student.attendance = attendance;
    if (attendanceStatus) student.attendanceStatus = attendanceStatus;

    if (maxMarks) {
      student.maxMarks = maxMarks;
      student.markModified('maxMarks');
    }
    if (marksObtained) {
      student.marksObtained = marksObtained;
      student.markModified('marksObtained');
      
      // Calculate performance scores percentages for chart compatibility
      const calcPerformanceScores = {};
      const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
      subjects.forEach(subj => {
        const maxVal = Number((maxMarks || student.maxMarks || {})[subj] ?? 100) || 100;
        const obtVal = Number(marksObtained[subj] ?? 0) || 0;
        calcPerformanceScores[subj] = maxVal > 0 ? Math.round((obtVal / maxVal) * 100) : 0;
      });
      student.performanceScores = calcPerformanceScores;
      student.markModified('performanceScores');
    }
    if (teacherRemarks !== undefined) student.teacherRemarks = teacherRemarks;
    await student.save();

    const maxMarksObj = student.maxMarks || {
      Mathematics: 100,
      Physics: 100,
      Chemistry: 100,
      Biology: 100,
      English: 100
    };

    const marksObtainedObj = student.marksObtained || student.performanceScores || {
      Mathematics: 0,
      Physics: 0,
      Chemistry: 0,
      Biology: 0,
      English: 0
    };

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const safeName = `${student.fullName || 'Student'}_ReportCard_${Date.now()}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(uploadsDir, safeName);
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Header Background Band (Rich Maroon Theme) with Gold Accent Line
    doc.rect(0, 0, 595, 95).fill('#6B0000');
    doc.rect(0, 92, 595, 3).fill('#D4AF37');
    
    // Official YashEdu Logo Image on Header
    let logoEmbedded = false;
    const logoPaths = [
      'C:/imporent/WhatsApp Image 2026-07-30 at 14.41.02.jpeg',
      path.join(__dirname, '../yashedu/src/images/WhatsApp_Logo.jpeg'),
      path.join(__dirname, '../WhatsApp Image 2026-07-30 at 14.41.02.jpeg'),
      path.join(__dirname, '../yashedu/src/images/Untitled design.png'),
      'c:/imporent/yash edu/yashedu/src/images/Untitled design.png'
    ];

    for (const lPath of logoPaths) {
      if (fs.existsSync(lPath)) {
        try {
          doc.rect(32, 10, 75, 75).fill('#FFFFFF');
          doc.image(lPath, 34, 12, { fit: [71, 71], align: 'center', valign: 'center' });
          doc.rect(32, 10, 75, 75).lineWidth(1.5).stroke('#D4AF37');
          logoEmbedded = true;
          break;
        } catch (logoErr) {
          console.error('Error embedding YashEdu logo image:', logoErr);
        }
      }
    }

    if (!logoEmbedded) {
      doc.circle(65, 47, 28).fillAndStroke('#800000', '#D4AF37');
      doc.circle(65, 47, 24).lineWidth(1.5).stroke('#F59E0B');
      doc.fillColor('#FDE68A').fontSize(22).font('Helvetica-Bold').text('Y', 57, 34);
    }

    // Header Titles (Positioned next to Logo)
    doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('YASHEDU ACADEMY', 120, 22);
    doc.fontSize(10).font('Helvetica').fillColor('#FDE68A').text('OFFICIAL ACADEMIC PERFORMANCE & EVALUATION REPORT', 120, 52);
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#FEF3C7').text('Empowering Excellence in Education & Academic Achievement', 120, 67);

    // Document Subheading
    doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold').text('STUDENT PERFORMANCE REPORT CARD', 40, 110);

    // Student Info Card Box (Height: 90)
    doc.rect(40, 128, 515, 90).fillAndStroke('#FFFBEB', '#FCD34D');

    // Embed Student Photo if available
    let hasPhoto = false;
    let profilePicData = student.profilePicUrl || '';
    
    if (profilePicData && typeof profilePicData === 'string') {
      try {
        if (profilePicData.includes('base64,')) {
          const base64Clean = profilePicData.substring(profilePicData.indexOf('base64,') + 7).replace(/\s/g, '');
          const imageBuf = Buffer.from(base64Clean, 'base64');
          doc.image(imageBuf, 470, 138, { fit: [70, 70], align: 'center', valign: 'center' });
          doc.rect(470, 138, 70, 70).lineWidth(2).stroke('#D4AF37');
          hasPhoto = true;
        } else if (profilePicData.startsWith('http')) {
          const fileName = profilePicData.substring(profilePicData.lastIndexOf('/') + 1);
          const localPath = path.join(uploadsDir, fileName);
          if (fs.existsSync(localPath)) {
            doc.image(localPath, 470, 138, { fit: [70, 70], align: 'center', valign: 'center' });
            doc.rect(470, 138, 70, 70).lineWidth(2).stroke('#D4AF37');
            hasPhoto = true;
          }
        }
      } catch (imgErr) {
        console.error('Error rendering student photo in PDF:', imgErr);
      }
    }

    if (!hasPhoto) {
      // Render Student Initial Badge Placeholder
      doc.rect(470, 138, 70, 70).fillAndStroke('#FEE2E2', '#800000');
      const initialChar = (student.fullName || 'S').charAt(0).toUpperCase();
      doc.fillColor('#800000').fontSize(32).font('Helvetica-Bold').text(initialChar, 492, 153);
    }

    // Student Information Labels
    doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold');
    doc.text(`Student Name: ${student.fullName || 'N/A'}`, 55, 142);
    doc.text(`Student ID: ${student.studentId || 'N/A'}`, 55, 160);
    doc.text(`Email: ${student.email || 'N/A'}`, 55, 178);
    doc.text(`Phone: ${student.phone || 'N/A'}`, 55, 196);

    doc.text(`Course: ${student.courseName || 'Standard Secondary Course'}`, 260, 142);
    doc.text(`Attendance Record: ${student.attendance || '0%'}`, 260, 160);
    doc.text(`Gender / Age: ${student.gender || 'N/A'} ${student.age ? `(${student.age} yrs)` : ''}`, 260, 178);
    doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 260, 196);

    // Table Header (Maroon Theme)
    const startY = 232;
    doc.rect(40, startY, 515, 25).fill('#6B0000');
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    doc.text('SUBJECT', 55, startY + 8);
    doc.text('MAX MARKS', 180, startY + 8);
    doc.text('MARKS OBTAINED', 280, startY + 8);
    doc.text('PERCENTAGE', 390, startY + 8);
    doc.text('GRADE', 485, startY + 8);

    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
    let currentY = startY + 25;
    let totalObtained = 0;
    let totalMax = 0;

    subjects.forEach((subj, idx) => {
      const maxM = Number(maxMarksObj[subj] ?? 100) || 100;
      const obtainedM = Math.max(0, Number(marksObtainedObj[subj] ?? 0));
      totalMax += maxM;
      totalObtained += obtainedM;
      
      const pct = maxM > 0 ? Math.round((obtainedM / maxM) * 100) : 0;
      const grade = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'F';
      
      const bgColor = idx % 2 === 0 ? '#FFFFFF' : '#FFF5F5';
      doc.rect(40, currentY, 515, 25).fillAndStroke(bgColor, '#E5E7EB');
      
      doc.fillColor('#1F2937').fontSize(10).font('Helvetica');
      doc.text(subj, 55, currentY + 8);
      doc.text(`${maxM}`, 180, currentY + 8);
      doc.text(`${obtainedM}`, 280, currentY + 8);
      doc.text(`${pct}%`, 390, currentY + 8);
      doc.fillColor(pct >= 40 ? '#047857' : '#6B0000').font('Helvetica-Bold').text(grade, 485, currentY + 8);

      currentY += 25;
    });

    // Overall Summary Box (Maroon & Gold Theme)
    const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    const overallGrade = overallPct >= 90 ? 'A+' : overallPct >= 75 ? 'A' : overallPct >= 60 ? 'B' : overallPct >= 40 ? 'C' : 'F';
    const resultText = overallPct >= 75 ? 'PASSED WITH DISTINCTION' : overallPct >= 40 ? 'PASSED' : 'NEEDS IMPROVEMENT';

    currentY += 15;
    doc.rect(40, currentY, 515, 65).fillAndStroke('#FEF3C7', '#D4AF37');
    doc.fillColor('#6B0000').fontSize(10).font('Helvetica-Bold');
    doc.text(`TOTAL AGGREGATE: ${totalObtained} / ${totalMax}`, 55, currentY + 12);
    doc.text(`OVERALL PERCENTAGE: ${overallPct}%`, 55, currentY + 28);
    doc.text(`ATTENDANCE RECORD: ${student.attendance || '0%'}`, 55, currentY + 44);

    doc.fillColor('#065F46').text(`OVERALL GRADE: ${overallGrade}`, 340, currentY + 12);
    doc.text(`RESULT: ${resultText}`, 340, currentY + 28);
    doc.fillColor('#1D4ED8').text(`ATTENDANCE STATUS: ${student.attendanceStatus || 'Not Marked'}`, 340, currentY + 44);

    // Remarks & Signature Section
    currentY += 85;
    const defaultRemarks = 'The student has demonstrated strong analytical skills and consistent engagement across core subjects. Official record verified by YashEdu Examination Board.';
    const finalRemarks = student.teacherRemarks && student.teacherRemarks.trim() ? student.teacherRemarks.trim() : defaultRemarks;

    doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text('TEACHER & ACADEMIC REMARKS:', 40, currentY);
    doc.fontSize(9).font('Helvetica').text(
      finalRemarks,
      40,
      currentY + 15,
      { width: 515 }
    );

    currentY += 60;
    doc.strokeColor('#9CA3AF').lineWidth(1).moveTo(370, currentY).lineTo(520, currentY).stroke();
    doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold').text('Authorized Principal Signature', 375, currentY + 5);
    doc.fontSize(8).font('Helvetica').text('YashEdu Academy Examination Board', 365, currentY + 18);

    doc.end();

    writeStream.on('finish', async () => {
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/${safeName}`;
      student.reportCardUrl = fileUrl;
      student.reportCardName = safeName;
      await student.save();

      console.log(`Generated report card PDF for student ${student.fullName}: ${fileUrl}`);
      res.json({
        message: `Successfully generated & sent official PDF Report Card to Parent for ${student.fullName}!`,
        reportCardUrl: fileUrl,
        reportCardName: safeName,
        student
      });
    });

  } catch (error) {
    console.error('Error generating PDF report card:', error);
    res.status(500).json({ message: 'Error generating PDF report card', error: error.message });
  }
});

// Users Routes
app.post('/api/users', async (req, res) => {
  try {
    const { firebaseUid, fullName, email, role, studentId, age, dob, gender, phone, status, attendance, attendanceStatus, reportCardUrl, reportCardName, studentMessage } = req.body;
    
    // Check if user already exists for this specific role and email
    let user = await User.findOne({ email, role: role || 'student' });
    if (user) {
      if (studentId) user.studentId = studentId;
      if (fullName) user.fullName = fullName;
      if (phone) user.phone = phone;
      if (age) user.age = age;
      if (dob) user.dob = dob;
      if (gender) user.gender = gender;
      if (attendance) user.attendance = attendance;
      if (attendanceStatus) user.attendanceStatus = attendanceStatus;
      if (reportCardUrl) user.reportCardUrl = reportCardUrl;
      if (reportCardName) user.reportCardName = reportCardName;
      if (studentMessage !== undefined) user.studentMessage = studentMessage;
      await user.save();
      return res.status(200).json(user);
    }
    
    user = new User({
      firebaseUid: firebaseUid || `temp-${Date.now()}`, 
      fullName, 
      email, 
      role: role || 'student', 
      studentId, 
      age, 
      dob, 
      gender, 
      phone, 
      status, 
      attendance, 
      attendanceStatus, 
      reportCardUrl, 
      reportCardName,
      studentMessage
    });
    
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message, stack: error.stack });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const { role, email, studentId } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (email) filter.email = email;
    if (studentId) filter.studentId = studentId;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.put('/api/users/id/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.maxMarks) {
      user.maxMarks = req.body.maxMarks;
      user.markModified('maxMarks');
    }
    if (req.body.marksObtained) {
      user.marksObtained = req.body.marksObtained;
      user.markModified('marksObtained');
    }
    if (req.body.performanceScores) {
      user.performanceScores = req.body.performanceScores;
      user.markModified('performanceScores');
    }
    if (req.body.teacherRemarks !== undefined) {
      user.teacherRemarks = req.body.teacherRemarks;
    }

    Object.keys(req.body).forEach(key => {
      if (!['maxMarks', 'marksObtained', 'performanceScores', 'teacherRemarks'].includes(key)) {
        user[key] = req.body[key];
      }
    });

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error updating user by id:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

app.put('/api/users/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { role } = req.query;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    }

    if (!user) {
      const decodedParam = decodeURIComponent(identifier);
      const filter = { email: { $regex: new RegExp(`^${decodedParam.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } };
      if (role) filter.role = role;
      user = await User.findOne(filter);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.maxMarks) {
      user.maxMarks = req.body.maxMarks;
      user.markModified('maxMarks');
    }
    if (req.body.marksObtained) {
      user.marksObtained = req.body.marksObtained;
      user.markModified('marksObtained');
    }
    if (req.body.performanceScores) {
      user.performanceScores = req.body.performanceScores;
      user.markModified('performanceScores');
    }
    if (req.body.teacherRemarks !== undefined) {
      user.teacherRemarks = req.body.teacherRemarks;
    }

    Object.keys(req.body).forEach(key => {
      if (!['maxMarks', 'marksObtained', 'performanceScores', 'teacherRemarks'].includes(key)) {
        user[key] = req.body[key];
      }
    });

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});


app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    
    // Clean up associated payment records and fee cycles for deleted user
    const Payment = require('./models/Payment');
    const FeeCycle = require('./models/FeeCycle');
    await Payment.deleteMany({ $or: [{ studentId: userId }, { parentId: userId }] });
    await FeeCycle.deleteMany({ studentId: userId });

    res.json({ message: 'User and associated fee records deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});


// Home Learning Section Routes
app.get('/api/home-learning', async (req, res) => {
  try {
    let section = await HomeLearningSection.findOne();
    if (!section) {
      // Return default if not configured yet
      section = new HomeLearningSection();
      await section.save();
    }
    res.json(section);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching home learning section configuration' });
  }
});

app.put('/api/home-learning', async (req, res) => {
  try {
    let section = await HomeLearningSection.findOne();
    if (section) {
      section = await HomeLearningSection.findByIdAndUpdate(section._id, req.body, { new: true });
    } else {
      section = new HomeLearningSection(req.body);
      await section.save();
    }
    res.json(section);
  } catch (error) {
    console.error('Error updating home learning section:', error);
    res.status(500).json({ message: 'Error updating home learning section' });
  }
});

// Google Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

// Global Express Error Handler for Serverless Safety
app.use((err, req, res, next) => {
  console.error('Global Express Error caught:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An error occurred processing your request'
    });
  }
});

// Start Server
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
