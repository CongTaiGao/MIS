# 🏨 Mytour.vn — Hệ thống đặt phòng khách sạn trực tuyến

Thực hiện:
- Cao Thông Thái (Deploy và vận hành)
- Nguyễn Bá Vượng (Code chính)

> **Đồ án TMĐT** — Framework: Node.js + Express · Database: MySQL · Frontend: Vanilla JS SPA · Deploy: Vercel / Railway / Render

---

## 📁 Cấu trúc dự án

```
mytour/
├── server.js                    # Entry point Express
├── package.json
├── .env.example                 # Biến môi trường mẫu
├── vercel.json                  # Config deploy Vercel
├── Dockerfile                   # Config deploy Railway/Render
│
├── backend/
│   ├── config/
│   │   ├── db.js                # MySQL connection pool
│   │   └── schema.sql           # DDL + seed data
│   ├── middleware/
│   │   └── auth.js              # JWT middleware
│   └── routes/
│       ├── auth.js              # Đăng ký / Đăng nhập / JWT
│       ├── hotels.js            # CRUD khách sạn
│       ├── bookings.js          # Đặt phòng / thanh toán mock
│       └── misc.js              # Reviews / Cart / Admin dashboard
│
└── frontend/
    └── public/
        ├── index.html           # HTML shell (SPA)
        ├── css/
        │   └── style.css        # Design System toàn bộ
        └── js/
            └── app.js           # SPA Router + tất cả trang
```

---

## 🚀 Cài đặt và chạy local

### Yêu cầu
- Node.js >= 18
- MySQL >= 8.0

### Bước 1 — Clone & cài packages
```bash
git clone https://github.com/your-username/mytour-vn.git
cd mytour-vn
npm install
```

### Bước 2 — Tạo database
```bash
mysql -u root -p < backend/config/schema.sql
```

### Bước 3 — Cấu hình môi trường
```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin DB và JWT secret của bạn
```

### Bước 4 — Chạy server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Truy cập: **http://localhost:3000**

---

## 🌐 Deploy lên cloud miễn phí

### Option 1: Vercel + PlanetScale (MySQL)

```bash
# 1. Tạo DB miễn phí tại: https://planetscale.com
# 2. Copy DATABASE_URL vào biến môi trường Vercel
# 3. Deploy:
npm i -g vercel
vercel --prod
```

### Option 2: Railway (All-in-one)

```bash
# 1. Tạo tài khoản tại: https://railway.app
# 2. New Project → Deploy from GitHub
# 3. Add MySQL plugin
# 4. Set environment variables từ .env.example
# 5. Deploy tự động khi push lên GitHub
```

### Option 3: Render + Render PostgreSQL

```bash
# 1. Push code lên GitHub
# 2. Tạo account tại: https://render.com
# 3. New Web Service → Connect GitHub repo
# 4. Build Command: npm install
# 5. Start Command: node server.js
# 6. Add MySQL database (hoặc dùng Railway MySQL)
```

---

## 🔑 API Endpoints

### Auth
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập → JWT cookie |
| POST | `/api/auth/logout` | Đăng xuất |
| GET  | `/api/auth/me` | Thông tin user hiện tại |
| PUT  | `/api/auth/change-password` | Đổi mật khẩu |

### Khách sạn
| Method | URL | Mô tả |
|--------|-----|-------|
| GET  | `/api/hotels` | Danh sách (filter: city, stars, price, q) |
| GET  | `/api/hotels/:id` | Chi tiết + phòng + reviews |
| POST | `/api/hotels` | Thêm mới (admin) |
| PUT  | `/api/hotels/:id` | Cập nhật (admin) |
| DELETE | `/api/hotels/:id` | Ẩn khách sạn (admin) |

### Đặt phòng
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/bookings` | Tạo đặt phòng mới |
| GET  | `/api/bookings/my` | Lịch sử của user |
| POST | `/api/bookings/:id/pay` | Thanh toán mock |
| DELETE | `/api/bookings/:id` | Huỷ đặt phòng |
| GET  | `/api/bookings` | Tất cả đơn (admin) |
| PUT  | `/api/bookings/:id/status` | Cập nhật trạng thái (admin) |

### Khác
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/reviews` | Đánh giá khách sạn |
| GET  | `/api/cart` | Xem giỏ hàng |
| POST | `/api/cart` | Thêm vào giỏ |
| DELETE | `/api/cart/:id` | Xóa khỏi giỏ |
| GET  | `/api/admin/dashboard` | Thống kê tổng quan (admin) |
| GET  | `/api/admin/users` | Danh sách user (admin) |

---

## 👤 Tài khoản mặc định (sau khi chạy seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mytour.vn | Admin@123 |

---

## 🎯 Các tính năng đã triển khai

### Module Khách hàng ✅
- [x] Đăng ký / Đăng nhập (JWT + cookie)
- [x] OAuth Google (cấu hình trong .env)
- [x] Tìm kiếm & lọc khách sạn (tên, thành phố, sao, giá)
- [x] Giỏ hàng (thêm, xóa, xem)
- [x] Đặt phòng + Thanh toán mock
- [x] Lịch sử đơn hàng
- [x] Huỷ đặt phòng
- [x] Đánh giá & nhận xét
- [x] Đổi mật khẩu

### Module Quản trị (Admin) ✅
- [x] Dashboard tổng quan (stats, biểu đồ, đơn gần đây)
- [x] CRUD khách sạn (thêm, sửa, ẩn/hiện)
- [x] Quản lý đơn đặt phòng (xem, cập nhật trạng thái)
- [x] Danh sách người dùng

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express.js 4 |
| Database | MySQL 8 / MariaDB |
| Auth | JWT + bcrypt + Passport.js |
| Frontend | Vanilla JS SPA (Hash Router) |
| CSS | Custom Design System (CSS Variables) |
| Deploy | Vercel / Railway / Render + Docker |

---

## 📐 Figma Design System

Link Figma (view-only): `https://figma.com/file/[your-link]`

**Màu sắc chủ đạo:**
- Primary: `#D4537E`
- Primary Dark: `#993556`
- Primary Light: `#FBEAF0`

**8 màn hình thiết kế:**
1. Trang chủ (Hero + Search + Featured Hotels)
2. Danh sách khách sạn (Filter + Grid)
3. Chi tiết khách sạn (Gallery + Booking Sidebar)
4. Đăng nhập / Đăng ký
5. Giỏ hàng
6. Thanh toán (Checkout)
7. Xác nhận đặt phòng
8. Dashboard khách hàng (Profile + Lịch sử)
9. Trang Admin (Sidebar + Dashboard + Tables)
