const express = require('express');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const { authenticate, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// POST /api/courses — Create a course (Instructor only)
router.post('/', authenticate, requireInstructor, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }
    const course = await Course.create({ title, description, instructor: req.user._id });
    await course.populate('instructor', 'name email');
    res.status(201).json({ message: 'Course created.', course });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create course.', details: err.message });
  }
});

// GET /api/courses — List all courses with instructor info and quiz count
router.get('/', authenticate, async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'name email').sort({ createdAt: -1 });
    
    // Attach quiz count and enrollment status for each course
    const result = await Promise.all(courses.map(async (c) => {
      const quizCount = await Quiz.countDocuments({ course: c._id });
      let enrolled = false;
      if (req.user.role === 'student') {
        const enr = await Enrollment.findOne({ student: req.user._id, course: c._id });
        enrolled = !!enr;
      }
      return { ...c.toObject(), quizCount, enrolled };
    }));

    res.json({ courses: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses.', details: err.message });
  }
});

// GET /api/courses/:id — Get single course details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name email');
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    const quizzes = await Quiz.find({ course: course._id }).sort({ createdAt: 1 });
    res.json({ course, quizzes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course.', details: err.message });
  }
});

// POST /api/courses/:id/enroll — Student enrolls in a course
router.post('/:id/enroll', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can enroll.' });
    }
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const enrollment = await Enrollment.create({ student: req.user._id, course: course._id });
    res.status(201).json({ message: 'Successfully enrolled.', enrollment });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Already enrolled in this course.' });
    }
    res.status(500).json({ error: 'Enrollment failed.', details: err.message });
  }
});

// DELETE /api/courses/:id — Delete a course (Instructor, own courses only)
router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, instructor: req.user._id });
    if (!course) return res.status(404).json({ error: 'Course not found or not authorized.' });
    res.json({ message: 'Course deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete course.', details: err.message });
  }
});

module.exports = router;
