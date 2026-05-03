const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

function genCode() {
  return 'MT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2,4).toUpperCase();
}

// ── POST /api/bookings ───────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { room_id, hotel_id, check_in, check_out, guests = 1, notes } = req.body;
    if (!room_id || !hotel_id || !check_in || !check_out) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin đặt phòng.' });
    }

    const checkIn  = new Date(check_in);
    const checkOut = new Date(check_out);
    if (checkOut <= checkIn) return res.status(400).json({ success: false, message: 'Ngày trả phòng phải sau ngày nhận phòng.' });

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    const [rooms] = await db.query('SELECT * FROM rooms WHERE id = ? AND hotel_id = ? AND is_available = 1', [room_id, hotel_id]);
    if (rooms.length === 0) return res.status(404).json({ success: false, message: 'Phòng không khả dụng.' });

    const room = rooms[0];
    const total_price = room.price_per_night * nights;
    const booking_code = genCode();

    const [result] = await db.query(
      `INSERT INTO bookings (booking_code, user_id, room_id, hotel_id, check_in, check_out, nights, guests, total_price, notes, status, is_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [booking_code, req.user.id, room_id, hotel_id, check_in, check_out, nights, guests, total_price, notes || null]
    );

    // Remove from cart if present
    await db.query('DELETE FROM cart WHERE user_id = ? AND room_id = ? AND hotel_id = ?', [req.user.id, room_id, hotel_id]);

    res.status(201).json({
      success: true,
      message: 'Đặt phòng thành công!',
      booking: { id: result.insertId, booking_code, total_price, nights, status: 'pending' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── POST /api/bookings/:id/pay (mock payment) ────────────────
router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt phòng.' });

    await db.query("UPDATE bookings SET is_paid = 1, status = 'confirmed' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Thanh toán thành công! (Mock)', booking_code: rows[0].booking_code });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── GET /api/bookings/my ─────────────────────────────────────
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT b.*, h.name AS hotel_name, h.city, h.image_url AS hotel_image,
             r.room_type, r.price_per_night
      FROM bookings b
      JOIN hotels h ON h.id = b.hotel_id
      JOIN rooms  r ON r.id = b.room_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── GET /api/bookings/:id ────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, h.name AS hotel_name, h.city, h.address, h.image_url,
             r.room_type, r.description AS room_description
      FROM bookings b
      JOIN hotels h ON h.id = b.hotel_id
      JOIN rooms  r ON r.id = b.room_id
      WHERE b.id = ? AND (b.user_id = ? OR ? = 'admin')
    `, [req.params.id, req.user.id, req.user.role]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn.' });
    res.json({ success: true, booking: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── DELETE /api/bookings/:id (cancel) ───────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn.' });
    if (rows[0].status === 'checked_in') return res.status(400).json({ success: false, message: 'Không thể huỷ khi đã nhận phòng.' });

    await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Đã huỷ đặt phòng.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── ADMIN: GET /api/bookings ─────────────────────────────────
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = `
      SELECT b.*, u.username, u.email, h.name AS hotel_name, r.room_type
      FROM bookings b
      JOIN users  u ON u.id = b.user_id
      JOIN hotels h ON h.id = b.hotel_id
      JOIN rooms  r ON r.id = b.room_id
    `;
    const params = [];
    if (status) { sql += ' WHERE b.status = ?'; params.push(status); }
    sql += ` ORDER BY b.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    const [bookings] = await db.query(sql, params);
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── ADMIN: PUT /api/bookings/:id/status ─────────────────────
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','checked_in','checked_out','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
    await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Cập nhật trạng thái thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

module.exports = router;
