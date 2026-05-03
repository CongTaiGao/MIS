const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'mytour_secret';

// Verify JWT from Authorization header or cookie
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];
  const tokenFromCookie = req.cookies && req.cookies.token;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
      }
      res.clearCookie('token');
      return res.redirect('/login');
    }
    req.user = user;
    next();
  });
}

// Admin only
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập.' });
    }
    return res.redirect('/');
  }
  next();
}

// Optional auth — sets req.user if token present, but doesn't block
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];
  const tokenFromCookie = req.cookies && req.cookies.token;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

module.exports = { authenticateToken, requireAdmin, optionalAuth, generateToken };
