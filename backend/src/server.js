require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const quizRoutes = require('./routes/quizRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edutrack-lite';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EduTrack Lite Backend', timestamp: new Date().toISOString() });
});

// ─── Database Connection with In-Memory Fallback ──────────────────────────────
async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    console.log(`✅ MongoDB connected: ${MONGO_URI}`);
    return true;
  } catch (err) {
    console.warn(`⚠️  Local MongoDB unavailable (${err.message}). Falling back to in-memory DB...`);
    return false;
  }
}

async function seedInitialData() {
  try {
    const User = require('./models/User');
    const Course = require('./models/Course');
    const Quiz = require('./models/Quiz');
    const Enrollment = require('./models/Enrollment');
    const Submission = require('./models/Submission');

    const count = await User.countDocuments();
    if (count > 0) return;

    console.log('🌱 Seeding initial demo data into MongoDB...');
    const prof = await User.create({ name: 'Prof. Alan Turing', email: 'prof@university.edu', password: 'password123', role: 'instructor' });
    const alice = await User.create({ name: 'Alice Smith', email: 'alice@student.edu', password: 'password123', role: 'student' });
    const bob = await User.create({ name: 'Bob Jones', email: 'bob@student.edu', password: 'password123', role: 'student' });

    const course = await Course.create({ title: 'CS101: Artificial Intelligence & Risk Classifiers', description: 'Comprehensive introduction to machine learning models and OULAD student risk analytics.', instructor: prof._id });

    const quiz1 = await Quiz.create({ course: course._id, title: 'Module 1: Linear & Logistic Regression', maxScore: 100 });
    const quiz2 = await Quiz.create({ course: course._id, title: 'Module 2: Feature Engineering & ROC Curves', maxScore: 50 });

    await Enrollment.create({ student: alice._id, course: course._id });
    await Enrollment.create({ student: bob._id, course: course._id });

    await Submission.create({ student: alice._id, quiz: quiz1._id, course: course._id, score: 95 });
    await Submission.create({ student: alice._id, quiz: quiz2._id, course: course._id, score: 48 });

    await Submission.create({ student: bob._id, quiz: quiz1._id, course: course._id, score: 35 });

    console.log('✅ Demo seeding completed! Ready for instant login.');
  } catch (err) {
    console.error('⚠️ Error seeding data:', err.message);
  }
}

async function startServer() {
  const connected = await connectDatabase();

  if (!connected) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const inMemoryUri = mongoServer.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`✅ In-memory MongoDB started: ${inMemoryUri}`);
      console.log(`   ℹ️  Data is non-persistent. Start a real MongoDB instance for persistence.`);
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }

  await seedInitialData();

  app.listen(PORT, () => {
    console.log(`🚀 EduTrack Lite Backend running on http://localhost:${PORT}`);
    console.log(`   API Docs: http://localhost:${PORT}/api/health`);
  });
}

startServer();
