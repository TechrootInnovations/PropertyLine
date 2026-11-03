<?php
/**
 * One-time import of the property catalog (categories, 27 property types, 1138 type fields)
 * from sql/property_catalog.json (generated from the client's Excel workbook).
 * Safe to re-run: upserts by slug / (sub_category, field_key); never deletes listings.
 * Visit: /api/import_catalog.php?key=tnx-catalog-2026  — DELETE this file after success.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

if (($_GET['key'] ?? '') !== 'tnx-catalog-2026') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Forbidden']);
    exit;
}

function envFile(string $path): array
{
    $env = [];
    if (!is_file($path)) {
        return $env;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $env[trim($k)] = trim(trim($v), " \t\"'");
    }
    return $env;
}

function hasColumn(PDO $pdo, string $table, string $col): bool
{
    $st = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $st->execute([$table, $col]);
    return (int) $st->fetchColumn() > 0;
}

try {
    $env = envFile(__DIR__ . '/.env');
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $env['DB_HOST'] ?? 'localhost', $env['DB_NAME'] ?? ''),
        $env['DB_USER'] ?? '',
        $env['DB_PASSWORD'] ?? '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    $catalog = json_decode((string) file_get_contents(__DIR__ . '/sql/property_catalog.json'), true);
    if (!is_array($catalog) || empty($catalog['categories'])) {
        throw new RuntimeException('property_catalog.json missing or invalid');
    }
    $log = [];

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
      UNIQUE KEY uk_field_def (sub_category, field_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    if (!hasColumn($pdo, 'property_field_definitions', 'options')) {
        $pdo->exec('ALTER TABLE property_field_definitions ADD COLUMN options TEXT NULL');
        $log[] = 'added property_field_definitions.options';
    }

    $pdo->beginTransaction();

    $upCat = $pdo->prepare(
        'INSERT INTO property_categories (name, slug, icon, description, sort_order, is_active, deleted_at)
         VALUES (?,?,?,?,?,1,NULL)
         ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), description=VALUES(description),
           sort_order=VALUES(sort_order), is_active=1, deleted_at=NULL'
    );
    $catId = $pdo->prepare('SELECT id FROM property_categories WHERE slug = ? LIMIT 1');
    $upType = $pdo->prepare(
        'INSERT INTO property_types (category_id, name, slug, sort_order, is_active, deleted_at)
         VALUES (?,?,?,?,1,NULL)
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), name=VALUES(name),
           sort_order=VALUES(sort_order), is_active=1, deleted_at=NULL'
    );
    $types = 0;
    foreach ($catalog['categories'] as $c) {
        $upCat->execute([$c['name'], $c['slug'], $c['icon'] ?? null, $c['description'] ?? null, (int) $c['sort_order']]);
        $catId->execute([$c['slug']]);
        $cid = (int) $catId->fetchColumn();
        foreach ($c['types'] as $t) {
            $upType->execute([$cid, $t['name'], $t['slug'], (int) $t['sort_order']]);
            $types++;
        }
    }
    $log[] = count($catalog['categories']) . ' categories, ' . $types . ' property types upserted';

    $upField = $pdo->prepare(
        'INSERT INTO property_field_definitions
          (main_category, sub_category, section, field_name, field_key, field_type, options, is_required, sort_order, is_active)
         VALUES (?,?,?,?,?,?,?,?,?,1)
         ON DUPLICATE KEY UPDATE main_category=VALUES(main_category), section=VALUES(section), field_name=VALUES(field_name),
           field_type=VALUES(field_type), options=VALUES(options), is_required=VALUES(is_required),
           sort_order=VALUES(sort_order), is_active=1'
    );
    foreach ($catalog['fields'] as $f) {
        $upField->execute([
            $f['main_category'],
            $f['sub_category'],
            $f['section'] ?: 'Details',
            $f['field_name'],
            $f['field_key'],
            $f['field_type'] ?: 'text',
            !empty($f['options']) ? json_encode($f['options'], JSON_UNESCAPED_UNICODE) : null,
            !empty($f['required']) ? 1 : 0,
            (int) $f['sort_order'],
        ]);
    }
    $log[] = count($catalog['fields']) . ' type fields upserted';

    $upOpt = $pdo->prepare('INSERT IGNORE INTO master_options (master_type, name, value, sort_order, is_active) VALUES (?,?,?,?,1)');
    $added = 0;
    foreach ($catalog['master_options'] ?? [] as $o) {
        $upOpt->execute([$o['master_type'], $o['name'], $o['value'], (int) $o['sort_order']]);
        $added += $upOpt->rowCount();
    }
    $log[] = $added . ' new dropdown options added (existing kept)';

    $pdo->commit();
    echo json_encode(['ok' => true, 'log' => $log], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
}
