<?php
/**
 * One-time DB patch: categories, locations, sellers, excel field catalog.
 * Visit: https://terranexusproperties.com/api/patch_masters.php?key=terra-patch-2026
 * DELETE this file after success.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

if (($_GET['key'] ?? '') !== 'terra-patch-2026') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Forbidden']);
    exit;
}

function loadEnv(string $path): array
{
    $env = [];
    if (!is_file($path)) {
        return $env;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $env[trim($k)] = trim(trim($v), " \t\"'");
    }
    return $env;
}

function columnExists(PDO $pdo, string $table, string $column): bool
{
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $st->execute([$table, $column]);
    return (int) $st->fetchColumn() > 0;
}

try {
    $env = loadEnv(__DIR__ . '/.env');
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $env['DB_HOST'] ?? 'localhost', $env['DB_NAME'] ?? ''),
        $env['DB_USER'] ?? '',
        $env['DB_PASSWORD'] ?? '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );

    $log = [];

    $pdo->exec("CREATE TABLE IF NOT EXISTS sellers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      company_name VARCHAR(180) DEFAULT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      whatsapp VARCHAR(20) DEFAULT NULL,
      email VARCHAR(190) DEFAULT NULL,
      rera_number VARCHAR(80) DEFAULT NULL,
      address VARCHAR(500) DEFAULT NULL,
      notes TEXT,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_seller_active (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $log[] = 'sellers table ready';

    $pdo->exec("CREATE TABLE IF NOT EXISTS property_field_definitions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      main_category VARCHAR(100) NOT NULL,
      sub_category VARCHAR(100) NOT NULL,
      section VARCHAR(120) NOT NULL DEFAULT 'Details',
      field_name VARCHAR(160) NOT NULL,
      field_key VARCHAR(160) NOT NULL,
      field_type VARCHAR(60) NOT NULL DEFAULT 'text',
      is_required TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_field_def (sub_category, field_key),
      KEY idx_field_sub (sub_category, is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $log[] = 'property_field_definitions ready';

    $alters = [
        'seller_id' => 'ADD COLUMN seller_id INT UNSIGNED DEFAULT NULL AFTER location_id, ADD KEY idx_prop_seller (seller_id)',
        'extra_attributes' => 'ADD COLUMN extra_attributes JSON DEFAULT NULL AFTER map_url',
        'show_exact_location' => 'ADD COLUMN show_exact_location TINYINT(1) NOT NULL DEFAULT 1 AFTER map_url',
        'price_type' => 'ADD COLUMN price_type VARCHAR(40) DEFAULT NULL AFTER price_display',
        'is_verified' => 'ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured',
        'youtube_url' => 'ADD COLUMN youtube_url VARCHAR(500) DEFAULT NULL AFTER video_url',
        'district' => 'ADD COLUMN district VARCHAR(100) DEFAULT NULL AFTER city',
    ];
    foreach ($alters as $col => $sql) {
        if (!columnExists($pdo, 'properties', $col)) {
            $pdo->exec("ALTER TABLE properties {$sql}");
            $log[] = "added properties.{$col}";
        }
    }

    $pdo->prepare(
        "INSERT INTO site_settings (setting_group, setting_key, setting_value, value_type, is_public)
         VALUES ('brand','favicon_url','/favicon.svg','string',1)
         ON DUPLICATE KEY UPDATE setting_group = VALUES(setting_group)"
    )->execute();

    $pdo->exec("UPDATE property_categories SET is_active = 0, deleted_at = COALESCE(deleted_at, NOW())
                WHERE deleted_at IS NULL AND slug NOT IN ('residential','land')");
    $pdo->exec("UPDATE property_types SET is_active = 0, deleted_at = COALESCE(deleted_at, NOW())
                WHERE deleted_at IS NULL AND slug NOT IN ('apartment','villa','agriculture-land','na-plot')");
    $pdo->exec("UPDATE locations SET is_active = 0, deleted_at = COALESCE(deleted_at, NOW())
                WHERE deleted_at IS NULL AND slug NOT IN ('mumbai','thane','vashi','panvel','pune','kalyan','karjat','khopoli')");

    $upsertCat = $pdo->prepare(
        "INSERT INTO property_categories (name, slug, icon, description, sort_order, is_active, deleted_at)
         VALUES (?,?,?,?,?,1,NULL)
         ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), description=VALUES(description),
           sort_order=VALUES(sort_order), is_active=1, deleted_at=NULL"
    );
    $upsertCat->execute(['Residential', 'residential', 'home', 'Apartments and villas', 1]);
    $upsertCat->execute(['Land', 'land', 'map', 'Agriculture land and NA plots', 2]);

    $catRes = (int) $pdo->query("SELECT id FROM property_categories WHERE slug='residential' LIMIT 1")->fetchColumn();
    $catLand = (int) $pdo->query("SELECT id FROM property_categories WHERE slug='land' LIMIT 1")->fetchColumn();

    $upsertType = $pdo->prepare(
        "INSERT INTO property_types (category_id, name, slug, icon, sort_order, is_active, deleted_at)
         VALUES (?,?,?,?,?,1,NULL)
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), name=VALUES(name), icon=VALUES(icon),
           sort_order=VALUES(sort_order), is_active=1, deleted_at=NULL"
    );
    $upsertType->execute([$catRes, 'Apartment', 'apartment', 'building', 1]);
    $upsertType->execute([$catRes, 'Villa', 'villa', 'home', 2]);
    $upsertType->execute([$catLand, 'Agriculture Land', 'agriculture-land', 'trees', 1]);
    $upsertType->execute([$catLand, 'NA Plot', 'na-plot', 'map-pin', 2]);

    $locs = [
        ['Mumbai', 'mumbai', 'Mumbai', 1, 19.0760900, 72.8774260],
        ['Thane', 'thane', 'Thane', 2, 19.2183300, 72.9780900],
        ['Vashi', 'vashi', 'Navi Mumbai', 3, 19.0770600, 72.9989900],
        ['Panvel', 'panvel', 'Navi Mumbai', 4, 18.9894000, 73.1175000],
        ['Pune', 'pune', 'Pune', 5, 18.5204300, 73.8567400],
        ['Kalyan', 'kalyan', 'Kalyan', 6, 19.2403300, 73.1305400],
        ['Karjat', 'karjat', 'Karjat', 7, 18.9102000, 73.3236000],
        ['Khopoli', 'khopoli', 'Khopoli', 8, 18.7857000, 73.3458000],
    ];
    $upsertLoc = $pdo->prepare(
        "INSERT INTO locations (name, slug, city, state, country, is_popular, sort_order, latitude, longitude, is_active, deleted_at)
         VALUES (?,?,?,'Maharashtra','India',1,?,?,?,1,NULL)
         ON DUPLICATE KEY UPDATE name=VALUES(name), city=VALUES(city), is_popular=1,
           sort_order=VALUES(sort_order), latitude=VALUES(latitude), longitude=VALUES(longitude),
           is_active=1, deleted_at=NULL"
    );
    foreach ($locs as $l) {
        $upsertLoc->execute([$l[0], $l[1], $l[2], $l[3], $l[4], $l[5]]);
    }
    $log[] = 'categories/types/locations seeded';

    $jsonPath = __DIR__ . '/sql/excel_field_definitions.json';
    $fieldCount = 0;
    if (is_file($jsonPath)) {
        $rawJson = (string) file_get_contents($jsonPath);
        $rawJson = preg_replace('/^\xEF\xBB\xBF/', '', $rawJson) ?? $rawJson;
        $fields = json_decode($rawJson, true) ?: [];
        $ins = $pdo->prepare(
            "INSERT INTO property_field_definitions
             (main_category, sub_category, section, field_name, field_key, field_type, is_required, sort_order, is_active)
             VALUES (?,?,?,?,?,?,?,?,1)
             ON DUPLICATE KEY UPDATE section=VALUES(section), field_name=VALUES(field_name),
               field_type=VALUES(field_type), is_required=VALUES(is_required), sort_order=VALUES(sort_order), is_active=1"
        );
        foreach ($fields as $f) {
            $ins->execute([
                $f['main_category'] ?? '',
                $f['sub_category'] ?? '',
                $f['section'] ?? 'Details',
                $f['field_name'] ?? '',
                $f['field_key'] ?? '',
                $f['field_type'] ?? 'text',
                !empty($f['required']) ? 1 : 0,
                (int) ($f['sort_order'] ?? 0),
            ]);
            $fieldCount++;
        }
    }
    $log[] = "field definitions loaded: {$fieldCount}";

    $opts = [
        ['purpose', 'Sale', 'sale', 1],
        ['purpose', 'Rent', 'rent', 2],
        ['purpose', 'Lease', 'lease', 3],
        ['status', 'Draft', 'draft', 1],
        ['status', 'Published', 'published', 2],
        ['status', 'Sold', 'sold', 3],
        ['status', 'Rented', 'rented', 4],
        ['status', 'Inactive', 'inactive', 5],
        ['status', 'Expired', 'expired', 6],
        ['status', 'Available', 'available', 7],
        ['status', 'Under Construction', 'under_construction', 8],
        ['status', 'Coming Soon', 'coming_soon', 9],
        ['facing', 'East', 'east', 1],
        ['facing', 'West', 'west', 2],
        ['facing', 'North', 'north', 3],
        ['facing', 'South', 'south', 4],
        ['facing', 'North-East', 'north-east', 5],
        ['facing', 'North-West', 'north-west', 6],
        ['facing', 'South-East', 'south-east', 7],
        ['facing', 'South-West', 'south-west', 8],
        ['furnishing', 'N/A', 'na', 1],
        ['furnishing', 'Unfurnished', 'unfurnished', 2],
        ['furnishing', 'Semi Furnished', 'semi_furnished', 3],
        ['furnishing', 'Furnished', 'furnished', 4],
        ['possession_status', 'N/A', 'na', 1],
        ['possession_status', 'Ready to Move', 'ready_to_move', 2],
        ['possession_status', 'Under Construction', 'under_construction', 3],
        ['area_unit', 'Sq Ft', 'sqft', 1],
        ['area_unit', 'Sq M', 'sqm', 2],
        ['area_unit', 'Acre', 'acre', 3],
        ['area_unit', 'Guntha', 'guntha', 4],
        ['price_type', 'Total Price', 'total', 1],
        ['price_type', 'Price per Sq.ft', 'per_sqft', 2],
        ['price_type', 'Price per Acre', 'per_acre', 3],
        ['price_type', 'Price per Guntha', 'per_guntha', 4],
    ];
    $optIns = $pdo->prepare(
        'INSERT IGNORE INTO master_options (master_type, name, value, sort_order, is_active) VALUES (?,?,?,?,1)'
    );
    foreach ($opts as $o) {
        $optIns->execute($o);
    }
    // Revive soft-deleted option rows that we need
    $pdo->exec("UPDATE master_options SET deleted_at = NULL, is_active = 1
                WHERE master_type IN ('purpose','status','facing','furnishing','possession_status','area_unit','price_type')
                  AND deleted_at IS NOT NULL");
    $log[] = 'master options seeded';

    echo json_encode([
        'ok' => true,
        'message' => 'Masters patch applied',
        'log' => $log,
        'categories' => $pdo->query('SELECT id,name,slug FROM property_categories WHERE deleted_at IS NULL AND is_active=1 ORDER BY sort_order')->fetchAll(),
        'types' => $pdo->query('SELECT id,category_id,name,slug FROM property_types WHERE deleted_at IS NULL AND is_active=1 ORDER BY sort_order')->fetchAll(),
        'locations' => $pdo->query('SELECT id,name,slug,city FROM locations WHERE deleted_at IS NULL AND is_active=1 ORDER BY sort_order')->fetchAll(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
}
