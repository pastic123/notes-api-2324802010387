const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

const DUMMY_HASH = bcrypt.hashSync('khong-phai-mat-khau-that', 10);

function readCredentials(body) {
  const { email, password } = body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return null;
  return { email: email.toLowerCase().trim(), password };
}

router.post('/register', async (req, res) => {
  const cred = readCredentials(req.body);
  if (!cred) return res.status(400).json({ error: 'Cần email hợp lệ và mật khẩu từ 8 ký tự' });
  if (await User.exists({ email: cred.email })) {
    return res.status(409).json({ error: 'Email đã được đăng ký' });
  }
  const passwordHash = await bcrypt.hash(cred.password, 10);
  const user = await User.create({ email: cred.email, passwordHash });
  res.status(201).json({ id: user._id, email: user.email });
});

router.post('/login', async (req, res) => {
  const cred = readCredentials(req.body);
  const user = cred && (await User.findOne({ email: cred.email }));
  const ok = await bcrypt.compare(cred ? cred.password : 'x', user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
  res.json({ token });
});

module.exports = router;
