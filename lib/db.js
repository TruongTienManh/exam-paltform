// db.js — Toàn bộ schema nằm 1 chỗ, dùng SQLite file (không cần cài đặt DB server phức tạp)
// Bước 3 (Native): dùng better-sqlite3 (driver gốc, sync, không cần ORM nặng nề vì scope nhỏ - YAGNI)
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.sqlite'));
db.pragma('journal_mode = WAL');

// Bước 1 (YAGNI): chỉ 5 bảng đúng đủ cho 4 nghiệp vụ cốt lõi, không thêm bảng thừa
db.exec(`
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_plain TEXT NOT NULL,   -- lưu để Admin in phiếu phát cho học sinh (yêu cầu nghiệp vụ)
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  max_attempts INTEGER NOT NULL,
  is_open INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  choices_json TEXT NOT NULL,     -- JSON mảng string đáp án
  correct_index INTEGER NOT NULL  -- vị trí đáp án đúng trong choices_json gốc
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_order_json TEXT NOT NULL,   -- thứ tự câu hỏi đã shuffle (mảng question_id)
  shuffle_map_json TEXT NOT NULL,      -- map question_id -> mảng thứ tự index đáp án đã shuffle
  answers_json TEXT DEFAULT '{}',      -- học sinh chọn: {question_id: chosen_shuffled_index}
  started_at TEXT DEFAULT (datetime('now')),
  submitted_at TEXT,
  score REAL
);
`);

module.exports = db;
