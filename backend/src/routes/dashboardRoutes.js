const express = require('express');
const axios = require('axios');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { authenticate, requireInstructor } = require('../middleware/auth');

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * GET /api/dashboard/course/:courseId
 * Instructor-only: Get all enrolled students with their computed risk flags from the ML service.
 */
router.get('/course/:courseId', authenticate, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user._id });
    if (!course) return res.status(404).json({ error: 'Course not found or not authorized.' });

    // Get all quizzes in this course
    const quizzes = await Quiz.find({ course: course._id });
    const quizCount = quizzes.length;

    // Get all enrollments
    const enrollments = await Enrollment.find({ course: course._id }).populate('student', 'name email');

    if (enrollments.length === 0) {
      return res.json({ course, students: [], quizCount });
    }

    // Build student stats: average_score and completion_percentage
    const studentStats = await Promise.all(
      enrollments.map(async (enr) => {
        const student = enr.student;
        const submissions = await Submission.find({ student: student._id, course: course._id });

        let avgScore = 0;
        let completionPct = 0;

        if (quizCount > 0 && submissions.length > 0) {
          // Normalize each score to 0-100 based on maxScore
          const normalizedScores = await Promise.all(
            submissions.map(async (sub) => {
              const quiz = quizzes.find(q => q._id.toString() === sub.quiz.toString());
              const maxScore = quiz ? quiz.maxScore : 100;
              return (sub.score / maxScore) * 100;
            })
          );
          avgScore = normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;
          completionPct = (submissions.length / quizCount) * 100;
        }

        return {
          student_id: student._id.toString(),
          name: student.name,
          email: student.email,
          average_score: Math.round(avgScore * 10) / 10,
          completion_percentage: Math.round(completionPct * 10) / 10,
          quizzesCompleted: submissions.length,
          totalQuizzes: quizCount
        };
      })
    );

    // Call ML service for risk predictions
    let predictions = [];
    try {
      const mlPayload = {
        students: studentStats.map(s => ({
          student_id: s.student_id,
          average_score: s.average_score,
          completion_percentage: s.completion_percentage
        }))
      };
      const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, mlPayload, { timeout: 5000 });
      predictions = mlResponse.data.predictions || [];
    } catch (mlErr) {
      console.warn('ML service unavailable, defaulting to heuristic flags:', mlErr.message);
      // Fallback: simple heuristic if ML service is down
      predictions = studentStats.map(s => ({
        student_id: s.student_id,
        flag: (s.average_score < 60 || s.completion_percentage < 50) ? 'At risk' : 'On track',
        probability: s.average_score < 60 ? 0.8 : 0.2
      }));
    }

    // Merge stats with predictions
    const predMap = {};
    predictions.forEach(p => { predMap[p.student_id] = p; });

    const students = studentStats.map(s => ({
      ...s,
      flag: predMap[s.student_id]?.flag || 'On track',
      riskProbability: predMap[s.student_id]?.probability || 0
    }));

    res.json({ course, students, quizCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate dashboard.', details: err.message });
  }
});

/**
 * GET /api/dashboard/student
 * Student-only: Get the enrolled student's personal progress across all courses.
 */
router.get('/student', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access only.' });
    }

    const enrollments = await Enrollment.find({ student: req.user._id }).populate('course');

    const progress = await Promise.all(
      enrollments.map(async (enr) => {
        const course = enr.course;
        const quizzes = await Quiz.find({ course: course._id });
        const submissions = await Submission.find({ student: req.user._id, course: course._id });

        const quizCount = quizzes.length;
        let avgScore = 0;
        let completionPct = 0;

        if (quizCount > 0 && submissions.length > 0) {
          const normalizedScores = submissions.map(sub => {
            const quiz = quizzes.find(q => q._id.toString() === sub.quiz.toString());
            const maxScore = quiz ? quiz.maxScore : 100;
            return (sub.score / maxScore) * 100;
          });
          avgScore = normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;
          completionPct = (submissions.length / quizCount) * 100;
        }

        // Get individual quiz submissions for display
        const quizProgress = quizzes.map(q => {
          const sub = submissions.find(s => s.quiz.toString() === q._id.toString());
          return {
            quizId: q._id,
            title: q.title,
            maxScore: q.maxScore,
            score: sub ? sub.score : null,
            submitted: !!sub,
            submittedAt: sub ? sub.submittedAt : null
          };
        });

        return {
          courseId: course._id,
          courseTitle: course.title,
          courseDescription: course.description,
          enrolledAt: enr.enrolledAt,
          averageScore: Math.round(avgScore * 10) / 10,
          completionPercentage: Math.round(completionPct * 10) / 10,
          quizzesCompleted: submissions.length,
          totalQuizzes: quizCount,
          quizProgress
        };
      })
    );

    res.json({ student: { id: req.user._id, name: req.user.name, email: req.user.email }, progress });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student progress.', details: err.message });
  }
});

module.exports = router;
