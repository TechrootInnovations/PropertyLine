-- Add generic lookup masters used by property dropdowns
USE `terranexusproperties`;

CREATE TABLE IF NOT EXISTS `master_options` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `master_type` VARCHAR(60)  NOT NULL,
  `name`        VARCHAR(120) NOT NULL,
  `value`       VARCHAR(120) NOT NULL,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_master_type_value` (`master_type`, `value`),
  KEY `idx_master_type_active` (`master_type`, `is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `master_options` (`master_type`, `name`, `value`, `sort_order`) VALUES
('purpose', 'Sale', 'sale', 1),
('purpose', 'Rent', 'rent', 2),
('status', 'Draft', 'draft', 1),
('status', 'Published', 'published', 2),
('status', 'Sold', 'sold', 3),
('status', 'Rented', 'rented', 4),
('status', 'Inactive', 'inactive', 5),
('status', 'Expired', 'expired', 6),
('facing', 'East', 'east', 1),
('facing', 'West', 'west', 2),
('facing', 'North', 'north', 3),
('facing', 'South', 'south', 4),
('facing', 'North-East', 'north-east', 5),
('facing', 'North-West', 'north-west', 6),
('facing', 'South-East', 'south-east', 7),
('facing', 'South-West', 'south-west', 8),
('furnishing', 'N/A', 'na', 1),
('furnishing', 'Unfurnished', 'unfurnished', 2),
('furnishing', 'Semi Furnished', 'semi_furnished', 3),
('furnishing', 'Furnished', 'furnished', 4),
('possession_status', 'N/A', 'na', 1),
('possession_status', 'Ready to Move', 'ready_to_move', 2),
('possession_status', 'Under Construction', 'under_construction', 3),
('area_unit', 'Sq Ft', 'sqft', 1),
('area_unit', 'Sq M', 'sqm', 2),
('area_unit', 'Acre', 'acre', 3),
('area_unit', 'Guntha', 'guntha', 4);

-- Allow custom master values beyond old fixed ENUMs
ALTER TABLE `properties`
  MODIFY `purpose` VARCHAR(40) NOT NULL,
  MODIFY `status` VARCHAR(40) NOT NULL DEFAULT 'draft',
  MODIFY `area_unit` VARCHAR(40) NOT NULL DEFAULT 'sqft',
  MODIFY `furnishing` VARCHAR(40) DEFAULT 'na',
  MODIFY `possession_status` VARCHAR(40) DEFAULT 'na';
