-- =============================================================================
-- Terranexus Properties | Real Estate Property Listing — MySQL Schema (Hostinger/cPanel)
-- Engine: InnoDB | Charset: utf8mb4 | Soft deletes + SEO + lead tracking
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `terranexusproperties`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `terranexusproperties`;

-- -----------------------------------------------------------------------------
-- 1. ADMIN USERS (extensible to multi-agent later)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `admin_users`;
CREATE TABLE `admin_users` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`          CHAR(36)        NOT NULL,
  `name`          VARCHAR(120)    NOT NULL,
  `email`         VARCHAR(190)    NOT NULL,
  `phone`         VARCHAR(20)     DEFAULT NULL,
  `password_hash` VARCHAR(255)    NOT NULL,
  `role`          ENUM('super_admin','admin','agent') NOT NULL DEFAULT 'admin',
  `avatar_url`    VARCHAR(500)    DEFAULT NULL,
  `is_active`     TINYINT(1)      NOT NULL DEFAULT 1,
  `last_login_at` DATETIME        DEFAULT NULL,
  `password_reset_token` VARCHAR(255) DEFAULT NULL,
  `password_reset_expires` DATETIME DEFAULT NULL,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`    DATETIME        DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_uuid` (`uuid`),
  UNIQUE KEY `uk_admin_email` (`email`),
  KEY `idx_admin_active` (`is_active`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. SITE SETTINGS (fully configurable app — brand, colors, contact, SEO)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `site_settings`;
CREATE TABLE `site_settings` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_group` VARCHAR(60) NOT NULL DEFAULT 'general',
  `setting_key`   VARCHAR(100) NOT NULL,
  `setting_value` MEDIUMTEXT,
  `value_type`    ENUM('string','number','boolean','json','html','color') NOT NULL DEFAULT 'string',
  `is_public`     TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_setting_key` (`setting_key`),
  KEY `idx_setting_group` (`setting_group`),
  KEY `idx_setting_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. MASTER DATA — Categories / Types / Locations / Amenities
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `property_categories`;
CREATE TABLE `property_categories` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `slug`        VARCHAR(120) NOT NULL,
  `icon`        VARCHAR(80)  DEFAULT NULL,
  `image_url`   VARCHAR(500) DEFAULT NULL,
  `description` TEXT,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `seo_title`   VARCHAR(200) DEFAULT NULL,
  `seo_description` VARCHAR(320) DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cat_slug` (`slug`),
  KEY `idx_cat_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `property_types`;
