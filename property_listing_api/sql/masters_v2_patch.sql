-- Terranexus masters v2 — categories, locations, sellers, map/extra fields
-- Safe to re-run (uses soft-delete + upsert by slug).
USE `terranexusproperties`;

-- -----------------------------------------------------------------------------
-- Sellers master
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sellers` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(150) NOT NULL,
  `company_name`  VARCHAR(180) DEFAULT NULL,
  `phone`         VARCHAR(20)  DEFAULT NULL,
  `whatsapp`      VARCHAR(20)  DEFAULT NULL,
  `email`         VARCHAR(190) DEFAULT NULL,
  `rera_number`   VARCHAR(80)  DEFAULT NULL,
  `address`       VARCHAR(500) DEFAULT NULL,
  `notes`         TEXT,
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order`    INT NOT NULL DEFAULT 0,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`    DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_seller_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Category-specific field catalog (from Excel)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `property_field_definitions` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `main_category`  VARCHAR(100) NOT NULL,
  `sub_category`   VARCHAR(100) NOT NULL,
  `section`        VARCHAR(120) NOT NULL DEFAULT 'Details',
  `field_name`     VARCHAR(160) NOT NULL,
  `field_key`      VARCHAR(160) NOT NULL,
  `field_type`     VARCHAR(60)  NOT NULL DEFAULT 'text',
  `is_required`    TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order`     INT NOT NULL DEFAULT 0,
  `is_active`      TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_field_def` (`sub_category`, `field_key`),
  KEY `idx_field_sub` (`sub_category`, `is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Extra property columns (map already exists; add seller + extras)
-- -----------------------------------------------------------------------------
SET @db := DATABASE();

SET @q := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='properties' AND COLUMN_NAME='seller_id'),
    'SELECT 1',
    'ALTER TABLE properties ADD COLUMN seller_id INT UNSIGNED DEFAULT NULL AFTER location_id, ADD KEY idx_prop_seller (seller_id)'
  )
);
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='properties' AND COLUMN_NAME='extra_attributes'),
    'SELECT 1',
    'ALTER TABLE properties ADD COLUMN extra_attributes JSON DEFAULT NULL AFTER map_url'
  )
);
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='properties' AND COLUMN_NAME='show_exact_location'),
    'SELECT 1',
    'ALTER TABLE properties ADD COLUMN show_exact_location TINYINT(1) NOT NULL DEFAULT 1 AFTER map_url'
  )
);
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='properties' AND COLUMN_NAME='price_type'),
    'SELECT 1',
    'ALTER TABLE properties ADD COLUMN price_type VARCHAR(40) DEFAULT NULL AFTER price_display'
  )
);
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='properties' AND COLUMN_NAME='is_verified'),
    'SELECT 1',
    'ALTER TABLE properties ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured'
  )
);
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='properties' AND COLUMN_NAME='youtube_url'),
    'SELECT 1',
    'ALTER TABLE properties ADD COLUMN youtube_url VARCHAR(500) DEFAULT NULL AFTER video_url'
  )
);
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='properties' AND COLUMN_NAME='district'),
    'SELECT 1',
    'ALTER TABLE properties ADD COLUMN district VARCHAR(100) DEFAULT NULL AFTER city'
  )
);
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- Ensure favicon setting exists
INSERT INTO site_settings (setting_group, setting_key, setting_value, value_type, is_public)
VALUES ('brand', 'favicon_url', '/favicon.svg', 'string', 1)
ON DUPLICATE KEY UPDATE setting_group = VALUES(setting_group);

-- Soft-deactivate old categories/types/locations (keep rows for FK safety)
UPDATE property_categories SET is_active = 0, deleted_at = COALESCE(deleted_at, NOW())
WHERE deleted_at IS NULL AND slug NOT IN ('residential', 'land');

UPDATE property_types SET is_active = 0, deleted_at = COALESCE(deleted_at, NOW())
WHERE deleted_at IS NULL AND slug NOT IN ('apartment', 'villa', 'agriculture-land', 'na-plot');

UPDATE locations SET is_active = 0, deleted_at = COALESCE(deleted_at, NOW())
WHERE deleted_at IS NULL AND slug NOT IN ('mumbai','thane','vashi','panvel','pune','kalyan','karjat','khopoli');

-- Categories: Residential + Land
INSERT INTO property_categories (name, slug, icon, description, sort_order, is_active, deleted_at)
VALUES
('Residential', 'residential', 'home', 'Apartments and villas', 1, 1, NULL),
('Land', 'land', 'map', 'Agriculture land and NA plots', 2, 1, NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  icon = VALUES(icon),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = 1,
  deleted_at = NULL;

SET @cat_res := (SELECT id FROM property_categories WHERE slug = 'residential' LIMIT 1);
SET @cat_land := (SELECT id FROM property_categories WHERE slug = 'land' LIMIT 1);

INSERT INTO property_types (category_id, name, slug, icon, sort_order, is_active, deleted_at)
VALUES
(@cat_res, 'Apartment', 'apartment', 'building', 1, 1, NULL),
(@cat_res, 'Villa', 'villa', 'home', 2, 1, NULL),
(@cat_land, 'Agriculture Land', 'agriculture-land', 'trees', 1, 1, NULL),
(@cat_land, 'NA Plot', 'na-plot', 'map-pin', 2, 1, NULL)
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  icon = VALUES(icon),
  sort_order = VALUES(sort_order),
  is_active = 1,
  deleted_at = NULL;

-- Locations (user list)
INSERT INTO locations (name, slug, city, state, country, is_popular, sort_order, latitude, longitude, is_active, deleted_at)
VALUES
('Mumbai',  'mumbai',  'Mumbai',      'Maharashtra', 'India', 1, 1, 19.0760900, 72.8774260, 1, NULL),
('Thane',   'thane',   'Thane',       'Maharashtra', 'India', 1, 2, 19.2183300, 72.9780900, 1, NULL),
('Vashi',   'vashi',   'Navi Mumbai', 'Maharashtra', 'India', 1, 3, 19.0770600, 72.9989900, 1, NULL),
('Panvel',  'panvel',  'Navi Mumbai', 'Maharashtra', 'India', 1, 4, 18.9894000, 73.1175000, 1, NULL),
('Pune',    'pune',    'Pune',        'Maharashtra', 'India', 1, 5, 18.5204300, 73.8567400, 1, NULL),
('Kalyan',  'kalyan',  'Kalyan',      'Maharashtra', 'India', 1, 6, 19.2403300, 73.1305400, 1, NULL),
('Karjat',  'karjat',  'Karjat',      'Maharashtra', 'India', 1, 7, 18.9102000, 73.3236000, 1, NULL),
('Khopoli', 'khopoli', 'Khopoli',     'Maharashtra', 'India', 1, 8, 18.7857000, 73.3458000, 1, NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  city = VALUES(city),
  state = VALUES(state),
  country = VALUES(country),
  is_popular = 1,
  sort_order = VALUES(sort_order),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  is_active = 1,
  deleted_at = NULL;

-- Extra master options
INSERT IGNORE INTO master_options (master_type, name, value, sort_order, is_active) VALUES
('purpose', 'Lease', 'lease', 3, 1),
('price_type', 'Total Price', 'total', 1, 1),
('price_type', 'Price per Sq.ft', 'per_sqft', 2, 1),
('price_type', 'Price per Acre', 'per_acre', 3, 1),
('price_type', 'Price per Guntha', 'per_guntha', 4, 1),
('status', 'Available', 'available', 7, 1),
('status', 'Under Construction', 'under_construction', 8, 1),
('status', 'Coming Soon', 'coming_soon', 9, 1);
