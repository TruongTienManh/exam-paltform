// accounts.js — Sinh tài khoản/mật khẩu hàng loạt cho học sinh (thuần logic, tách khỏi route/UI)
const bcrypt = require('bcryptjs');

// Sinh username không dấu, không trùng: hocsinh + số thứ tự (đơn giản, dễ đọc để GV phát cho HS)
const slug = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');

const randomPassword = () => Math.random().toString(36).slice(-8); // 8 ký tự đủ dễ gõ cho học sinh

// Chuẩn bị dữ liệu insert cho N học sinh — không tự tay lặp SQL insert nhiều nơi (tái sử dụng)
const buildAccountsBatch = (names, className, existingUsernames) => {
  const used = new Set(existingUsernames);
  return names.map((full_name, i) => {
    let base = slug(full_name.split(' ').pop() || `hs${i}`) + (i + 1);
    let username = base;
    let n = 1;
    while (used.has(username)) username = `${base}${n++}`; // đảm bảo không trùng username
    used.add(username);
    const password_plain = randomPassword();
    return {
      full_name,
      class_name: className,
      username,
      password_plain,
      password_hash: bcrypt.hashSync(password_plain, 8),
    };
  });
};

module.exports = { buildAccountsBatch, randomPassword };
