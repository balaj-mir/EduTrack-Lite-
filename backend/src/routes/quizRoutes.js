const express = require('express');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { authenticate, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// POST /api/quizzes — Create a quiz for a course (Instructor only)
router.post('/', authenticate, requireInstructor, async (req, res) => {
  try {
    const { courseId, title, maxScore } = req.body;
    if (!courseId || !title) {
      return res.status(400).json({ error: 'courseId and title are required.' });
    }

    const course = await Course.findOne({ _id: courseId, instructor: req.user._id });
    if (!course) return res.status(404).json({ error: 'Course not found or not authorized.' });

    const quiz = await Quiz.create({ course: courseId, title, maxScore: maxScore || 100 });
    res.status(201).json({ message: 'Quiz created.', quiz });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quiz.', details: err.message });
  }
});

// GET /api/quizzes/course/:courseId — List quizzes for a course
router.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ course: req.params.courseId }).sort({ createdAt: 1 });

    // If student, also return their submission status per quiz
    if (req.user.role === 'student') {
      const quizIds = quizzes.map(q => q._id);
      const submissions = await Submission.find({ student: req.user._id, quiz: { $in: quizIds } });
      const subMap = {};
      submissions.forEach(s => { subMap[s.quiz.toString()] = s; });

      const enriched = quizzes.map(q => ({
        ...q.toObject(),
        submission: subMap[q._id.toString()] || null
      }));
      return res.json({ quizzes: enriched });
    }

    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quizzes.', details: err.message });
  }
});

// POST /api/quizzes/:id/submit — Student submits a score
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit quizzes.' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    const { score } = req.body;
    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'Score is required.' });
    }
    if (score < 0 || score > quiz.maxScore) {
      return res.status(400).json({ error: `Score must be between 0 and ${quiz.maxScore}.` });
    }

    // Check student is enrolled in the course
    const enrolled = await Enrollment.findOne({ student: req.user._id, course: quiz.course });
    if (!enrolled) return res.status(403).json({ error: 'You must be enrolled in this course to submit.' });

    const submission = await Submission.findOneAndUpdate(
      { student: req.user._id, quiz: quiz._id },
      { student: req.user._id, quiz: quiz._id, course: quiz.course, score, submittedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Score submitted successfully.', submission });
  } catch (err) {
    res.status(500).json({ error: 'Submission failed.', details: err.message });
  }
});

// DELETE /api/quizzes/:id — Delete a quiz (Instructor only)
router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('course');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
    if (quiz.course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    await quiz.deleteOne();
    res.json({ message: 'Quiz deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quiz.', details: err.message });
  }
});

module.exports = router;
