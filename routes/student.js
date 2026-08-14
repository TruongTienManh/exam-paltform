// routes/student.js — Không gian làm bài của học sinh. Không có đăng ký (YAGNI Bước 1).
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../lib/db');
const { requireStudent } = require('../lib/auth');
const { generateShuffledAttempt, buildExamView, gradeAttempt } = require('../lib/shuffle');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const student = db.prepare('SELECT * FROM students WHERE username = ?').get(username);
  if (student && bcrypt.compareSync(password, student.password_hash)) {
    req.session.role = 'student';
    req.session.studentId = student.id;
    return res.json({ ok: true, name: student.full_name });
  }
  res.status(401).json({ ok: false, error: 'Sai tài khoản hoặc mật khẩu' });
});

router.post('/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });

router.use(requireStudent);

// Danh sách đề đang mở cho học sinh, kèm số lượt đã làm / còn lại
router.get('/exams', (req, res) => {
  const sid = req.session.studentId;
  const exams = db.prepare('SELECT * FROM exams WHERE is_open = 1').all();
  const withUsage = exams.map(e => {
    const used = db.prepare('SELECT COUNT(*) c FROM attempts WHERE exam_id=? AND student_id=?').get(e.id, sid).c;
    return { ...e, attempts_used: used, attempts_left: Math.max(0, e.max_attempts - used) };
  });
  res.json(withUsage);
});

// Bắt đầu làm bài: kiểm tra giới hạn lượt (Business rule bắt buộc), rồi sinh đề trộn riêng cho HS này
router.post('/exams/:id/start', (req, res) => {
  const sid = req.session.studentId;
  const examId = req.params.id;
  const exam = db.prepare('SELECT * FROM exams WHERE id=? AND is_open=1').get(examId);
  if (!exam) return res.status(404).json({ ok: false, error: 'Đề thi không tồn tại hoặc đã đóng' });

  const used = db.prepare('SELECT COUNT(*) c FROM attempts WHERE exam_id=? AND student_id=?').get(examId, sid).c;
  if (used >= exam.max_attempts) return res.status(403).json({ ok: false, error: 'Đã hết số lượt làm bài cho phép' });

  const questions = db.prepare('SELECT * FROM questions WHERE exam_id=?').all(examId);
  const { questionOrder, shuffleMap } = generateShuffledAttempt(questions);
  const r = db.prepare(`INSERT INTO attempts (exam_id, student_id, question_order_json, shuffle_map_json)
    VALUES (?,?,?,?)`).run(examId, sid, JSON.stringify(questionOrder), JSON.stringify(shuffleMap));

  res.json({ ok: true, attempt_id: r.lastInsertRowid, duration_minutes: exam.duration_minutes });
});

// Lấy nội dung đề đã trộn (không lộ đáp án đúng) để hiển thị cho học sinh làm bài
router.get('/attempts/:id', (req, res) => {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id=? AND student_id=?').get(req.params.id, req.session.studentId);
  if (!attempt) return res.status(404).json({ ok: false });
  if (attempt.submitted_at) return res.status(400).json({ ok: false, error: 'Bài đã nộp' });

  const questions = db.prepare('SELECT * FROM questions WHERE exam_id=?').all(attempt.exam_id);
  const exam = db.prepare('SELECT duration_minutes FROM exams WHERE id=?').get(attempt.exam_id);
  const view = buildExamView(questions, attempt);

  // Tính thời gian còn lại dựa trên started_at để chống gian lận khi reload trang
  const elapsedMs = Date.now() - new Date(attempt.started_at + 'Z').getTime();
  const remainingSec = Math.max(0, exam.duration_minutes * 60 - Math.floor(elapsedMs / 1000));

  res.json({ ok: true, questions: view, remaining_seconds: remainingSec });
});

// Lưu tạm đáp án (autosave khi học sinh chọn, tránh mất dữ liệu nếu mất mạng)
router.patch('/attempts/:id/answer', (req, res) => {
  const { question_id, chosen_index } = req.body;
  const attempt = db.prepare('SELECT * FROM attempts WHERE id=? AND student_id=?').get(req.params.id, req.session.studentId);
  if (!attempt || attempt.submitted_at) return res.status(400).json({ ok: false });
  const answers = JSON.parse(attempt.answers_json);
  answers[question_id] = chosen_index;
  db.prepare('UPDATE attempts SET answers_json=? WHERE id=?').run(JSON.stringify(answers), req.params.id);
  res.json({ ok: true });
});

// Nộp bài -> chấm điểm ngay bằng lib/shuffle.gradeAttempt (tái dùng logic, không viết lại ở đây)
router.post('/attempts/:id/submit', (req, res) => {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id=? AND student_id=?').get(req.params.id, req.session.studentId);
  if (!attempt || attempt.submitted_at) return res.status(400).json({ ok: false });
  const questions = db.prepare('SELECT * FROM questions WHERE exam_id=?').all(attempt.exam_id);
  const score = gradeAttempt(questions, attempt);
  db.prepare("UPDATE attempts SET submitted_at=datetime('now'), score=? WHERE id=?").run(score, req.params.id);
  res.json({ ok: true, score });
});

module.exports = router;
