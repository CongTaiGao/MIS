const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ============================================================
// REVIEWS
// ============================================================

// POST /api/reviews
router.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const { hotel_id, booking_id, rating, comment } = req.body;
    if (!hotel_id || !booking_id || !rating) return res.status(400).json({ success: false, message: 'Thiếu thông tin đánh giá.' });

    // Verify booking belongs to user and is paid
    const [bookings] = await db.query(
      "SELECT id FROM bookings WHERE id = ? AND user_id = ? AND is_paid = 1 AND status IN ('checked_out','confirmed')",
      [booking_id, req.user.id]
    );
    if (bookings.length === 0) return res.status(403).json({ success: false, message: 'Bạn chỉ có thể đánh giá sau khi hoàn thành đặt phòng.' });

    await db.query(
      'INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)',
      [req.user.id, hotel_id, booking_id, rating, comment || null]
    );
    res.json({ success: true, message: 'Cảm ơn bạn đã đánh giá!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ============================================================
// CART
// ============================================================

// GET /api/cart
router.get('/cart', authenticateToken, async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT c.*, h.name AS hotel_name, h.city, h.image_url,
             r.room_type, r.price_per_night,
             DATEDIFF(c.check_out, c.check_in) AS nights
      FROM cart c
      JOIN hotels h ON h.id = c.hotel_id
      JOIN rooms  r ON r.id = c.room_id
      WHERE c.user_id = ?
      ORDER BY c.added_at DESC
    `, [req.user.id]);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// POST /api/cart
router.post('/cart', authenticateToken, async (req, res) => {
  try {
    const { room_id, hotel_id, check_in, check_out, guests = 1 } = req.body;
    if (!room_id || !hotel_id || !check_in || !check_out) return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });

    await db.query(
      `INSERT INTO cart (user_id, room_id, hotel_id, check_in, check_out, guests)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE check_in=VALUES(check_in), check_out=VALUES(check_out), guests=VALUES(guests)`,
      [req.user.id, room_id, hotel_id, check_in, check_out, guests]
    );
    res.json({ success: true, message: 'Đã thêm vào giỏ hàng!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// DELETE /api/cart/:id
router.delete('/cart/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Đã xoá khỏi giỏ hàng.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ============================================================
// ADMIN DASHBOARD
// ============================================================

// GET /api/admin/dashboard
router.get('/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [[{ total_bookings }]] = await db.query('SELECT COUNT(*) AS total_bookings FROM bookings');
    const [[{ total_revenue }]] = await db.query("SELECT COALESCE(SUM(total_price),0) AS total_revenue FROM bookings WHERE is_paid = 1");
    const [[{ total_users }]]   = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role = 'customer'");
    const [[{ total_hotels }]]  = await db.query('SELECT COUNT(*) AS total_hotels FROM hotels WHERE is_active = 1');
    const [[{ today_bookings }]] = await db.query('SELECT COUNT(*) AS today_bookings FROM bookings WHERE DATE(created_at) = CURDATE()');

    // Weekly chart data (last 7 days)
    const [weekly] = await db.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS count, COALESCE(SUM(total_price),0) AS revenue
      FROM bookings
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);

    // Recent bookings
    const [recent] = await db.query(`
      SELECT b.id, b.booking_code, b.total_price, b.status, b.created_at,
             u.username, u.email, h.name AS hotel_name
      FROM bookings b
      JOIN users  u ON u.id = b.user_id
      JOIN hotels h ON h.id = b.hotel_id
      ORDER BY b.created_at DESC LIMIT 10
    `);

    res.json({
      success: true,
      stats: { total_bookings, total_revenue, total_users, total_hotels, today_bookings },
      weekly,
      recent
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// GET /api/admin/users
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, email, phone, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// GET /api/rooms (for admin hotel management)
router.get('/rooms/:hotel_id', async (req, res) => {
  try {
    const [rooms] = await db.query('SELECT * FROM rooms WHERE hotel_id = ? ORDER BY price_per_night', [req.params.hotel_id]);
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// POST /api/rooms (admin add room)
router.post('/rooms', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { hotel_id, room_type, description, capacity, price_per_night } = req.body;
    const [result] = await db.query(
      'INSERT INTO rooms (hotel_id, room_type, description, capacity, price_per_night) VALUES (?,?,?,?,?)',
      [hotel_id, room_type, description, capacity || 2, price_per_night]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── ADMIN: PUT /api/admin/users/:id (Sửa người dùng) ─────────
router.put('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, phone, role } = req.body;
    
    // Chỉ cho phép 2 role hợp lệ
    const validRoles = ['customer', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ.' });
    }

    await db.query(
      `UPDATE users SET 
         username = COALESCE(?, username), 
         email = COALESCE(?, email), 
         phone = COALESCE(?, phone), 
         role = COALESCE(?, role) 
       WHERE id = ?`,
      [username, email, phone, role, req.params.id]
    );
    res.json({ success: true, message: 'Cập nhật người dùng thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── ADMIN: DELETE /api/admin/users/:id (Xoá người dùng) ──────
router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Chặn admin tự xoá chính mình để tránh lỗi
    if (req.user.id == req.params.id) {
      return res.status(400).json({ success: false, message: 'Bạn không thể xoá tài khoản của chính mình.' });
    }
    
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã xoá người dùng.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});
  
module.exports = router;
