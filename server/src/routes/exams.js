import { Router } from 'express';
import { Exam } from '../models/Exam.js';
import { ExamResult } from '../models/ExamResult.js';
import { protect, authorize, writeAudit } from '../middleware/auth.js';
import { createInAppNotification } from '../services/notify.js';

const router = Router();

router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.query.className) filter.className = req.query.className;
  if (req.query.subject) filter.subject = req.query.subject;

  const exams = await Exam.find(filter)
    .populate('createdBy', 'name')
    .sort({ examDate: -1 });
  res.json({ exams });
});

router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { title, subject, className, section, examDate, maxMarks, durationMinutes, instructions } =
    req.body;
  if (!title || !subject || !className || !examDate) {
    return res.status(400).json({ message: 'title, subject, className, examDate required' });
  }

  const exam = await Exam.create({
    title,
    subject,
    className,
    section,
    examDate,
    maxMarks,
    durationMinutes,
    instructions,
    createdBy: req.user._id,
  });

  await writeAudit({
    actor: req.user,
    action: 'create-exam',
    resource: 'exam',
    resourceId: exam._id,
    req,
  });

  res.status(201).json({ exam });
});

router.get('/:id/results', protect, async (req, res) => {
  const filter = { examId: req.params.id };
  if (req.user.role === 'student') {
    filter.studentId = req.user._id;
  } else if (req.user.role === 'parent') {
    const kids = [...(req.user.parentOf || []), ...(req.user.studentIds || [])];
    filter.studentId = { $in: kids };
  }

  const results = await ExamResult.find(filter)
    .populate('studentId', 'name admissionId className section')
    .populate('enteredBy', 'name')
    .sort({ marksObtained: -1 });

  res.json({ results });
});

router.post('/:id/results', protect, authorize('admin', 'teacher'), async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ message: 'Exam not found' });

  const entries = Array.isArray(req.body.results) ? req.body.results : [req.body];
  const saved = [];

  for (const entry of entries) {
    if (!entry.studentId || entry.marksObtained == null) continue;
    const grade =
      entry.grade ||
      (entry.marksObtained / exam.maxMarks >= 0.9
        ? 'A+'
        : entry.marksObtained / exam.maxMarks >= 0.75
          ? 'A'
          : entry.marksObtained / exam.maxMarks >= 0.6
            ? 'B'
            : entry.marksObtained / exam.maxMarks >= 0.4
              ? 'C'
              : 'D');

    const result = await ExamResult.findOneAndUpdate(
      { examId: exam._id, studentId: entry.studentId },
      {
        examId: exam._id,
        studentId: entry.studentId,
        marksObtained: entry.marksObtained,
        grade,
        remarks: entry.remarks,
        enteredBy: req.user._id,
      },
      { upsert: true, new: true }
    );
    saved.push(result);

    await createInAppNotification({
      userId: entry.studentId,
      title: 'Exam result published',
      message: `${exam.title} (${exam.subject}): ${entry.marksObtained}/${exam.maxMarks} (${grade})`,
      type: 'exam',
    });
  }

  res.status(201).json({ results: saved });
});

router.get('/:id', protect, async (req, res) => {
  const exam = await Exam.findById(req.params.id).populate('createdBy', 'name');
  if (!exam) return res.status(404).json({ message: 'Exam not found' });
  res.json({ exam });
});

router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  const allowed = [
    'title',
    'subject',
    'className',
    'section',
    'examDate',
    'maxMarks',
    'durationMinutes',
    'instructions',
    'academicYear',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const exam = await Exam.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!exam) return res.status(404).json({ message: 'Exam not found' });
  res.json({ exam });
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const exam = await Exam.findByIdAndDelete(req.params.id);
  if (!exam) return res.status(404).json({ message: 'Exam not found' });
  await ExamResult.deleteMany({ examId: exam._id });
  res.json({ message: 'Exam deleted' });
});

export default router;
