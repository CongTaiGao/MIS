-- ============================================================
-- MYTOUR.VN - Database Schema
-- Run this file to initialise the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS mytour_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mytour_db;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(100),
  email        VARCHAR(150) UNIQUE NOT NULL,
  password     VARCHAR(255),
  phone        VARCHAR(20),
  role         ENUM('customer','admin') DEFAULT 'customer',
  oauth_provider VARCHAR(30),
  oauth_id     VARCHAR(100),
  avatar       VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- HOTELS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotels (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  city         VARCHAR(100) NOT NULL,
  address      VARCHAR(300),
  description  TEXT,
  stars        TINYINT DEFAULT 3,
  image_url    VARCHAR(500),
  amenities    JSON,
  is_active    TINYINT(1) DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- ROOMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id     INT NOT NULL,
  room_type    VARCHAR(100) NOT NULL,
  description  TEXT,
  capacity     TINYINT DEFAULT 2,
  price_per_night DECIMAL(12,0) NOT NULL,
  image_url    VARCHAR(500),
  is_available TINYINT(1) DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- BOOKINGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(20) UNIQUE NOT NULL,
  user_id      INT NOT NULL,
  room_id      INT NOT NULL,
  hotel_id     INT NOT NULL,
  check_in     DATE NOT NULL,
  check_out    DATE NOT NULL,
  nights       TINYINT NOT NULL,
  guests       TINYINT DEFAULT 1,
  total_price  DECIMAL(14,0) NOT NULL,
  status       ENUM('pending','confirmed','checked_in','checked_out','cancelled') DEFAULT 'pending',
  notes        TEXT,
  is_paid      TINYINT(1) DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (room_id)  REFERENCES rooms(id)  ON DELETE CASCADE,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- REVIEWS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  hotel_id     INT NOT NULL,
  booking_id   INT NOT NULL,
  rating       TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_review (user_id, booking_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (hotel_id)   REFERENCES hotels(id)   ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- CART (unfinished bookings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  room_id      INT NOT NULL,
  hotel_id     INT NOT NULL,
  check_in     DATE NOT NULL,
  check_out    DATE NOT NULL,
  guests       TINYINT DEFAULT 1,
  added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (room_id)  REFERENCES rooms(id)  ON DELETE CASCADE,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT IGNORE INTO users (username, email, password, role) VALUES
('Admin Mytour', 'admin@mytour.vn', '$2a$10$XKzXLx6kZXq8j8K3pA1mle8LH4vMKkOdVRHjM3hVR9aDUWF/JhRAK', 'admin');
-- password: Admin@123

INSERT IGNORE INTO hotels (name, city, address, description, stars, image_url, amenities) VALUES
('Vinpearl Luxury Landmark 81', 'Hồ Chí Minh', '720A Điện Biên Phủ, Bình Thạnh', 'Khách sạn 5 sao đỉnh cao tại tòa nhà cao nhất Việt Nam với tầm nhìn toàn cảnh TP.HCM.', 5, '/images/hotel1.jpg', '["Hồ bơi vô cực","Gym","Spa","Nhà hàng","Bar tầng thượng","WiFi miễn phí","Bãi đỗ xe"]'),
('Rex Hotel Saigon', 'Hồ Chí Minh', '141 Nguyễn Huệ, Quận 1', 'Khách sạn lịch sử 5 sao ngay trung tâm Phố đi bộ Nguyễn Huệ, biểu tượng Sài Gòn từ 1959.', 5, '/images/hotel2.jpg', '["Hồ bơi ngoài trời","Spa","4 Nhà hàng","Phòng họp","WiFi","Valet parking"]'),
('Caravelle Saigon', 'Hồ Chí Minh', '19-23 Công Trường Lam Sơn, Quận 1', 'Khách sạn 5 sao sang trọng đối diện Nhà hát Lớn TP.HCM, mang đậm phong cách kiến trúc Pháp.', 5, '/images/hotel3.jpg', '["Bar Saigon Saigon","Hồ bơi","Fitness","Spa","WiFi tốc độ cao","Concierge 24/7"]'),
('Novotel Saigon Centre', 'Hồ Chí Minh', '167 Hai Bà Trưng, Quận 3', 'Khách sạn 4 sao hiện đại tại trung tâm thành phố, lý tưởng cho khách công tác và du lịch.', 4, '/images/hotel4.jpg', '["Hồ bơi","Gym","Nhà hàng","Bar","WiFi","Phòng họp"]'),
('InterContinental Đà Nẵng', 'Đà Nẵng', 'Bãi Bắc, Sơn Trà', 'Resort 5 sao trên bán đảo Sơn Trà, bãi biển riêng tuyệt đẹp và thiên nhiên hoang sơ.', 5, '/images/hotel5.jpg', '["Bãi biển riêng","3 Hồ bơi","Spa","Diving","Kayak","WiFi","Nhà hàng The Long Bar"]'),
('Fusion Maia Đà Nẵng', 'Đà Nẵng', 'Võ Nguyên Giáp, Ngũ Hành Sơn', 'Resort 5 sao all-inclusive SPA tại Đà Nẵng với thiết kế biệt thự pool villa sang trọng.', 5, '/images/hotel6.jpg', '["Pool Villa","Unlimited Spa","Bãi biển","Nhà hàng","Bar","Yoga","WiFi"]');

INSERT IGNORE INTO rooms (hotel_id, room_type, description, capacity, price_per_night, is_available) VALUES
(1, 'Phòng Deluxe', 'Phòng Deluxe 45m² với view sông Sài Gòn tuyệt đẹp, giường King-size.', 2, 1250000, 1),
(1, 'Phòng Premier', 'Phòng Premier 55m² view toàn cảnh thành phố, mini bar và bồn tắm.', 2, 1850000, 1),
(1, 'Suite Executive', 'Suite 90m² tầng cao, phòng khách riêng biệt, butler service 24/7.', 3, 3500000, 1),
(2, 'Phòng Superior', 'Phòng Superior 32m² tiện nghi đầy đủ, tầm nhìn ra hồ bơi.', 2, 850000, 1),
(2, 'Phòng Deluxe', 'Phòng Deluxe 40m² view thành phố, ban công riêng.', 2, 1100000, 1),
(3, 'Phòng Deluxe', 'Phòng Deluxe 38m² view Nhà hát Lớn, nội thất cổ điển Pháp.', 2, 1500000, 1),
(3, 'Suite Premier', 'Suite 75m² hướng quảng trường, phòng ăn riêng.', 4, 2800000, 1),
(4, 'Phòng Standard', 'Phòng Standard 28m² hiện đại, đầy đủ tiện nghi.', 2, 650000, 1),
(4, 'Phòng Deluxe', 'Phòng Deluxe 35m² view thành phố, bồn tắm đứng.', 2, 920000, 1),
(5, 'Beach Villa', 'Villa biển 80m² với hồ bơi riêng, trực tiếp ra bãi biển.', 2, 4500000, 1),
(5, 'Ocean View Room', 'Phòng 50m² view biển, ban công rộng.', 2, 2100000, 1),
(6, 'Pool Villa', 'Villa 120m² all-inclusive, hồ bơi riêng, tiếp giáp biển.', 2, 5800000, 1);
