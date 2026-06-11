-- ============================================================
-- Pure Vitality Market — Database Schema
-- MySQL 8.0+
-- Chay: mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS mila_market CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mila_market;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE,
  phone         VARCHAR(15)  UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('customer','staff','admin') NOT NULL DEFAULT 'customer',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  avatar_url    VARCHAR(500),
  address       TEXT,
  otp_secret    VARCHAR(255) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_phone (phone)
) ENGINE=InnoDB;


-- ============================================================
-- 2. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(120) NOT NULL UNIQUE,
  icon       VARCHAR(10),
  parent_id  INT UNSIGNED,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 3. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED NOT NULL,
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(220) NOT NULL UNIQUE,
  description  TEXT,
  price        DECIMAL(12,0) NOT NULL,
  sale_price   DECIMAL(12,0),
  unit         VARCHAR(20) NOT NULL DEFAULT 'kg',
  stock        INT NOT NULL DEFAULT 0,
  images       JSON,
  is_featured  TINYINT(1) NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  sold_count   INT NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_category (category_id),
  INDEX idx_featured (is_featured),
  FULLTEXT idx_search (name, description)
) ENGINE=InnoDB;

-- ============================================================
-- 4. CART ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_product (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 5. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  status           ENUM('pending','confirmed','processing','shipping','delivered','cancelled') NOT NULL DEFAULT 'pending',
  shipping_address JSON NOT NULL,
  total_amount     DECIMAL(14,0) NOT NULL,
  note             TEXT,
  cancelled_reason VARCHAR(300),
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- 6. ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT NOT NULL,
  unit_price DECIMAL(12,0) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ============================================================
-- 7. REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(128) NOT NULL UNIQUE,
  ip_address  VARCHAR(45),
  device_info VARCHAR(300),
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_token (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. OTP CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone      VARCHAR(15),
  email      VARCHAR(150),
  otp_hash   VARCHAR(128) NOT NULL,
  purpose    ENUM('register','forgot_password','payment') NOT NULL,
  attempts   TINYINT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- 9. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED,
  action        VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   INT UNSIGNED,
  ip_address    VARCHAR(45),
  user_agent    VARCHAR(300),
  payload       JSON,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user   (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin account (password: Admin@123)
INSERT IGNORE INTO users (name, email, phone, password_hash, role) VALUES
('Admin Mila', 'admin@milamarket.vn', '0900000001', '$2b$12$V.P2NihyRZaI7.z7YfSZL.2a36RHo//Ma.y8RusjeVL3HaXS.3kSi', 'admin'),
('Nhan Vien 1', 'staff@milamarket.vn', '0900000002', '$2b$12$V.P2NihyRZaI7.z7YfSZL.2a36RHo//Ma.y8RusjeVL3HaXS.3kSi', 'staff'),
('Khach Hang Demo', 'demo@gmail.com', '0901234567', '$2b$12$V.P2NihyRZaI7.z7YfSZL.2a36RHo//Ma.y8RusjeVL3HaXS.3kSi', 'customer');

-- Categories
INSERT IGNORE INTO categories (id, name, slug, icon, sort_order) VALUES
(1, 'Rau xanh', 'rau-xanh', '🥬', 1),
(2, 'Cu qua', 'cu-qua', '🥕', 2),
(3, 'Trai cay', 'trai-cay', '🍎', 3),
(4, 'Thit tuoi', 'thit-tuoi', '🥩', 4),
(5, 'Hai san', 'hai-san', '🦐', 5),
(6, 'Trung & sua', 'trung-sua', '🥚', 6);

-- Products
INSERT IGNORE INTO products (category_id, name, slug, description, price, sale_price, unit, stock, images, is_featured) VALUES
(1, 'Rau muong VietGAP', 'rau-muong-vietgap', 'Rau muong tuoi ngon, trong theo tieu chuan VietGAP, thu hoach hang ngay.', 9500, NULL, 'bó', 200, '["🥬"]', 1),
(1, 'Sup lo xanh Da Lat', 'sup-lo-xanh-da-lat', 'Sup lo trong huu co tai Lam Dong, giau dinh duong tu nhien.', 45000, NULL, 'kg', 80, '["🥦"]', 1),
(1, 'Rau cai xanh huu co', 'rau-cai-xanh-huu-co', 'Cai xanh non tuoi, trong tu nhien khong thuoc tru sau.', 18000, NULL, 'bó', 150, '["🥬"]', 0),
(1, 'Xa lach hon hop', 'xa-lach-hon-hop', 'La non tuoi ngon, rua sach dong goi hut chan khong tien loi.', 31000, 28000, 'túi', 100, '["🥗"]', 1),
(1, 'Rau de tay', 'rau-de-tay', 'Rau de tay tuoi mat, nhieu chat xo, rat tot cho suc khoe.', 22000, NULL, 'bó', 120, '["🥬"]', 0),
(2, 'Ca rot huu co', 'ca-rot-huu-co', 'Gion ngot tu nhien, khong thuoc tru sau hoa hoc.', 32000, NULL, 'kg', 150, '["🥕"]', 1),
(2, 'Ca chua Dong Dua', 'ca-chua-dong-dua', 'Ca chua chin do, ngot thanh, trong theo phuong phap huu co.', 33000, NULL, 'kg', 100, '["🍅"]', 1),
(2, 'Khoai tay Da Lat', 'khoai-tay-da-lat', 'Khoai tay Da Lat but bo, thuong dung lam khoai tay chien hoac nuong.', 28000, 25000, 'kg', 200, '["🥔"]', 0),
(2, 'Hanh tay do', 'hanh-tay-do', 'Hanh tay do ngot, nhieu chat chong oxy hoa.', 25000, NULL, 'kg', 180, '["🧅"]', 0),
(2, 'Ot chuong xanh', 'ot-chuong-xanh', 'Ot chuong xanh gion, giau vitamin C.', 35000, NULL, 'kg', 90, '["🫑"]', 0),
(3, 'Dau tay Moc Chau', 'dau-tay-moc-chau', 'Ngot thanh, mong nuoc, tieu chuan VietGAP xuat khau.', 120000, 102000, 'hộp', 60, '["🍓"]', 1),
(3, 'Xoai cat Hoa Loc', 'xoai-cat-hoa-loc', 'Xoai cat Hoa Loc chinh vu, ngot deo, thom nhung.', 55000, NULL, 'kg', 100, '["🥭"]', 1),
(3, 'Thanh long ruot do', 'thanh-long-ruot-do', 'Thanh long ruot do Binh Thuan, giau chat chong oxy hoa.', 35000, NULL, 'kg', 120, '["🐉"]', 0),
(3, 'Buoi da xanh', 'buoi-da-xanh', 'Buoi da xanh Ben Tre, gion ngot, it hat.', 65000, NULL, 'quả', 80, '["🍋"]', 0),
(4, 'Thit ba chi sach', 'thit-ba-chi-sach', 'Thit ba chi heo sach, chung nhan an toan thuc pham.', 79000, NULL, '500g', 50, '["🥩"]', 1),
(4, 'Uc ga huu co', 'uc-ga-huu-co', 'Ga thiet nuoi tu nhien, giau protein, it mo.', 85000, NULL, 'kg', 70, '["🍗"]', 1),
(4, 'Suon non heo', 'suon-non-heo', 'Suon non heo tuoi, nuong hay hap deu ngon.', 95000, NULL, 'kg', 45, '["🥩"]', 0),
(5, 'Tom su tuoi', 'tom-su-tuoi', 'Tom su tuoi, con song, danh bat trong ngay.', 150000, 130000, '500g', 30, '["🦐"]', 1),
(5, 'Ca hoi Na Uy philet', 'ca-hoi-na-uy-philet', 'Ca hoi Na Uy cat philet, giau omega-3.', 195000, NULL, '300g', 25, '["🐟"]', 1),
(6, 'Trung ga ta', 'trung-ga-ta', 'Trung ga ta nuoi thien nhien, long do cam.', 45000, NULL, 'vỉ 10', 200, '["🥚"]', 0);
