const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
const { generateToken, authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken'); // Import thêm jwt nếu chưa có
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Cấu hình Nodemailer gửi email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
});

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc.' });

    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length > 0) return res.status(409).json({ success: false, message: 'Email đã được đăng ký.' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, phone, role, is_verified) VALUES (?, ?, ?, ?, "customer", 0)',
      [username || email.split('@')[0], email, hash, phone || null]
    );

    // Tạo token xác thực có thời hạn 15 phút
    const verifyToken = jwt.sign({ email }, process.env.JWT_SECRET || 'My Tour_secret', { expiresIn: '15m' });
    const verifyLink = `${process.env.BASE_URL}/api/auth/verify?token=${verifyToken}`;

    // Gửi email
    const mailOptions = {
      from: `"Mytour.vn" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Xác thực tài khoản Mytour.vn',
      html: `<h3>Chào mừng bạn đến với Mytour.vn!</h3>
             <p>Vui lòng click vào nút bên dưới để xác thực tài khoản của bạn:</p>
             <a href="${verifyLink}" style="padding:10px 20px; background:#D4537E; color:white; text-decoration:none; border-radius:5px;">Xác thực tài khoản</a>
             <p>Link này sẽ hết hạn trong 15 phút.</p>`
    };
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });

    const user = rows[0];
    if (!user.password) return res.status(401).json({ success: false, message: 'Tài khoản này dùng đăng nhập Google.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });

    const token = generateToken({ id: user.id, email: user.email, role: user.role, username: user.username });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Đã đăng xuất.' });
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, phone, role, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── PUT /api/auth/change-password ────────────────────────────
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── GET /api/auth/verify ─────────────────────────────────────
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'My Tour_secret');
    await db.query('UPDATE users SET is_verified = 1 WHERE email = ?', [decoded.email]);
    res.send(`
      <div style="text-align:center; padding:50px; font-family:sans-serif;">
        <h2 style="color:#27ae60;">Xác thực thành công! ✅</h2>
        <p>Tài khoản của bạn đã được kích hoạt.</p>
        <a href="/#home" style="padding:10px 20px; background:#D4537E; color:white; text-decoration:none; border-radius:5px;">Về trang chủ đăng nhập</a>
      </div>
    `);
  } catch (err) {
    res.status(400).send('<h2 style="color:red;text-align:center;padding:50px;">Token không hợp lệ hoặc đã hết hạn ❌</h2>');
  }
});

// Cấu hình Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      let user;
      
      if (rows.length > 0) {
        user = rows[0];
        // Cập nhật oauth_id nếu tài khoản đã tồn tại nhưng chưa liên kết
        if (!user.oauth_id) {
          await db.query('UPDATE users SET oauth_provider = "google", oauth_id = ?, is_verified = 1 WHERE email = ?', [profile.id, email]);
        }
      } else {
        // Tạo tài khoản mới, tài khoản từ Google được coi là đã xác thực (is_verified = 1)
        const [result] = await db.query(
          'INSERT INTO users (username, email, role, oauth_provider, oauth_id, is_verified) VALUES (?, ?, "customer", "google", ?, 1)',
          [profile.displayName, email, profile.id]
        );
        user = { id: result.insertId, email, role: 'customer', username: profile.displayName };
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// ── GET /api/auth/google ─────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// ── GET /api/auth/google/callback ────────────────────────────
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/' }), (req, res) => {
  // Tạo JWT token sau khi Google xác thực thành công
  const token = generateToken({ id: req.user.id, email: req.user.email, role: req.user.role, username: req.user.username });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
  
  // Chuyển hướng người dùng về trang chủ
  res.redirect('/#home'); 
});

module.exports = router;
