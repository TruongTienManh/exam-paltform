// auth.js — Middleware phân quyền. Chỉ 2 vai trò: admin | student (Bước 1: YAGNI, không multi-level role)
const requireAdmin = (req, res, next) => {
  if (req.session.role === 'admin') return next();
  return res.status(401).json({ ok: false, error: 'Chưa đăng nhập' });
};

const requireStudent = (req, res, next) => {
  if (req.session.role === 'student') return next();
  return res.status(401).json({ ok: false, error: 'Chưa đăng nhập' });
};

module.exports = { requireAdmin, requireStudent };
