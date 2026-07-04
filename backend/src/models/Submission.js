const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  score: { type: Number, required: true, min: 0 },
  submittedAt: { type: Date, default: Date.now }
});

// One submission per student per quiz
submissionSchema.index({ student: 1, quiz: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