CREATE TABLE `property_types` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `name`        VARCHAR(100) NOT NULL,
  `slug`        VARCHAR(120) NOT NULL,
  `icon`        VARCHAR(80)  DEFAULT NULL,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_slug` (`slug`),
  KEY `idx_type_category` (`category_id`, `is_active`),
  CONSTRAINT `fk_type_category` FOREIGN KEY (`category_id`)
    REFERENCES `property_categories` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `locations`;
CREATE TABLE `locations` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(150) NOT NULL,
  `slug`        VARCHAR(160) NOT NULL,
  `city`        VARCHAR(100) NOT NULL,
  `state`       VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
  `country`     VARCHAR(80)  NOT NULL DEFAULT 'India',
  `pincode`     VARCHAR(12)  DEFAULT NULL,
  `latitude`    DECIMAL(10,7) DEFAULT NULL,
  `longitude`   DECIMAL(10,7) DEFAULT NULL,
  `image_url`   VARCHAR(500) DEFAULT NULL,
  `is_popular`  TINYINT(1) NOT NULL DEFAULT 0,
  `property_count_cache` INT UNSIGNED NOT NULL DEFAULT 0,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `seo_title`   VARCHAR(200) DEFAULT NULL,
  `seo_description` VARCHAR(320) DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_loc_slug` (`slug`),
  KEY `idx_loc_city` (`city`),
  KEY `idx_loc_popular` (`is_popular`, `is_active`),
  KEY `idx_loc_search` (`name`, `city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `amenities`;
CREATE TABLE `amenities` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `slug`        VARCHAR(120) NOT NULL,
  `icon`        VARCHAR(80)  DEFAULT NULL,
  `amenity_group` VARCHAR(60) DEFAULT 'general',
  `sort_order`  INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_amenity_slug` (`slug`),
  KEY `idx_amenity_group` (`amenity_group`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. PROPERTIES (core listing entity)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`            CHAR(36)        NOT NULL,
  `property_code`   VARCHAR(40)     NOT NULL COMMENT 'Public ID e.g. PROP-1025',
  `title`           VARCHAR(255)    NOT NULL,
  `slug`            VARCHAR(280)    NOT NULL,
  `purpose`         ENUM('sale','rent') NOT NULL,
  `category_id`     INT UNSIGNED    NOT NULL,
  `type_id`         INT UNSIGNED    NOT NULL,
  `location_id`     INT UNSIGNED    DEFAULT NULL,
  `status`          ENUM('draft','published','sold','rented','inactive','expired')
                      NOT NULL DEFAULT 'draft',
  `is_featured`     TINYINT(1)      NOT NULL DEFAULT 0,
  `short_description` VARCHAR(500)  DEFAULT NULL,
  `description`     MEDIUMTEXT,
  -- Pricing
  `price`           DECIMAL(15,2)   DEFAULT NULL,
  `price_display`   VARCHAR(120)    DEFAULT NULL COMMENT 'Optional override e.g. Price on Request',
  `price_negotiable` TINYINT(1)     NOT NULL DEFAULT 0,
  `currency`        CHAR(3)         NOT NULL DEFAULT 'INR',
  `maintenance_charges` DECIMAL(12,2) DEFAULT NULL,
  `security_deposit`    DECIMAL(15,2) DEFAULT NULL,
  `monthly_rent`        DECIMAL(15,2) DEFAULT NULL,
  `other_charges`       DECIMAL(12,2) DEFAULT NULL,
  -- Specs
  `bedrooms`        TINYINT UNSIGNED DEFAULT NULL,
  `bathrooms`       TINYINT UNSIGNED DEFAULT NULL,
  `balconies`       TINYINT UNSIGNED DEFAULT NULL,
  `carpet_area`     DECIMAL(12,2) DEFAULT NULL,
  `builtup_area`    DECIMAL(12,2) DEFAULT NULL,
  `plot_area`       DECIMAL(12,2) DEFAULT NULL,
  `area_unit`       ENUM('sqft','sqm','acre','guntha') NOT NULL DEFAULT 'sqft',
  `floor_number`    VARCHAR(30) DEFAULT NULL,
  `total_floors`    SMALLINT UNSIGNED DEFAULT NULL,
  `property_age`    VARCHAR(60) DEFAULT NULL,
  `facing`          VARCHAR(40) DEFAULT NULL,
  `furnishing`      ENUM('furnished','semi_furnished','unfurnished','na') DEFAULT 'na',
  `parking`         VARCHAR(80) DEFAULT NULL,
  `possession_status` ENUM('ready_to_move','under_construction','na') DEFAULT 'na',
  -- Location details
  `address`         VARCHAR(500) DEFAULT NULL,
  `locality`        VARCHAR(150) DEFAULT NULL,
  `city`            VARCHAR(100) DEFAULT NULL,
  `state`           VARCHAR(100) DEFAULT NULL,
  `pincode`         VARCHAR(12)  DEFAULT NULL,
  `landmark`        VARCHAR(200) DEFAULT NULL,
  `latitude`        DECIMAL(10,7) DEFAULT NULL,
  `longitude`       DECIMAL(10,7) DEFAULT NULL,
  `map_url`         VARCHAR(500) DEFAULT NULL,
  -- Media & SEO
  `main_image`      VARCHAR(500) DEFAULT NULL,
  `video_url`       VARCHAR(500) DEFAULT NULL,
  `virtual_tour_url` VARCHAR(500) DEFAULT NULL,
  `seo_title`       VARCHAR(200) DEFAULT NULL,
  `seo_description` VARCHAR(320) DEFAULT NULL,
  `seo_keywords`    VARCHAR(300) DEFAULT NULL,
  `og_image`        VARCHAR(500) DEFAULT NULL,
  -- Meta
  `views_count`     INT UNSIGNED NOT NULL DEFAULT 0,
  `enquiries_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `published_at`    DATETIME DEFAULT NULL,
  `expires_at`      DATETIME DEFAULT NULL,
  `created_by`      BIGINT UNSIGNED DEFAULT NULL,
  `updated_by`      BIGINT UNSIGNED DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`      DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_prop_uuid` (`uuid`),
  UNIQUE KEY `uk_prop_code` (`property_code`),
  UNIQUE KEY `uk_prop_slug` (`slug`),
  KEY `idx_prop_status` (`status`, `deleted_at`),
  KEY `idx_prop_purpose` (`purpose`, `status`),
  KEY `idx_prop_featured` (`is_featured`, `status`),
  KEY `idx_prop_category` (`category_id`),
  KEY `idx_prop_type` (`type_id`),
  KEY `idx_prop_location` (`location_id`),
  KEY `idx_prop_price` (`price`),
  KEY `idx_prop_beds` (`bedrooms`),
  KEY `idx_prop_area` (`carpet_area`, `builtup_area`),
  KEY `idx_prop_city` (`city`),
  KEY `idx_prop_locality` (`locality`),
  KEY `idx_prop_possession` (`possession_status`),
  KEY `idx_prop_furnishing` (`furnishing`),
  KEY `idx_prop_published` (`published_at`),
  FULLTEXT KEY `ft_prop_search` (`title`, `short_description`, `locality`, `city`, `address`),
  CONSTRAINT `fk_prop_category` FOREIGN KEY (`category_id`)
    REFERENCES `property_categories` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_prop_type` FOREIGN KEY (`type_id`)
    REFERENCES `property_types` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_prop_location` FOREIGN KEY (`location_id`)
    REFERENCES `locations` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_prop_created_by` FOREIGN KEY (`created_by`)
    REFERENCES `admin_users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. PROPERTY IMAGES & AMENITIES (M:N)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `property_images`;
CREATE TABLE `property_images` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `property_id` BIGINT UNSIGNED NOT NULL,
  `image_url`   VARCHAR(500) NOT NULL,
  `thumbnail_url` VARCHAR(500) DEFAULT NULL,
  `alt_text`    VARCHAR(255) DEFAULT NULL,
  `caption`     VARCHAR(255) DEFAULT NULL,
  `is_primary`  TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_img_property` (`property_id`, `sort_order`),
  CONSTRAINT `fk_img_property` FOREIGN KEY (`property_id`)
    REFERENCES `properties` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `property_amenities`;
CREATE TABLE `property_amenities` (
  `property_id` BIGINT UNSIGNED NOT NULL,
  `amenity_id`  INT UNSIGNED NOT NULL,
  PRIMARY KEY (`property_id`, `amenity_id`),
  KEY `idx_pa_amenity` (`amenity_id`),
  CONSTRAINT `fk_pa_property` FOREIGN KEY (`property_id`)
    REFERENCES `properties` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_pa_amenity` FOREIGN KEY (`amenity_id`)
    REFERENCES `amenities` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. ENQUIRIES & CONTACT LEADS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `enquiries`;
CREATE TABLE `enquiries` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`            CHAR(36) NOT NULL,
  `enquiry_type`    ENUM('property','contact','callback') NOT NULL DEFAULT 'property',
  `property_id`     BIGINT UNSIGNED DEFAULT NULL,
  `property_code`   VARCHAR(40) DEFAULT NULL,
  `property_title`  VARCHAR(255) DEFAULT NULL,
  `name`            VARCHAR(120) NOT NULL,
  `mobile`          VARCHAR(20) NOT NULL,
  `email`           VARCHAR(190) DEFAULT NULL,
  `preferred_contact` ENUM('call','whatsapp','email','any') NOT NULL DEFAULT 'any',
  `message`         TEXT,
  `status`          ENUM('new','in_progress','contacted','closed','spam') NOT NULL DEFAULT 'new',
  `admin_notes`     TEXT,
  `assigned_to`     BIGINT UNSIGNED DEFAULT NULL,
  `ip_address`      VARCHAR(45) DEFAULT NULL,
  `user_agent`      VARCHAR(500) DEFAULT NULL,
  `source_page`     VARCHAR(500) DEFAULT NULL,
  `utm_source`      VARCHAR(100) DEFAULT NULL,
  `utm_medium`      VARCHAR(100) DEFAULT NULL,
  `utm_campaign`    VARCHAR(100) DEFAULT NULL,
  `responded_at`    DATETIME DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`      DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_enq_uuid` (`uuid`),
  KEY `idx_enq_status` (`status`, `created_at`),
  KEY `idx_enq_property` (`property_id`),
  KEY `idx_enq_type` (`enquiry_type`),
  KEY `idx_enq_mobile` (`mobile`),
  CONSTRAINT `fk_enq_property` FOREIGN KEY (`property_id`)
    REFERENCES `properties` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_enq_assigned` FOREIGN KEY (`assigned_to`)
    REFERENCES `admin_users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. CMS / HOMEPAGE CONTENT BLOCKS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `content_blocks`;
CREATE TABLE `content_blocks` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `block_key`   VARCHAR(100) NOT NULL,
  `title`       VARCHAR(255) DEFAULT NULL,
  `subtitle`    VARCHAR(500) DEFAULT NULL,
  `body`        MEDIUMTEXT,
  `image_url`   VARCHAR(500) DEFAULT NULL,
  `cta_label`   VARCHAR(100) DEFAULT NULL,
  `cta_url`     VARCHAR(500) DEFAULT NULL,
  `extra_json`  JSON DEFAULT NULL,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_block_key` (`block_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `testimonials`;
CREATE TABLE `testimonials` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120) NOT NULL,
  `role`        VARCHAR(120) DEFAULT NULL,
  `avatar_url`  VARCHAR(500) DEFAULT NULL,
  `rating`      TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `message`     TEXT NOT NULL,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. AUDIT / ACTIVITY (admin trail)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`    BIGINT UNSIGNED DEFAULT NULL,
  `action`      VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(60) DEFAULT NULL,
  `entity_id`   BIGINT UNSIGNED DEFAULT NULL,
  `meta_json`   JSON DEFAULT NULL,
  `ip_address`  VARCHAR(45) DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_admin` (`admin_id`, `created_at`),
  KEY `idx_log_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Helpful views for dashboard / public listing
CREATE OR REPLACE VIEW `v_property_list` AS
SELECT
  p.id, p.uuid, p.property_code, p.title, p.slug, p.purpose,
  p.status, p.is_featured, p.price, p.price_display, p.currency,
  p.monthly_rent, p.bedrooms, p.bathrooms, p.carpet_area, p.builtup_area,
  p.area_unit, p.furnishing, p.possession_status, p.main_image,
  p.locality, p.city, p.state, p.views_count, p.published_at,
  c.name AS category_name, c.slug AS category_slug,
  t.name AS type_name, t.slug AS type_slug,
  l.name AS location_name, l.slug AS location_slug
FROM properties p
JOIN property_categories c ON c.id = p.category_id AND c.deleted_at IS NULL
JOIN property_types t ON t.id = p.type_id AND t.deleted_at IS NULL
LEFT JOIN locations l ON l.id = p.location_id AND l.deleted_at IS NULL
WHERE p.deleted_at IS NULL;
