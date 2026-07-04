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

  app.listen(PORT, () => {
    console.log(`🚀 EduTrack Lite Backend running on http://localhost:${PORT}`);
    console.log(`   API Docs: http://localhost:${PORT}/api/health`);
  });
}

startServer();
