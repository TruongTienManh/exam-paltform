// routes/admin.js — API cho Admin (Giáo viên). Toàn quyền: tài khoản HS, đề thi, thống kê.
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../lib/db');
const { requireAdmin } = require('../lib/auth');
const { buildAccountsBatch } = require('../lib/accounts');
const { gradeAttempt } = require('../lib/shuffle');

const router = express.Router();

// ---- Đăng nhập Admin (không có "quên mật khẩu" / verify email — YAGNI Bước 1) ----
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if (admin && bcrypt.compareSync(password, admin.password_hash)) {
    req.session.role = 'admin';
    req.session.adminId = admin.id;
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Sai tài khoản hoặc mật khẩu' });
});

router.post('/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });

router.use(requireAdmin); // mọi route bên dưới bắt buộc phải là admin

// ---- Sinh tài khoản học sinh hàng loạt ----
router.post('/students/generate', (req, res) => {
  const { names, class_name } = req.body; // names: mảng họ tên, mỗi dòng 1 học sinh
  const existing = db.prepare('SELECT username FROM students').all().map(r => r.username);
  const batch = buildAccountsBatch(names.filter(Boolean), class_name, existing);
  const insert = db.prepare(`INSERT INTO students (full_name, class_name, username, password_plain, password_hash)
    VALUES (@full_name, @class_name, @username, @password_plain, @password_hash)`);
  const insertMany = db.transaction((rows) => rows.forEach(r => insert.run(r))); // native transaction, nhanh & an toàn
  insertMany(batch);
  res.json({ ok: true, accounts: batch.map(({ full_name, username, password_plain }) => ({ full_name, username, password_plain })) });
});

router.get('/students', (req, res) => {
  res.json(db.prepare('SELECT id, full_name, class_name, username, password_plain FROM students ORDER BY class_name, full_name').all());
});

router.delete('/students/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Quản lý đề thi + ngân hàng câu hỏi ----
router.post('/exams', (req, res) => {
  const { title, duration_minutes, max_attempts } = req.body;
  const r = db.prepare('INSERT INTO exams (title, duration_minutes, max_attempts) VALUES (?,?,?)')
    .run(title, duration_minutes, max_attempts);
  res.json({ ok: true, id: r.lastInsertRowid });
});

router.get('/exams', (req, res) => {
  res.json(db.prepare('SELECT * FROM exams ORDER BY created_at DESC').all());
});

router.patch('/exams/:id', (req, res) => {
  const { is_open, duration_minutes, max_attempts } = req.body;
  db.prepare('UPDATE exams SET is_open=?, duration_minutes=?, max_attempts=? WHERE id=?')
    .run(is_open, duration_minutes, max_attempts, req.params.id);
  res.json({ ok: true });
});

// Upload câu hỏi hàng loạt — mỗi câu: {content, choices:[...], correct_index}
router.post('/exams/:id/questions', (req, res) => {
  const { questions } = req.body;
  const insert = db.prepare('INSERT INTO questions (exam_id, content, choices_json, correct_index) VALUES (?,?,?,?)');
  const insertMany = db.transaction((rows) => rows.forEach(q =>
    insert.run(req.params.id, q.content, JSON.stringify(q.choices), q.correct_index)));
  insertMany(questions);
  res.json({ ok: true, count: questions.length });
});

router.get('/exams/:id/questions', (req, res) => {
  res.json(db.prepare('SELECT * FROM questions WHERE exam_id = ?').all(req.params.id));
});

router.delete('/questions/:id', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Dashboard Thống kê: điểm số, tiến độ từng em & mặt bằng lớp ----
router.get('/dashboard/:examId', (req, res) => {
  const examId = req.params.examId;
  const attempts = db.prepare(`
    SELECT a.id, a.student_id, a.score, a.submitted_at, a.started_at,
           s.full_name, s.class_name
    FROM attempts a JOIN students s ON s.id = a.student_id
    WHERE a.exam_id = ? ORDER BY a.submitted_at DESC
  `).all(examId);

  const submitted = attempts.filter(a => a.submitted_at && a.score !== null);
  const avg = submitted.length ? submitted.reduce((s, a) => s + a.score, 0) / submitted.length : 0;
  const max = submitted.length ? Math.max(...submitted.map(a => a.score)) : 0;
  const min = submitted.length ? Math.min(...submitted.map(a => a.score)) : 0;

  // Phân bố điểm theo khoảng (0-2,2-4,...8-10) để vẽ biểu đồ cột — tính sẵn ở backend, UI chỉ render
  const buckets = [0, 0, 0, 0, 0];
  submitted.forEach(a => { const idx = Math.min(4, Math.floor(a.score / 2)); buckets[idx]++; }); // thang điểm 10 -> 5 khoảng

  res.json({
    attempts,
    stats: { count: submitted.length, avg: Math.round(avg * 100) / 100, max, min, buckets },
  });
});

// Danh sách toàn bộ lịch sử làm bài của 1 học sinh (theo dõi tiến bộ qua các đề)
router.get('/students/:id/history', (req, res) => {
  const rows = db.prepare(`
    SELECT a.score, a.submitted_at, e.title, e.id as exam_id
    FROM attempts a JOIN exams e ON e.id = a.exam_id
    WHERE a.student_id = ? AND a.submitted_at IS NOT NULL
    ORDER BY a.submitted_at ASC
  `).all(req.params.id);
  res.json(rows);
});

module.exports = router;
