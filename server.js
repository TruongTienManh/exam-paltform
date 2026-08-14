// server.js — Điểm khởi động duy nhất. Setup tối giản, không dùng framework nặng ngoài Express.
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./lib/db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'exam-platform-secret-key-change-if-public', // ứng dụng chạy nội bộ/local — YAGNI: không cần OAuth/JWT phức tạp
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
}));

// Tạo tài khoản Admin mặc định lần đầu chạy (username: admin / password: admin123)
// Giáo viên nên đổi ngay bằng cách xoá data.sqlite và set biến môi trường nếu muốn khác
const seedAdmin = () => {
  const exists = db.prepare('SELECT * FROM admin WHERE id=1').get();
  if (!exists) {
    const pass = process.env.ADMIN_PASSWORD || 'admin123';
    const user = process.env.ADMIN_USERNAME || 'admin';
    db.prepare('INSERT INTO admin (id, username, password_hash) VALUES (1, ?, ?)')
      .run(user, bcrypt.hashSync(pass, 8));
    console.log(`>> Tài khoản Admin mặc định: ${user} / ${pass} (đổi qua biến môi trường ADMIN_USERNAME, ADMIN_PASSWORD)`);
  }
};
seedAdmin();

app.use('/api/admin', require('./routes/admin'));
app.use('/api/student', require('./routes/student'));

// Route trang tĩnh — SPA đơn giản, không cần router phía client (YAGNI)
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/student/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`>> Server chạy tại http://localhost:${PORT}`));
