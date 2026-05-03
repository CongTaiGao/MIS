const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ── GET /api/hotels ──────────────────────────────────────────
// Query params: city, minPrice, maxPrice, stars, page, limit
router.get('/', async (req, res) => {
  try {
    const { city, minPrice, maxPrice, stars, page = 1, limit = 12, q } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT h.*,
             MIN(r.price_per_night) AS min_price,
             MAX(r.price_per_night) AS max_price,
             ROUND(AVG(rv.rating), 1) AS avg_rating,
             COUNT(DISTINCT rv.id)   AS review_count
      FROM hotels h
      LEFT JOIN rooms r   ON r.hotel_id = h.id AND r.is_available = 1
      LEFT JOIN reviews rv ON rv.hotel_id = h.id
      WHERE h.is_active = 1
    `;
    const params = [];

    if (city) { sql += ' AND h.city LIKE ?'; params.push(`%${city}%`); }
    if (q)    { sql += ' AND (h.name LIKE ? OR h.city LIKE ? OR h.address LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (stars) { sql += ' AND h.stars = ?'; params.push(parseInt(stars)); }

    sql += ' GROUP BY h.id';

    if (minPrice) { sql += ' HAVING min_price >= ?'; params.push(parseInt(minPrice)); }
    if (maxPrice) { sql += (minPrice ? ' AND' : ' HAVING') + ' min_price <= ?'; params.push(parseInt(maxPrice)); }

    sql += ` ORDER BY avg_rating DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const [hotels] = await db.query(sql, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM hotels WHERE is_active = 1');

    res.json({ success: true, hotels, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── GET /api/hotels/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [hotels] = await db.query('SELECT * FROM hotels WHERE id = ? AND is_active = 1', [req.params.id]);
    if (hotels.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });

    const hotel = hotels[0];
    if (hotel.amenities && typeof hotel.amenities === 'string') {
      try { hotel.amenities = JSON.parse(hotel.amenities); } catch { hotel.amenities = []; }
    }

    const [rooms] = await db.query(
      'SELECT * FROM rooms WHERE hotel_id = ? AND is_available = 1 ORDER BY price_per_night',
      [req.params.id]
    );

    const [reviews] = await db.query(`
      SELECT rv.*, u.username, u.avatar
      FROM reviews rv
      JOIN users u ON u.id = rv.user_id
      WHERE rv.hotel_id = ?
      ORDER BY rv.created_at DESC
      LIMIT 10
    `, [req.params.id]);

    const [[stats]] = await db.query(
      'SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS total FROM reviews WHERE hotel_id = ?',
      [req.params.id]
    );

    res.json({ success: true, hotel, rooms, reviews, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── ADMIN: POST /api/hotels ──────────────────────────────────
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, city, address, description, stars, image_url, amenities } = req.body;
    if (!name || !city) return res.status(400).json({ success: false, message: 'Tên và thành phố là bắt buộc.' });
    const amenitiesJson = JSON.stringify(amenities || []);
    const [result] = await db.query(
      'INSERT INTO hotels (name, city, address, description, stars, image_url, amenities) VALUES (?,?,?,?,?,?,?)',
      [name, city, address, description, stars || 3, image_url, amenitiesJson]
    );
    res.status(201).json({ success: true, message: 'Thêm khách sạn thành công!', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── ADMIN: PUT /api/hotels/:id ───────────────────────────────
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, city, address, description, stars, image_url, amenities, is_active } = req.body;
    const amenitiesJson = amenities ? JSON.stringify(amenities) : undefined;
    await db.query(
      `UPDATE hotels SET
         name=COALESCE(?,name), city=COALESCE(?,city), address=COALESCE(?,address),
         description=COALESCE(?,description), stars=COALESCE(?,stars),
         image_url=COALESCE(?,image_url),
         amenities=COALESCE(?,amenities),
         is_active=COALESCE(?,is_active)
       WHERE id=?`,
      [name, city, address, description, stars, image_url, amenitiesJson, is_active, req.params.id]
    );
    res.json({ success: true, message: 'Cập nhật thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// ── ADMIN: DELETE /api/hotels/:id ────────────────────────────
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE hotels SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã xoá khách sạn.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

module.exports = router;
