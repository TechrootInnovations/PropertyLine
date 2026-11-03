<?php
/**
 * Admin CRM / listing routes (PHP engine) — mirrors the Node API in src/.
 * Included from index.php before the legacy handlers, so routes defined here win.
 * Expects $pdo, $env, $method, $path in scope. Each handler ends with jsonOk/jsonFail (exit).
 */
declare(strict_types=1);

const CRM_ENQ_STATUSES = ['new', 'in_progress', 'contacted', 'converted', 'closed', 'spam'];
const CRM_LEAD_TYPES = ['normal', 'hot', 'warm', 'cold'];
const CRM_OPEN_SQL = "e.status IN ('new','in_progress','contacted')";

function crmColumnExists(PDO $pdo, string $table, string $col): bool
{
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $st->execute([$table, $col]);
    return (int) $st->fetchColumn() > 0;
}

/** Idempotent schema upgrade; a marker file skips the checks after the first success. */
function ensureCrmTables(PDO $pdo): void
{
    static $done = false;
    $marker = __DIR__ . '/.schema_crm_v1';
    if ($done || is_file($marker)) {
        $done = true;
        return;
    }
    ensureMasterTables($pdo);
    $pdo->exec("CREATE TABLE IF NOT EXISTS amenity_property_types (
      amenity_id INT UNSIGNED NOT NULL,
      type_id INT UNSIGNED NOT NULL,
      PRIMARY KEY (amenity_id, type_id),
      KEY idx_apt_type (type_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS enquiry_followups (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      enquiry_id BIGINT UNSIGNED NOT NULL,
      comment TEXT NOT NULL,
      client_feedback TEXT,
      contact_mode VARCHAR(30) DEFAULT NULL,
      previous_status VARCHAR(30) DEFAULT NULL,
      status VARCHAR(30) DEFAULT NULL,
      next_follow_up_date DATE DEFAULT NULL,
      created_by BIGINT UNSIGNED DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_fu_enquiry (enquiry_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $st = $pdo->query(
        "SELECT DATA_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'enquiries' AND COLUMN_NAME = 'status'"
    );
    if ($st->fetchColumn() === 'enum') {
        $pdo->exec("ALTER TABLE enquiries MODIFY status VARCHAR(30) NOT NULL DEFAULT 'new'");
    }
    $cols = [
        'city' => 'VARCHAR(100) DEFAULT NULL',
        'property_type_id' => 'INT UNSIGNED DEFAULT NULL',
        'lead_type' => "VARCHAR(30) NOT NULL DEFAULT 'normal'",
        'follow_up_date' => 'DATE DEFAULT NULL',
        'source' => "VARCHAR(30) NOT NULL DEFAULT 'website'",
        'created_by' => 'BIGINT UNSIGNED DEFAULT NULL',
    ];
    foreach ($cols as $col => $def) {
        if (!crmColumnExists($pdo, 'enquiries', $col)) {
            $pdo->exec("ALTER TABLE enquiries ADD COLUMN {$col} {$def}");
        }
    }
    @file_put_contents($marker, date('c'));
    $done = true;
}

function crmUuid(): string
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function crmDate($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $s = substr((string) $value, 0, 10);
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) ? $s : null;
}

function crmIntOrNull($value): ?int
{
    return ($value === null || $value === '' || (int) $value <= 0) ? null : (int) $value;
}

function crmPaging(int $defaultLimit = 20): array
{
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int) ($_GET['limit'] ?? $defaultLimit)));
    return [$page, $limit, ($page - 1) * $limit];
}

function crmMeta(int $page, int $limit, int $total, array $extra = []): array
{
    return array_merge([
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'totalPages' => max(1, (int) ceil($total / max(1, $limit))),
    ], $extra);
}

function crmIntCols(array $row, array $keys): array
{
    foreach ($keys as $k) {
        if (array_key_exists($k, $row) && $row[$k] !== null) {
            $row[$k] = (int) $row[$k];
        }
    }
    return $row;
}

/* ——— Amenities ——— */

function crmAmenityList(PDO $pdo, bool $activeOnly, ?int $typeId): array
{
    $params = [];
    $typeSql = '';
    if ($typeId) {
        $typeSql = ' AND (
          NOT EXISTS (SELECT 1 FROM amenity_property_types x WHERE x.amenity_id = a.id)
          OR EXISTS (SELECT 1 FROM amenity_property_types x WHERE x.amenity_id = a.id AND x.type_id = ?)
        )';
        $params[] = $typeId;
    }
    $st = $pdo->prepare(
        "SELECT a.id, a.name, a.slug, a.icon, a.amenity_group, a.sort_order, a.is_active,
                GROUP_CONCAT(DISTINCT apt.type_id ORDER BY apt.type_id) AS type_ids_csv
         FROM amenities a
         LEFT JOIN amenity_property_types apt ON apt.amenity_id = a.id
         WHERE a.deleted_at IS NULL" . ($activeOnly ? ' AND a.is_active = 1' : '') . $typeSql . "
         GROUP BY a.id, a.name, a.slug, a.icon, a.amenity_group, a.sort_order, a.is_active
         ORDER BY a.sort_order, a.name"
    );
    $st->execute($params);
    $rows = [];
    foreach ($st->fetchAll() as $r) {
        $csv = $r['type_ids_csv'];
        unset($r['type_ids_csv']);
        $r = crmIntCols($r, ['id', 'sort_order', 'is_active']);
        $r['type_ids'] = $csv ? array_values(array_filter(array_map('intval', explode(',', (string) $csv)))) : [];
        $rows[] = $r;
    }
    return $rows;
}

function crmSetAmenityTypes(PDO $pdo, int $amenityId, $typeIds): void
{
    if (!is_array($typeIds)) {
        return;
    }
    $pdo->prepare('DELETE FROM amenity_property_types WHERE amenity_id = ?')->execute([$amenityId]);
    $ins = $pdo->prepare('INSERT IGNORE INTO amenity_property_types (amenity_id, type_id) VALUES (?, ?)');
    foreach (array_unique(array_map('intval', $typeIds)) as $tid) {
        if ($tid > 0) {
            $ins->execute([$amenityId, $tid]);
        }
    }
}

/* ——— Property extra details ——— */

function crmDecodeExtras($value): array
{
    if (is_array($value)) {
        return $value;
    }
    if (!$value) {
        return [];
    }
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : [];
}

function crmExtraDetails(PDO $pdo, ?string $typeName, array $extras): array
{
    $entries = array_filter($extras, static fn ($v) => $v !== null && trim(is_array($v) ? implode(',', $v) : (string) $v) !== '');
    if (!$entries) {
        return [];
    }
    $defs = [];
    if ($typeName) {
        try {
            $st = $pdo->prepare('SELECT field_key, field_name, section, sort_order, field_type FROM property_field_definitions WHERE sub_category = ? AND is_active = 1');
            $st->execute([$typeName]);
            foreach ($st->fetchAll() as $d) {
                $defs[$d['field_key']] = $d;
            }
        } catch (Throwable $e) {
            $defs = [];
        }
    }
    $out = [];
    foreach ($entries as $key => $value) {
        $def = $defs[$key] ?? null;
        $type = (string) ($def['field_type'] ?? 'text');
        $text = is_array($value) ? implode(', ', $value) : (string) $value;
        if ($type === 'yesno' && strcasecmp(trim($text), 'no') === 0) {
            continue; // only show features that are present
        }
        $out[] = [
            'key' => (string) $key,
            'label' => $def['field_name'] ?? ucwords(str_replace(['-', '_'], ' ', (string) $key)),
            'section' => $def['section'] ?? 'Additional Details',
            'type' => $type,
            // documents stay private: the public page only learns they exist
            'value' => $type === 'upload' ? 'Available' : $text,
            'sort_order' => $def ? (int) $def['sort_order'] : 9999,
        ];
    }
    usort($out, static fn ($a, $b) => $a['sort_order'] <=> $b['sort_order']);
    return $out;
}

function crmPropertyAmenities(PDO $pdo, int $propertyId): array
{
    $st = $pdo->prepare(
        'SELECT a.id, a.name, a.slug, a.icon, a.amenity_group
         FROM property_amenities pa
         JOIN amenities a ON a.id = pa.amenity_id AND a.deleted_at IS NULL
         WHERE pa.property_id = ? ORDER BY a.sort_order, a.name'
    );
    $st->execute([$propertyId]);
    return array_map(static fn ($r) => crmIntCols($r, ['id']), $st->fetchAll());
}

function crmPropertyImages(PDO $pdo, int $propertyId): array
{
    $st = $pdo->prepare(
        'SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order
         FROM property_images WHERE property_id = ? AND deleted_at IS NULL
         ORDER BY is_primary DESC, sort_order, id'
    );
    $st->execute([$propertyId]);
    return $st->fetchAll();
}

/* ——— Enquiries ——— */

const CRM_ENQ_FROM = '
  FROM enquiries e
  LEFT JOIN properties p ON p.id = e.property_id
  LEFT JOIN property_types t ON t.id = COALESCE(e.property_type_id, p.type_id)';

function crmTabSql(string $tab): ?string
{
    return match ($tab) {
        'today' => 'DATE(e.created_at) = CURDATE()',
        'pending' => CRM_OPEN_SQL,
        'followup' => 'e.follow_up_date IS NOT NULL AND e.follow_up_date <= CURDATE() AND ' . CRM_OPEN_SQL,
        'converted' => "e.status = 'converted'",
        'closed' => "e.status = 'closed'",
        default => null,
    };
}

function crmEnquiryFilters(): array
{
    $where = ['e.deleted_at IS NULL'];
    $params = [];
    foreach (['status', 'lead_type', 'enquiry_type'] as $k) {
        if (!empty($_GET[$k])) {
            $where[] = "e.{$k} = ?";
            $params[] = (string) $_GET[$k];
        }
    }
    if (!empty($_GET['type_id'])) {
        $where[] = 'COALESCE(e.property_type_id, p.type_id) = ?';
        $params[] = (int) $_GET['type_id'];
    }
    if (!empty($_GET['property_id'])) {
        $where[] = 'e.property_id = ?';
        $params[] = (int) $_GET['property_id'];
    }
    if ($from = crmDate($_GET['date_from'] ?? null)) {
        $where[] = 'DATE(e.created_at) >= ?';
        $params[] = $from;
    }
    if ($to = crmDate($_GET['date_to'] ?? null)) {
        $where[] = 'DATE(e.created_at) <= ?';
        $params[] = $to;
    }
    if (!empty($_GET['q'])) {
        $q = '%' . trim((string) $_GET['q']) . '%';
        $cols = ['e.name', 'e.mobile', 'e.email', 'e.city', 'e.property_title', 'e.property_code', 'p.title', 't.name', "CONCAT('INQ', LPAD(e.id, 6, '0'))"];
        $where[] = '(' . implode(' OR ', array_map(static fn ($c) => "{$c} LIKE ?", $cols)) . ')';
        foreach ($cols as $_) {
            $params[] = $q;
        }
    }
    return [$where, $params];
}

function crmFollowUps(PDO $pdo, int $enquiryId): array
{
    $st = $pdo->prepare(
        "SELECT f.*, a.name AS admin_name, a.role AS admin_role
         FROM enquiry_followups f
         LEFT JOIN admin_users a ON a.id = f.created_by
         WHERE f.enquiry_id = ?
         ORDER BY f.created_at DESC, f.id DESC"
    );
    $st->execute([$enquiryId]);
    return array_map(static fn ($r) => crmIntCols($r, ['id', 'enquiry_id']), $st->fetchAll());
}

function crmGetEnquiry(PDO $pdo, int $id): array
{
    $st = $pdo->prepare(
        'SELECT e.*, COALESCE(p.title, e.property_title) AS property_name, p.slug AS property_slug,
                t.id AS type_id, t.name AS type_name' . CRM_ENQ_FROM . '
         WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1'
    );
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) {
        jsonFail('Enquiry not found', 404);
    }
    $row = crmIntCols($row, ['id', 'property_id', 'property_type_id', 'type_id']);
    $row['followups'] = crmFollowUps($pdo, $id);
    try {
        ensureMailTables($pdo);
        $el = $pdo->prepare('SELECT id, email_type, recipient, status, error, attempts, created_at, sent_at FROM email_logs WHERE enquiry_id = ? ORDER BY id');
        $el->execute([$id]);
        $row['email_logs'] = array_map(static fn ($r) => crmIntCols($r, ['id', 'attempts']), $el->fetchAll());
    } catch (Throwable $e) {
        $row['email_logs'] = [];
    }
    return $row;
}

function crmFindProperty(PDO $pdo, $propertyId): ?array
{
    $id = crmIntOrNull($propertyId);
    if (!$id) {
        return null;
    }
    $st = $pdo->prepare('SELECT id, property_code, title, type_id FROM properties WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

/* =============================================================================
   Routes
   ============================================================================= */

// Public amenities (optionally for one property type)
if ($method === 'GET' && $path === '/amenities') {
    ensureCrmTables($pdo);
    jsonOk(crmAmenityList($pdo, true, crmIntOrNull($_GET['type_id'] ?? null)));
}

// Public property detail — adds amenities + labelled additional details
if ($method === 'GET' && preg_match('#^/properties/([^/]+)$#', $path, $m)) {
    $st = $pdo->prepare(
        "SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                t.name AS type_name, t.slug AS type_slug,
                l.name AS location_name, l.slug AS location_slug
         FROM properties p
         JOIN property_categories c ON c.id = p.category_id AND c.deleted_at IS NULL
         JOIN property_types t ON t.id = p.type_id AND t.deleted_at IS NULL
         LEFT JOIN locations l ON l.id = p.location_id AND l.deleted_at IS NULL
         WHERE p.deleted_at IS NULL AND p.slug = ? AND p.status = 'published'
         LIMIT 1"
    );
    $st->execute([$m[1]]);
    $row = $st->fetch();
    if (!$row) {
        jsonFail('Property not found.', 404);
    }
    $pid = (int) $row['id'];
    $row['images'] = crmPropertyImages($pdo, $pid);
    $row['amenities'] = crmPropertyAmenities($pdo, $pid);
    $row['extra_attributes'] = crmDecodeExtras($row['extra_attributes'] ?? null);
    $row['extra_details'] = crmExtraDetails($pdo, $row['type_name'] ?? null, $row['extra_attributes']);
    $row['is_featured'] = (bool) $row['is_featured'];
    unset($row['seller_id'], $row['extra_attributes']);
    $pdo->prepare('UPDATE properties SET views_count = views_count + 1 WHERE id = ?')->execute([$pid]);
    jsonOk($row);
}

// Admin dashboard
if ($method === 'GET' && $path === '/admin/dashboard') {
    requireAuth($env);
    ensureCrmTables($pdo);
    $toInts = static fn ($row) => array_map(static fn ($v) => (int) $v, $row ?: []);
    $props = $toInts($pdo->query("SELECT
        COUNT(*) AS total_properties,
        COALESCE(SUM(status = 'published'), 0) AS active_properties,
        COALESCE(SUM(purpose = 'sale' AND status = 'published'), 0) AS sale_properties,
        COALESCE(SUM(purpose = 'rent' AND status = 'published'), 0) AS rent_properties,
        COALESCE(SUM(is_featured = 1 AND status = 'published'), 0) AS featured_properties,
        COALESCE(SUM(status = 'draft'), 0) AS draft_properties,
        COALESCE(SUM(status = 'sold'), 0) AS sold_properties,
        COALESCE(SUM(status = 'rented'), 0) AS rented_properties
      FROM properties WHERE deleted_at IS NULL")->fetch());
    $enq = $toInts($pdo->query("SELECT
        COUNT(*) AS total_enquiries,
        COALESCE(SUM(status = 'new'), 0) AS new_enquiries,
        COALESCE(SUM(status = 'in_progress'), 0) AS in_progress_enquiries,
        COALESCE(SUM(status IN ('new','in_progress','contacted')), 0) AS pending_enquiries,
        COALESCE(SUM(status = 'converted'), 0) AS converted_enquiries,
        COALESCE(SUM(status = 'closed'), 0) AS closed_enquiries,
        COALESCE(SUM(DATE(created_at) = CURDATE()), 0) AS today_enquiries,
        COALESCE(SUM(follow_up_date IS NOT NULL AND follow_up_date <= CURDATE()
            AND status IN ('new','in_progress','contacted')), 0) AS followups_due,
        COALESCE(SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)), 0) AS enquiries_last_7_days
      FROM enquiries WHERE deleted_at IS NULL")->fetch());
    $byType = array_map(
        static fn ($r) => crmIntCols($r, ['id', 'total', 'published', 'draft', 'sale', 'rent']),
        $pdo->query("SELECT t.id, t.name, t.slug, t.icon, c.name AS category_name,
            COUNT(p.id) AS total,
            COALESCE(SUM(p.status = 'published'), 0) AS published,
            COALESCE(SUM(p.status = 'draft'), 0) AS draft,
            COALESCE(SUM(p.purpose = 'sale'), 0) AS sale,
            COALESCE(SUM(p.purpose = 'rent'), 0) AS rent
          FROM property_types t
          LEFT JOIN property_categories c ON c.id = t.category_id
          LEFT JOIN properties p ON p.type_id = t.id AND p.deleted_at IS NULL
          WHERE t.deleted_at IS NULL
          GROUP BY t.id, t.name, t.slug, t.icon, c.name, t.sort_order
          HAVING MAX(t.is_active) = 1 OR COUNT(p.id) > 0
          ORDER BY t.sort_order, t.name")->fetchAll()
    );
    jsonOk([
        'properties' => $props,
        'enquiries' => $enq,
        'byType' => $byType,
        'recentEnquiries' => $pdo->query(
            'SELECT id, name, mobile, property_title, property_code, status, follow_up_date, created_at
             FROM enquiries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 8'
        )->fetchAll(),
        'upcomingFollowUps' => $pdo->query(
            "SELECT id, name, mobile, property_title, status, follow_up_date
             FROM enquiries
             WHERE deleted_at IS NULL AND follow_up_date IS NOT NULL AND status IN ('new','in_progress','contacted')
             ORDER BY follow_up_date ASC LIMIT 6"
        )->fetchAll(),
        'recentProperties' => $pdo->query(
            'SELECT id, title, slug, purpose, status, price, monthly_rent, main_image, created_at
             FROM properties WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 6'
        )->fetchAll(),
    ]);
}

// Admin property list — search, filters, pagination
if ($method === 'GET' && $path === '/admin/properties') {
    requireAuth($env);
    ensureMasterTables($pdo);
    [$page, $limit, $offset] = crmPaging(20);
    $where = ['p.deleted_at IS NULL'];
    $params = [];
    foreach (['status', 'purpose'] as $k) {
        if (!empty($_GET[$k])) {
            $where[] = "p.{$k} = ?";
            $params[] = (string) $_GET[$k];
        }
    }
    foreach (['type_id', 'location_id', 'seller_id', 'category_id'] as $k) {
        if (!empty($_GET[$k])) {
            $where[] = "p.{$k} = ?";
            $params[] = (int) $_GET[$k];
        }
    }
    if (!empty($_GET['q'])) {
        $q = '%' . trim((string) $_GET['q']) . '%';
        $cols = ['p.title', 'p.property_code', 'p.locality', 'p.city', 'p.address', 't.name', 'l.name', 's.name', 's.phone'];
        $where[] = '(' . implode(' OR ', array_map(static fn ($c) => "{$c} LIKE ?", $cols)) . ')';
        foreach ($cols as $_) {
            $params[] = $q;
        }
    }
    $from = ' FROM properties p
      LEFT JOIN property_categories c ON c.id = p.category_id
      LEFT JOIN property_types t ON t.id = p.type_id
      LEFT JOIN locations l ON l.id = p.location_id
      LEFT JOIN sellers s ON s.id = p.seller_id
      WHERE ' . implode(' AND ', $where);
    $count = $pdo->prepare('SELECT COUNT(*)' . $from);
    $count->execute($params);
    $total = (int) $count->fetchColumn();
    $order = match ($_GET['sort'] ?? 'created') {
        'price_asc' => 'COALESCE(p.price, p.monthly_rent) ASC',
        'price_desc' => 'COALESCE(p.price, p.monthly_rent) DESC',
        'newest' => 'p.published_at DESC, p.id DESC',
        default => 'p.created_at DESC, p.id DESC',
    };
    $st = $pdo->prepare(
        "SELECT p.id, p.uuid, p.property_code, p.title, p.slug, p.purpose, p.status, p.is_featured,
                p.short_description, p.price, p.price_display, p.monthly_rent, p.currency,
                p.bedrooms, p.bathrooms, p.carpet_area, p.builtup_area, p.plot_area, p.area_unit,
                p.main_image, p.locality, p.city, p.state, p.views_count, p.published_at, p.created_at,
                p.category_id, p.type_id, p.location_id, p.seller_id,
                c.name AS category_name, t.name AS type_name, t.slug AS type_slug,
                l.name AS location_name, l.slug AS location_slug,
                s.name AS seller_name, s.phone AS seller_phone,
                (SELECT COUNT(*) FROM enquiries e WHERE e.property_id = p.id AND e.deleted_at IS NULL) AS enquiries_count"
        . $from . " ORDER BY {$order} LIMIT {$limit} OFFSET {$offset}"
    );
    $st->execute($params);
    $rows = array_map(static function ($r) {
        $r = crmIntCols($r, ['id', 'type_id', 'location_id', 'seller_id', 'category_id', 'enquiries_count', 'bedrooms', 'bathrooms']);
        $r['is_featured'] = (bool) $r['is_featured'];
        return $r;
    }, $st->fetchAll());
    jsonOk($rows, crmMeta($page, $limit, $total));
}

// Admin single property — with amenity ids, seller, decoded extras
if ($method === 'GET' && preg_match('#^/admin/properties/(\d+)$#', $path, $m)) {
    requireAuth($env);
    ensureMasterTables($pdo);
    $st = $pdo->prepare(
        "SELECT p.*, c.name AS category_name, t.name AS type_name, l.name AS location_name
         FROM properties p
         LEFT JOIN property_categories c ON c.id = p.category_id
         LEFT JOIN property_types t ON t.id = p.type_id
         LEFT JOIN locations l ON l.id = p.location_id
         WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1"
    );
    $st->execute([(int) $m[1]]);
    $row = $st->fetch();
    if (!$row) {
        jsonFail('Property not found.', 404);
    }
    $pid = (int) $row['id'];
    $row['images'] = crmPropertyImages($pdo, $pid);
    $row['amenities'] = crmPropertyAmenities($pdo, $pid);
    $row['amenity_ids'] = array_column($row['amenities'], 'id');
    $row['extra_attributes'] = crmDecodeExtras($row['extra_attributes'] ?? null);
    $row['extra_details'] = crmExtraDetails($pdo, $row['type_name'] ?? null, $row['extra_attributes']);
    if (!empty($row['seller_id'])) {
        $s = $pdo->prepare('SELECT id, name, company_name, phone, email FROM sellers WHERE id = ?');
        $s->execute([(int) $row['seller_id']]);
        $row['seller'] = $s->fetch() ?: null;
    }
    jsonOk($row);
}

// Admin amenities — with property-type mapping
if ($method === 'GET' && $path === '/admin/amenities') {
    requireAuth($env);
    ensureCrmTables($pdo);
    jsonOk(crmAmenityList($pdo, false, crmIntOrNull($_GET['type_id'] ?? null)));
}
if (($method === 'POST' && $path === '/admin/amenities') || ($method === 'PUT' && preg_match('#^/admin/amenities/(\d+)$#', $path, $m))) {
    requireAuth($env);
    ensureCrmTables($pdo);
    $b = bodyJson();
    $name = trim((string) ($b['name'] ?? ''));
    if ($name === '') {
        jsonFail('Name is required', 422);
    }
    $values = [
        $name,
        toSlug((string) (($b['slug'] ?? '') !== '' ? $b['slug'] : $name)),
        ($b['icon'] ?? '') !== '' ? $b['icon'] : null,
        ($b['amenity_group'] ?? '') !== '' ? $b['amenity_group'] : 'general',
        (int) ($b['sort_order'] ?? 0),
        toActiveFlag($b['is_active'] ?? true),
    ];
    if ($method === 'POST') {
        $pdo->prepare('INSERT INTO amenities (name, slug, icon, amenity_group, sort_order, is_active) VALUES (?,?,?,?,?,?)')->execute($values);
        $id = (int) $pdo->lastInsertId();
    } else {
        $id = (int) $m[1];
        $values[] = $id;
        $pdo->prepare('UPDATE amenities SET name=?, slug=?, icon=?, amenity_group=?, sort_order=?, is_active=? WHERE id=? AND deleted_at IS NULL')->execute($values);
    }
    crmSetAmenityTypes($pdo, $id, $b['type_ids'] ?? null);
    jsonOk(fetchById($pdo, 'amenities', $id), null, $method === 'POST' ? 201 : 200);
}

// Enquiries list — tabs, search, filters, pagination, tab counts
if ($method === 'GET' && $path === '/admin/enquiries') {
    requireAuth($env);
    ensureCrmTables($pdo);
    [$page, $limit, $offset] = crmPaging(20);
    [$where, $params] = crmEnquiryFilters();

    $baseWhere = implode(' AND ', $where);
    $tabs = ['today', 'pending', 'followup', 'converted', 'closed'];
    $sums = implode(', ', array_map(static fn ($t) => 'COALESCE(SUM(' . crmTabSql($t) . "), 0) AS {$t}", $tabs));
    $cst = $pdo->prepare("SELECT COUNT(*) AS `all`, {$sums}" . CRM_ENQ_FROM . " WHERE {$baseWhere}");
    $cst->execute($params);
    $counts = array_map(static fn ($v) => (int) $v, $cst->fetch() ?: []);

    $tabSql = crmTabSql((string) ($_GET['tab'] ?? ''));
    if ($tabSql) {
        $where[] = $tabSql;
    }
    $whereSql = implode(' AND ', $where);
    $count = $pdo->prepare('SELECT COUNT(*)' . CRM_ENQ_FROM . " WHERE {$whereSql}");
    $count->execute($params);
    $total = (int) $count->fetchColumn();

    $st = $pdo->prepare(
        'SELECT e.*, COALESCE(p.title, e.property_title) AS property_name, p.slug AS property_slug,
                t.id AS type_id, t.name AS type_name,
                (SELECT COUNT(*) FROM enquiry_followups f WHERE f.enquiry_id = e.id) AS followups_count'
        . CRM_ENQ_FROM . " WHERE {$whereSql}
         ORDER BY e.created_at DESC, e.id DESC LIMIT {$limit} OFFSET {$offset}"
    );
    $st->execute($params);
    $rows = array_map(static fn ($r) => crmIntCols($r, ['id', 'property_id', 'property_type_id', 'type_id', 'followups_count']), $st->fetchAll());
    jsonOk($rows, crmMeta($page, $limit, $total, ['counts' => $counts]));
}

// Admin: add inquiry
if ($method === 'POST' && $path === '/admin/enquiries') {
    $auth = requireAuth($env);
    ensureCrmTables($pdo);
    $b = bodyJson();
    $name = trim((string) ($b['name'] ?? ''));
    $mobile = trim((string) ($b['mobile'] ?? ''));
    if (strlen($name) < 2) {
        jsonFail('Validation failed', 422, [['field' => 'name', 'message' => 'Name is required']]);
    }
    if (!preg_match('/^[+\d][\d\s-]{6,19}$/', $mobile)) {
        jsonFail('Enter a valid contact number', 422);
    }
    $email = trim((string) ($b['email'] ?? ''));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonFail('Enter a valid email', 422);
    }
    $property = crmFindProperty($pdo, $b['property_id'] ?? null);
    $status = in_array($b['status'] ?? '', CRM_ENQ_STATUSES, true) ? $b['status'] : 'new';
    $lead = in_array($b['lead_type'] ?? '', CRM_LEAD_TYPES, true) ? $b['lead_type'] : 'normal';
    $pref = in_array($b['preferred_contact'] ?? '', ['call', 'whatsapp', 'email', 'any'], true) ? $b['preferred_contact'] : 'any';
    $pdo->prepare(
        'INSERT INTO enquiries (uuid, enquiry_type, property_id, property_code, property_title, property_type_id,
          name, mobile, email, city, preferred_contact, message, status, lead_type, follow_up_date, source, created_by,
          ip_address, user_agent)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        crmUuid(),
        $property ? 'property' : 'contact',
        $property['id'] ?? null,
        $property['property_code'] ?? null,
        $property['title'] ?? (($b['property_title'] ?? '') ?: null),
        $property['type_id'] ?? crmIntOrNull($b['property_type_id'] ?? null),
        $name,
        $mobile,
        $email ?: null,
        trim((string) ($b['city'] ?? '')) ?: null,
        $pref,
        trim((string) ($b['message'] ?? '')) ?: null,
        $status,
        $lead,
        crmDate($b['follow_up_date'] ?? null),
        'admin',
        (int) $auth['sub'],
        $_SERVER['REMOTE_ADDR'] ?? null,
        substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
    ]);
    jsonOk(crmGetEnquiry($pdo, (int) $pdo->lastInsertId()), null, 201);
}

// Admin: follow-ups
if (preg_match('#^/admin/enquiries/(\d+)/followups$#', $path, $m) && in_array($method, ['GET', 'POST'], true)) {
    $auth = requireAuth($env);
    ensureCrmTables($pdo);
    $id = (int) $m[1];
    if ($method === 'GET') {
        jsonOk(crmFollowUps($pdo, $id));
    }
    $b = bodyJson();
    $comment = trim((string) ($b['comment'] ?? ''));
    if ($comment === '') {
        jsonFail('Comment is required', 422);
    }
    $cur = $pdo->prepare('SELECT status FROM enquiries WHERE id = ? AND deleted_at IS NULL');
    $cur->execute([$id]);
    $previous = $cur->fetchColumn();
    if ($previous === false) {
        jsonFail('Enquiry not found', 404);
    }
    $status = ($b['status'] ?? '') !== '' ? (string) $b['status'] : (string) $previous;
    if (!in_array($status, CRM_ENQ_STATUSES, true)) {
        jsonFail('Invalid status', 400);
    }
    $next = crmDate($b['next_follow_up_date'] ?? null);
    $pdo->prepare(
        'INSERT INTO enquiry_followups (enquiry_id, comment, client_feedback, contact_mode, previous_status, status, next_follow_up_date, created_by)
         VALUES (?,?,?,?,?,?,?,?)'
    )->execute([
        $id,
        $comment,
        trim((string) ($b['client_feedback'] ?? '')) ?: null,
        ($b['contact_mode'] ?? '') ?: null,
        $previous,
        $status,
        $next,
        (int) $auth['sub'],
    ]);
    $pdo->prepare('UPDATE enquiries SET status = ?, follow_up_date = ?, responded_at = COALESCE(responded_at, NOW()) WHERE id = ?')
        ->execute([$status, $next, $id]);
    jsonOk(crmGetEnquiry($pdo, $id), null, 201);
}

// Admin: single inquiry (view / edit / delete)
if (preg_match('#^/admin/enquiries/(\d+)$#', $path, $m) && in_array($method, ['GET', 'PATCH', 'PUT', 'DELETE'], true)) {
    requireAuth($env);
    ensureCrmTables($pdo);
    $id = (int) $m[1];
    if ($method === 'GET') {
        jsonOk(crmGetEnquiry($pdo, $id));
    }
    if ($method === 'DELETE') {
        $st = $pdo->prepare('UPDATE enquiries SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
        $st->execute([$id]);
        if (!$st->rowCount()) {
            jsonFail('Enquiry not found', 404);
        }
        jsonOk(['message' => 'Enquiry deleted']);
    }

    $b = bodyJson();
    $sets = [];
    $params = [];
    if (array_key_exists('status', $b)) {
        if (!in_array($b['status'], CRM_ENQ_STATUSES, true)) {
            jsonFail('Invalid status', 400);
        }
        $sets[] = 'status = ?';
        $params[] = $b['status'];
        if (in_array($b['status'], ['contacted', 'converted', 'closed'], true)) {
            $sets[] = 'responded_at = COALESCE(responded_at, NOW())';
        }
    }
    if (array_key_exists('lead_type', $b)) {
        if (!in_array($b['lead_type'], CRM_LEAD_TYPES, true)) {
            jsonFail('Invalid lead type', 400);
        }
        $sets[] = 'lead_type = ?';
        $params[] = $b['lead_type'];
    }
    foreach (['name', 'mobile'] as $k) {
        if (array_key_exists($k, $b) && trim((string) $b[$k]) !== '') {
            $sets[] = "{$k} = ?";
            $params[] = trim((string) $b[$k]);
        }
    }
    foreach (['email', 'city', 'message', 'admin_notes'] as $k) {
        if (array_key_exists($k, $b)) {
            $sets[] = "{$k} = ?";
            $params[] = trim((string) ($b[$k] ?? '')) ?: null;
        }
    }
    if (array_key_exists('preferred_contact', $b) && in_array($b['preferred_contact'], ['call', 'whatsapp', 'email', 'any'], true)) {
        $sets[] = 'preferred_contact = ?';
        $params[] = $b['preferred_contact'];
    }
    if (array_key_exists('follow_up_date', $b)) {
        $sets[] = 'follow_up_date = ?';
        $params[] = crmDate($b['follow_up_date']);
    }
    $typeId = array_key_exists('property_type_id', $b) ? crmIntOrNull($b['property_type_id']) : null;
    if (array_key_exists('property_id', $b)) {
        $property = crmFindProperty($pdo, $b['property_id']);
        array_push($sets, 'property_id = ?', 'property_code = ?', 'property_title = ?');
        array_push($params, $property['id'] ?? null, $property['property_code'] ?? null, $property['title'] ?? null);
        if ($property) {
            $sets[] = "enquiry_type = 'property'";
            if (!array_key_exists('property_type_id', $b)) {
                $typeId = (int) $property['type_id'];
                $sets[] = 'property_type_id = ?';
                $params[] = $typeId;
            }
        }
    }
    if (array_key_exists('property_type_id', $b)) {
        $sets[] = 'property_type_id = ?';
        $params[] = $typeId;
    }
    if (!$sets) {
        jsonFail('No fields to update', 400);
    }
    $params[] = $id;
    $st = $pdo->prepare('UPDATE enquiries SET ' . implode(', ', $sets) . ' WHERE id = ? AND deleted_at IS NULL');
    $st->execute($params);
    jsonOk(crmGetEnquiry($pdo, $id));
}

/* =============================================================================
   Site v2 — content pages, brochure/floor plan/RERA, media types, inquiry email,
   property videos. Own schema marker so it runs once even where v1 already ran.
   ============================================================================= */

const SITE_CONTENT_KEYS = ['about_page', 'services_page', 'team_page', 'blog_posts', 'privacy_policy', 'terms_page'];

function ensureSiteV2(PDO $pdo): void
{
    static $done = false;
    $marker = __DIR__ . '/.schema_site_v2';
    if ($done || is_file($marker)) {
        $done = true;
        return;
    }
    ensureCrmTables($pdo);
    foreach ([
        'brochure_url' => 'VARCHAR(500) DEFAULT NULL',
        'floor_plan_url' => 'VARCHAR(500) DEFAULT NULL',
        'rera_number' => 'VARCHAR(120) DEFAULT NULL',
    ] as $col => $def) {
        if (!crmColumnExists($pdo, 'properties', $col)) {
            $pdo->exec("ALTER TABLE properties ADD COLUMN {$col} {$def}");
        }
    }
    if (!crmColumnExists($pdo, 'property_field_definitions', 'options')) {
        $pdo->exec('ALTER TABLE property_field_definitions ADD COLUMN options TEXT NULL');
    }
    @file_put_contents($marker, date('c'));
    $done = true;
}

/** Saves the v2 property columns (called after the legacy create/update statements). */
function crmSaveExtraColumns(PDO $pdo, int $id, array $b): void
{
    ensureSiteV2($pdo);
    $sets = [];
    $params = [];
    foreach (['brochure_url', 'floor_plan_url', 'rera_number', 'virtual_tour_url'] as $k) {
        if (array_key_exists($k, $b)) {
            $sets[] = "{$k} = ?";
            $v = trim((string) ($b[$k] ?? ''));
            $params[] = $v === '' ? null : substr($v, 0, 500);
        }
    }
    if (!$sets) {
        return;
    }
    $params[] = $id;
    $pdo->prepare('UPDATE properties SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
}

function crmSetting(PDO $pdo, string $key): ?string
{
    $st = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $st->execute([$key]);
    $v = $st->fetchColumn();
    return $v === false ? null : (string) $v;
}

/* =============================================================================
   Email notifications — configurable SMTP (or PHP mail fallback) with a full
   email transaction log (email_logs). Inquiry + log rows are written in one DB
   transaction; delivery happens after commit so an email problem never loses a lead.
   ============================================================================= */

const MAIL_SETTING_KEYS = [
    'mail_enabled', 'mail_transport', 'smtp_host', 'smtp_port', 'smtp_encryption', 'smtp_username',
    'smtp_password', 'mail_from_email', 'mail_from_name', 'notify_email', 'send_customer_ack',
];

function ensureMailTables(PDO $pdo): void
{
    static $done = false;
    $marker = __DIR__ . '/.schema_mail_v1';
    if ($done || is_file($marker)) {
        $done = true;
        return;
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS email_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      enquiry_id BIGINT UNSIGNED DEFAULT NULL,
      email_type VARCHAR(30) NOT NULL,
      recipient VARCHAR(500) NOT NULL,
      subject VARCHAR(300) NOT NULL,
      body MEDIUMTEXT,
      reply_to VARCHAR(190) DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'queued',
      transport VARCHAR(20) DEFAULT NULL,
      error TEXT,
      attempts INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_el_status (status, created_at),
      KEY idx_el_enquiry (enquiry_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    @file_put_contents($marker, date('c'));
    $done = true;
}

function crmMailKey(): string
{
    global $env;
    return hash('sha256', (string) ($env['JWT_SECRET'] ?? 'dev') . '|mail-settings', true);
}

function crmEncrypt(string $plain): string
{
    if ($plain === '') {
        return '';
    }
    $iv = random_bytes(16);
    $cipher = openssl_encrypt($plain, 'aes-256-cbc', crmMailKey(), OPENSSL_RAW_DATA, $iv);
    return 'enc:' . base64_encode($iv . $cipher);
}

function crmDecrypt(string $stored): string
{
    if (strpos($stored, 'enc:') !== 0) {
        return $stored;
    }
    $raw = base64_decode(substr($stored, 4), true);
    if ($raw === false || strlen($raw) < 17) {
        return '';
    }
    $plain = openssl_decrypt(substr($raw, 16), 'aes-256-cbc', crmMailKey(), OPENSSL_RAW_DATA, substr($raw, 0, 16));
    return $plain === false ? '' : $plain;
}

/** Effective mail configuration (password decrypted — server use only). */
function crmMailConfig(PDO $pdo): array
{
    $in = implode(',', array_fill(0, count(MAIL_SETTING_KEYS) + 3, '?'));
    $st = $pdo->prepare("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ($in)");
    $st->execute(array_merge(MAIL_SETTING_KEYS, ['email', 'site_name', 'site_url']));
    $v = [];
    foreach ($st->fetchAll() as $r) {
        $v[$r['setting_key']] = (string) $r['setting_value'];
    }
    $siteUrl = rtrim(($v['site_url'] ?? '') ?: ('https://' . ($_SERVER['HTTP_HOST'] ?? 'terranexusproperties.com')), '/');
    $domain = preg_replace('/^www\./', '', (string) (parse_url($siteUrl, PHP_URL_HOST) ?: 'terranexusproperties.com'));
    $recipients = array_values(array_filter(array_map('trim', preg_split('/[,;\s]+/', (string) (($v['notify_email'] ?? '') ?: ($v['email'] ?? ''))) ?: []), static fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL)));
    $host = trim($v['smtp_host'] ?? '');
    $transport = ($v['mail_transport'] ?? '') ?: ($host !== '' ? 'smtp' : 'phpmail');
    return [
        'enabled' => ($v['mail_enabled'] ?? 'true') !== 'false',
        'transport' => $transport === 'smtp' && $host !== '' ? 'smtp' : 'phpmail',
        'smtp_host' => $host,
        'smtp_port' => (int) (($v['smtp_port'] ?? '') ?: 465),
        'smtp_encryption' => in_array($v['smtp_encryption'] ?? '', ['ssl', 'tls', 'none'], true) ? $v['smtp_encryption'] : 'ssl',
        'smtp_username' => trim($v['smtp_username'] ?? ''),
        'smtp_password' => crmDecrypt((string) ($v['smtp_password'] ?? '')),
        'from_email' => trim(($v['mail_from_email'] ?? '') ?: (trim($v['smtp_username'] ?? '') ?: 'noreply@' . $domain)),
        'from_name' => trim(($v['mail_from_name'] ?? '') ?: (($v['site_name'] ?? '') ?: 'Terranexus Properties')),
        'recipients' => $recipients,
        'customer_ack' => ($v['send_customer_ack'] ?? 'false') === 'true',
        'site_name' => ($v['site_name'] ?? '') ?: 'Terranexus Properties',
        'site_url' => $siteUrl,
        'domain' => $domain,
    ];
}

function crmEncodeHeader(string $s): string
{
    return preg_match('/[^\x20-\x7E]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s;
}

/** Minimal SMTP client: SSL (465) or STARTTLS (587), AUTH LOGIN. Returns [ok, error]. */
function crmSmtpSend(array $c, array $to, string $subject, string $html, ?string $replyTo = null): array
{
    $remote = ($c['smtp_encryption'] === 'ssl' ? 'ssl://' : 'tcp://') . $c['smtp_host'] . ':' . $c['smtp_port'];
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true]]);
    $fp = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) {
        return [false, "Could not connect to {$c['smtp_host']}:{$c['smtp_port']} — {$errstr} ({$errno})"];
    }
    stream_set_timeout($fp, 25);
    $read = static function () use ($fp): string {
        $data = '';
        while (($line = fgets($fp, 1024)) !== false) {
            $data .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };
    $cmd = static function (?string $command, array $expect, string $label = '') use ($fp, $read): string {
        if ($command !== null) {
            fwrite($fp, $command . "\r\n");
        }
        $resp = $read();
        $code = (int) substr($resp, 0, 3);
        if (!in_array($code, $expect, true)) {
            throw new RuntimeException(($label ? $label . ': ' : '') . (trim($resp) ?: 'no response from server'));
        }
        return $resp;
    };
    try {
        $cmd(null, [220], 'Greeting');
        $ehlo = 'EHLO ' . ($c['domain'] ?: 'localhost');
        $cmd($ehlo, [250], 'EHLO');
        if ($c['smtp_encryption'] === 'tls') {
            $cmd('STARTTLS', [220], 'STARTTLS');
            $method = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $method |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
                $method |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
            }
            if (!stream_socket_enable_crypto($fp, true, $method)) {
                throw new RuntimeException('TLS negotiation failed');
            }
            $cmd($ehlo, [250], 'EHLO');
        }
        if ($c['smtp_username'] !== '') {
            $cmd('AUTH LOGIN', [334], 'AUTH');
            $cmd(base64_encode($c['smtp_username']), [334], 'Username');
            $cmd(base64_encode($c['smtp_password']), [235], 'Login (check username / password)');
        }
        $cmd('MAIL FROM:<' . $c['from_email'] . '>', [250], 'Sender');
        foreach ($to as $addr) {
            $cmd('RCPT TO:<' . $addr . '>', [250, 251], 'Recipient ' . $addr);
        }
        $cmd('DATA', [354], 'DATA');
        $headers = [
            'Date: ' . date('r'),
            'From: ' . crmEncodeHeader($c['from_name']) . ' <' . $c['from_email'] . '>',
            'To: ' . implode(', ', $to),
            'Subject: ' . crmEncodeHeader($subject),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . ($c['domain'] ?: 'localhost') . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        if ($replyTo) {
            $headers[] = 'Reply-To: ' . $replyTo;
        }
        fwrite($fp, implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($html), 76, "\r\n")) . "\r\n.\r\n");
        $cmd(null, [250], 'Send');
        try {
            $cmd('QUIT', [221, 250]);
        } catch (Throwable $e) {
            // server closed early — message already accepted
        }
        return [true, null];
    } catch (Throwable $e) {
        return [false, $e->getMessage()];
    } finally {
        fclose($fp);
    }
}

/** Sends one queued email_logs row and records the result. */
function crmDeliverLog(PDO $pdo, int $logId, ?array $cfg = null): array
{
    ensureMailTables($pdo);
    $st = $pdo->prepare('SELECT * FROM email_logs WHERE id = ?');
    $st->execute([$logId]);
    $log = $st->fetch();
    if (!$log) {
        return ['status' => 'failed', 'error' => 'Log not found'];
    }
    $cfg = $cfg ?: crmMailConfig($pdo);
    $to = array_values(array_filter(array_map('trim', explode(',', (string) $log['recipient'])), static fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL)));
    $ok = false;
    $error = null;
    if (!$to) {
        $error = 'No valid recipient email address';
    } elseif ($cfg['transport'] === 'smtp') {
        [$ok, $error] = crmSmtpSend($cfg, $to, (string) $log['subject'], (string) $log['body'], $log['reply_to'] ?: null);
    } elseif (!function_exists('mail')) {
        $error = 'PHP mail() is not available — configure SMTP';
    } else {
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . crmEncodeHeader($cfg['from_name']) . ' <' . $cfg['from_email'] . '>',
        ];
        if (!empty($log['reply_to'])) {
            $headers[] = 'Reply-To: ' . $log['reply_to'];
        }
        $ok = @mail(implode(', ', $to), crmEncodeHeader((string) $log['subject']), (string) $log['body'], implode("\r\n", $headers), '-f' . $cfg['from_email']);
        if (!$ok) {
            $error = 'PHP mail() refused the message — configure SMTP for reliable delivery';
        }
    }
    $pdo->prepare(
        'UPDATE email_logs SET status = ?, transport = ?, error = ?, attempts = attempts + 1, sent_at = IF(? = \'sent\', NOW(), sent_at) WHERE id = ?'
    )->execute([$ok ? 'sent' : 'failed', $cfg['transport'], $ok ? null : $error, $ok ? 'sent' : 'failed', $logId]);
    return ['status' => $ok ? 'sent' : 'failed', 'error' => $ok ? null : $error, 'transport' => $cfg['transport']];
}

function crmQueueEmail(PDO $pdo, ?int $enquiryId, string $type, array $to, string $subject, string $html, ?string $replyTo = null, string $status = 'queued', ?string $error = null): int
{
    $pdo->prepare(
        'INSERT INTO email_logs (enquiry_id, email_type, recipient, subject, body, reply_to, status, error) VALUES (?,?,?,?,?,?,?,?)'
    )->execute([$enquiryId, $type, substr(implode(', ', $to), 0, 500) ?: '-', substr($subject, 0, 300), $html, $replyTo, $status, $error]);
    return (int) $pdo->lastInsertId();
}

function crmEmailShell(string $siteName, string $eyebrow, string $title, string $inner): string
{
    $e = static fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    return '<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif">'
        . '<div style="max-width:580px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6eaef">'
        . '<div style="background:#1f5c52;color:#ffffff;padding:20px 24px"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e8d5b0">' . $e($eyebrow) . '</div>'
        . '<div style="font-size:20px;font-weight:bold;margin-top:4px">' . $e($title) . '</div></div>'
        . $inner
        . '<div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px;border-top:1px solid #eef1f4">' . $e($siteName) . '</div>'
        . '</div></body></html>';
}

function crmOwnerAlertHtml(array $cfg, array $enquiry, ?array $property, int $enquiryId): string
{
    $e = static fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $rows = [
        'Inquiry ID' => 'INQ' . str_pad((string) $enquiryId, 6, '0', STR_PAD_LEFT),
        'Name' => $enquiry['name'] ?? '',
        'Mobile' => $enquiry['mobile'] ?? '',
        'Email' => $enquiry['email'] ?? '',
        'Preferred contact' => ucfirst((string) ($enquiry['preferred_contact'] ?? 'any')),
        'Property' => $property ? (($property['title'] ?? '') . ' (' . ($property['property_code'] ?? '') . ')') : 'General inquiry',
        'Message' => $enquiry['message'] ?? '',
        'Received' => date('d M Y, h:i A'),
    ];
    $tr = '';
    foreach ($rows as $label => $value) {
        if ($value === '' || $value === null) {
            continue;
        }
        $tr .= '<tr><td style="padding:9px 24px;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;width:130px">' . $e($label)
            . '</td><td style="padding:9px 24px 9px 0;color:#0f172a;font-size:14px">' . nl2br($e($value)) . '</td></tr>';
    }
    $mobile = preg_replace('/[^\d+]/', '', (string) ($enquiry['mobile'] ?? ''));
    $listing = $property && !empty($property['slug']) ? $cfg['site_url'] . '/property/' . $property['slug'] : '';
    $buttons = '<div style="padding:8px 24px 24px">'
        . '<a href="' . $e($cfg['site_url'] . '/admin/enquiries') . '" style="display:inline-block;background:#1f5c52;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;margin:4px 6px 0 0">Open in admin</a>'
        . ($mobile ? '<a href="tel:' . $e($mobile) . '" style="display:inline-block;background:#ffffff;color:#1f5c52;border:1px solid #1f5c52;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;margin:4px 6px 0 0">Call customer</a>' : '')
        . ($listing ? '<a href="' . $e($listing) . '" style="display:inline-block;color:#1f5c52;font-size:13px;margin:10px 0 0 4px">View listing</a>' : '')
        . '</div>';
    return crmEmailShell($cfg['site_name'], 'New website inquiry', $enquiry['name'] ?? 'Website visitor', '<table style="width:100%;border-collapse:collapse;margin:12px 0">' . $tr . '</table>' . $buttons);
}

function crmCustomerAckHtml(PDO $pdo, array $cfg, array $enquiry, ?array $property): string
{
    $e = static fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $phone = crmSetting($pdo, 'phone') ?: '';
    $whatsapp = crmSetting($pdo, 'whatsapp') ?: '';
    $inner = '<div style="padding:22px 24px;color:#334155;font-size:15px;line-height:1.6">'
        . '<p style="margin:0 0 12px">Dear ' . $e($enquiry['name'] ?? 'Customer') . ',</p>'
        . '<p style="margin:0 0 12px">Thank you for contacting ' . $e($cfg['site_name']) . '. We have received your inquiry'
        . ($property ? ' about <strong>' . $e($property['title'] ?? '') . '</strong>' : '') . ' and one of our consultants will get in touch with you shortly.</p>'
        . ($phone ? '<p style="margin:0 0 12px">For anything urgent, call us on <strong>' . $e($phone) . '</strong>' . ($whatsapp ? ' or message us on WhatsApp' : '') . '.</p>' : '')
        . '<p style="margin:0">Warm regards,<br>' . $e($cfg['site_name']) . '</p></div>'
        . '<div style="padding:0 24px 24px"><a href="' . $e($cfg['site_url'] . '/properties') . '" style="display:inline-block;background:#c9a66b;color:#1a1400;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:bold">Explore more properties</a></div>';
    return crmEmailShell($cfg['site_name'], 'Inquiry received', 'Thank you, ' . ($enquiry['name'] ?? ''), $inner);
}

// Public: website inquiry form — inquiry + email log in one transaction, then delivery
if ($method === 'POST' && $path === '/enquiries') {
    ensureCrmTables($pdo);
    ensureMailTables($pdo);
    $b = bodyJson();
    $name = trim((string) ($b['name'] ?? ''));
    $mobile = trim((string) ($b['mobile'] ?? ''));
    if ($name === '' || $mobile === '') {
        jsonFail('Name and mobile are required', 422);
    }
    $property = null;
    if (!empty($b['property_id']) || !empty($b['property_slug']) || !empty($b['property_code'])) {
        $st = $pdo->prepare('SELECT id, property_code, title, slug, type_id FROM properties WHERE deleted_at IS NULL AND (id = ? OR slug = ? OR property_code = ?) LIMIT 1');
        $st->execute([(int) ($b['property_id'] ?? 0), (string) ($b['property_slug'] ?? ''), (string) ($b['property_code'] ?? '')]);
        $property = $st->fetch() ?: null;
    }
    $pref = in_array($b['preferred_contact'] ?? '', ['call', 'whatsapp', 'email', 'any'], true) ? $b['preferred_contact'] : 'any';
    $email = trim((string) ($b['email'] ?? ''));
    $enquiry = ['name' => $name, 'mobile' => $mobile, 'email' => $email, 'preferred_contact' => $pref, 'message' => $b['message'] ?? ''];
    $cfg = crmMailConfig($pdo);
    $queued = [];

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO enquiries (uuid, enquiry_type, property_id, property_code, property_title, property_type_id,
              name, mobile, email, preferred_contact, message, ip_address, user_agent, source_page)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            crmUuid(),
            in_array($b['enquiry_type'] ?? '', ['property', 'contact', 'callback'], true) ? $b['enquiry_type'] : ($property ? 'property' : 'contact'),
            $property['id'] ?? null,
            $property['property_code'] ?? ($b['property_code'] ?? null),
            $property['title'] ?? ($b['property_title'] ?? null),
            $property['type_id'] ?? null,
            $name,
            $mobile,
            $email !== '' ? $email : null,
            $pref,
            $b['message'] ?? null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
            substr((string) ($b['source_page'] ?? ($_SERVER['HTTP_REFERER'] ?? '')), 0, 500) ?: null,
        ]);
        $newId = (int) $pdo->lastInsertId();
        if ($property) {
            $pdo->prepare('UPDATE properties SET enquiries_count = enquiries_count + 1 WHERE id = ?')->execute([(int) $property['id']]);
        }

        $subject = 'New inquiry: ' . $name . ($property ? ' - ' . ($property['title'] ?? '') : '');
        $ownerHtml = crmOwnerAlertHtml($cfg, $enquiry, $property, $newId);
        $replyTo = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
        if (!$cfg['enabled']) {
            crmQueueEmail($pdo, $newId, 'owner_alert', $cfg['recipients'], $subject, $ownerHtml, $replyTo, 'skipped', 'Email notifications are turned off');
        } elseif (!$cfg['recipients']) {
            crmQueueEmail($pdo, $newId, 'owner_alert', [], $subject, $ownerHtml, $replyTo, 'failed', 'No notification email configured');
        } else {
            $queued[] = crmQueueEmail($pdo, $newId, 'owner_alert', $cfg['recipients'], $subject, $ownerHtml, $replyTo);
        }
        if ($cfg['enabled'] && $cfg['customer_ack'] && $replyTo) {
            $queued[] = crmQueueEmail(
                $pdo, $newId, 'customer_ack', [$email],
                'We received your inquiry - ' . $cfg['site_name'],
                crmCustomerAckHtml($pdo, $cfg, $enquiry, $property),
                $cfg['recipients'][0] ?? null
            );
        }
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }

    foreach ($queued as $logId) {
        crmDeliverLog($pdo, $logId, $cfg);
    }
    jsonOk(['message' => 'Enquiry submitted successfully.', 'id' => $newId], null, 201);
}

// Public: one content page (About, Services, Team, Blog, Privacy, Terms)
if ($method === 'GET' && preg_match('#^/content/([a-z_]+)$#', $path, $m)) {
    if (!in_array($m[1], SITE_CONTENT_KEYS, true)) {
        jsonFail('Not found', 404);
    }
    $raw = crmSetting($pdo, $m[1]);
    $data = null;
    if ($raw !== null && $raw !== '') {
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $data = $raw;
        }
    }
    jsonOk($data);
}

// Public: published properties that have a video (home page video section)
if ($method === 'GET' && $path === '/property-videos') {
    $rows = $pdo->query(
        "SELECT p.id, p.title, p.slug, p.purpose, p.price, p.price_display, p.monthly_rent, p.main_image,
                p.video_url, p.youtube_url, p.locality, p.city, t.name AS type_name, l.name AS location_name
         FROM properties p
         LEFT JOIN property_types t ON t.id = p.type_id
         LEFT JOIN locations l ON l.id = p.location_id
         WHERE p.deleted_at IS NULL AND p.status = 'published'
           AND ((p.youtube_url IS NOT NULL AND p.youtube_url != '') OR (p.video_url IS NOT NULL AND p.video_url != ''))
         ORDER BY p.is_featured DESC, p.published_at DESC LIMIT 8"
    )->fetchAll();
    jsonOk(array_map(static fn ($r) => crmIntCols($r, ['id']), $rows));
}

// Field definitions (now with dropdown options)
if ($method === 'GET' && ($path === '/field-definitions' || $path === '/admin/field-definitions')) {
    ensureSiteV2($pdo);
    $sql = 'SELECT * FROM property_field_definitions WHERE is_active = 1';
    $params = [];
    $sub = $_GET['sub_category'] ?? ($_GET['type'] ?? '');
    if ($sub !== '') {
        $sql .= ' AND sub_category = ?';
        $params[] = $sub;
    }
    $st = $pdo->prepare($sql . ' ORDER BY sort_order, field_name');
    $st->execute($params);
    $rows = array_map(static function ($r) {
        $r['options'] = !empty($r['options']) ? (json_decode((string) $r['options'], true) ?: []) : [];
        return $r;
    }, $st->fetchAll());
    jsonOk($rows);
}

// Admin media upload: images, PDF brochures/documents and videos
if ($method === 'POST' && $path === '/admin/media') {
    requireAuth($env);
    if (empty($_FILES['file'])) {
        jsonFail('No file uploaded (it may be larger than the server limit of ' . ini_get('upload_max_filesize') . ').', 422);
    }
    $err = (int) ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        jsonFail('File is larger than the server upload limit (' . ini_get('upload_max_filesize') . '). Use a smaller file or a YouTube link.', 413);
    }
    if ($err !== UPLOAD_ERR_OK) {
        jsonFail('Upload failed (code ' . $err . ')', 422);
    }
    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $images = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico'];
    $docs = ['pdf'];
    $videos = ['mp4', 'webm', 'mov', 'm4v'];
    if (!in_array($ext, array_merge($images, $docs, $videos), true)) {
        jsonFail('Allowed: images (jpg, png, webp, gif, svg), PDF, video (mp4, webm, mov)', 422);
    }
    $sub = in_array($ext, $images, true) ? 'site' : (in_array($ext, $docs, true) ? 'docs' : 'videos');
    $dir = __DIR__ . '/uploads/' . $sub;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        jsonFail('Cannot create upload directory', 500);
    }
    $base = preg_replace('/[^a-z0-9]+/', '-', strtolower(pathinfo($file['name'], PATHINFO_FILENAME))) ?: 'file';
    $filename = substr(trim($base, '-'), 0, 40) . '-' . time() . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $filename)) {
        jsonFail('Upload failed', 500);
    }
    @chmod($dir . '/' . $filename, 0644);
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'terranexusproperties.com';
    jsonOk([
        'url' => $scheme . '://' . $host . '/api/uploads/' . $sub . '/' . $filename,
        'filename' => $filename,
        'kind' => $sub === 'site' ? 'image' : ($sub === 'docs' ? 'pdf' : 'video'),
        'name' => $file['name'],
    ], null, 201);
}

// Make sure v2 columns exist before property reads/writes
if (strpos($path, '/admin/properties') === 0 || strpos($path, '/properties/') === 0) {
    ensureSiteV2($pdo);
}

/* ——— Admin: email settings, test email, email transaction log ——— */

if ($method === 'GET' && $path === '/admin/mail-settings') {
    requireAuth($env);
    ensureMailTables($pdo);
    $cfg = crmMailConfig($pdo);
    $raw = static fn (string $k) => (string) (crmSetting($pdo, $k) ?? '');
    $stats = $pdo->query("SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'sent'), 0) AS sent,
        COALESCE(SUM(status = 'failed'), 0) AS failed,
        COALESCE(SUM(status = 'queued'), 0) AS queued,
        COALESCE(SUM(status = 'skipped'), 0) AS skipped
      FROM email_logs")->fetch() ?: [];
    jsonOk([
        'mail_enabled' => $cfg['enabled'],
        'mail_transport' => $raw('mail_transport') ?: ($cfg['smtp_host'] !== '' ? 'smtp' : 'phpmail'),
        'smtp_host' => $cfg['smtp_host'],
        'smtp_port' => $cfg['smtp_port'],
        'smtp_encryption' => $cfg['smtp_encryption'],
        'smtp_username' => $cfg['smtp_username'],
        'has_password' => $raw('smtp_password') !== '',
        'mail_from_email' => $raw('mail_from_email'),
        'mail_from_name' => $raw('mail_from_name'),
        'notify_email' => $raw('notify_email'),
        'send_customer_ack' => $cfg['customer_ack'],
        'effective' => [
            'transport' => $cfg['transport'],
            'from' => $cfg['from_name'] . ' <' . $cfg['from_email'] . '>',
            'recipients' => $cfg['recipients'],
        ],
        'stats' => array_map('intval', $stats),
    ]);
}

if ($method === 'PUT' && $path === '/admin/mail-settings') {
    requireAuth($env);
    $b = bodyJson();
    $values = [
        'mail_enabled' => !empty($b['mail_enabled']) ? 'true' : 'false',
        'mail_transport' => ($b['mail_transport'] ?? '') === 'smtp' ? 'smtp' : 'phpmail',
        'smtp_host' => trim((string) ($b['smtp_host'] ?? '')),
        'smtp_port' => (string) max(1, min(65535, (int) ($b['smtp_port'] ?? 465))),
        'smtp_encryption' => in_array($b['smtp_encryption'] ?? '', ['ssl', 'tls', 'none'], true) ? $b['smtp_encryption'] : 'ssl',
        'smtp_username' => trim((string) ($b['smtp_username'] ?? '')),
        'mail_from_email' => trim((string) ($b['mail_from_email'] ?? '')),
        'mail_from_name' => trim((string) ($b['mail_from_name'] ?? '')),
        'notify_email' => trim((string) ($b['notify_email'] ?? '')),
        'send_customer_ack' => !empty($b['send_customer_ack']) ? 'true' : 'false',
    ];
    foreach (preg_split('/[,;\s]+/', $values['notify_email']) ?: [] as $addr) {
        if ($addr !== '' && !filter_var($addr, FILTER_VALIDATE_EMAIL)) {
            jsonFail('Invalid notification email: ' . $addr, 422);
        }
    }
    if ($values['mail_from_email'] !== '' && !filter_var($values['mail_from_email'], FILTER_VALIDATE_EMAIL)) {
        jsonFail('Invalid "from" email address', 422);
    }
    if ($values['mail_transport'] === 'smtp' && $values['smtp_host'] === '') {
        jsonFail('SMTP host is required when SMTP is selected', 422);
    }
    if (!empty($b['clear_password'])) {
        $values['smtp_password'] = '';
    } elseif (isset($b['smtp_password']) && $b['smtp_password'] !== '') {
        $values['smtp_password'] = crmEncrypt((string) $b['smtp_password']);
    }
    $st = $pdo->prepare(
        "INSERT INTO site_settings (setting_group, setting_key, setting_value, value_type, is_public)
         VALUES (?, ?, ?, 'string', 0)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_group = VALUES(setting_group), is_public = 0"
    );
    foreach ($values as $k => $v) {
        $st->execute([$k === 'notify_email' ? 'contact' : 'mail', $k, $v]);
    }
    jsonOk(['saved' => true]);
}

if ($method === 'POST' && $path === '/admin/mail-settings/test') {
    requireAuth($env);
    ensureMailTables($pdo);
    $b = bodyJson();
    $cfg = crmMailConfig($pdo);
    $to = trim((string) ($b['to'] ?? ''));
    if ($to === '') {
        $to = $cfg['recipients'][0] ?? '';
    }
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        jsonFail('Enter a valid email address to send the test to', 422);
    }
    $html = crmEmailShell($cfg['site_name'], 'Test email', 'Email delivery is working',
        '<div style="padding:22px 24px;color:#334155;font-size:15px;line-height:1.6">'
        . '<p style="margin:0 0 10px">This is a test from your website admin. If you are reading it, inquiry notifications will reach this inbox.</p>'
        . '<p style="margin:0;color:#64748b;font-size:13px">Sent via ' . htmlspecialchars(strtoupper($cfg['transport']), ENT_QUOTES, 'UTF-8')
        . ' at ' . date('d M Y, h:i A') . '</p></div>');
    $logId = crmQueueEmail($pdo, null, 'test', [$to], 'Test email - ' . $cfg['site_name'], $html);
    $result = crmDeliverLog($pdo, $logId, $cfg);
    jsonOk(array_merge($result, ['log_id' => $logId, 'to' => $to]));
}

if ($method === 'GET' && $path === '/admin/email-logs') {
    requireAuth($env);
    ensureMailTables($pdo);
    [$page, $limit, $offset] = crmPaging(20);
    $where = ['1=1'];
    $params = [];
    if (!empty($_GET['status'])) {
        $where[] = 'l.status = ?';
        $params[] = (string) $_GET['status'];
    }
    if (!empty($_GET['email_type'])) {
        $where[] = 'l.email_type = ?';
        $params[] = (string) $_GET['email_type'];
    }
    if (!empty($_GET['q'])) {
        $q = '%' . trim((string) $_GET['q']) . '%';
        $where[] = '(l.recipient LIKE ? OR l.subject LIKE ? OR e.name LIKE ?)';
        array_push($params, $q, $q, $q);
    }
    $from = ' FROM email_logs l LEFT JOIN enquiries e ON e.id = l.enquiry_id WHERE ' . implode(' AND ', $where);
    $count = $pdo->prepare('SELECT COUNT(*)' . $from);
    $count->execute($params);
    $total = (int) $count->fetchColumn();
    $st = $pdo->prepare('SELECT l.id, l.enquiry_id, l.email_type, l.recipient, l.subject, l.status, l.transport, l.error, l.attempts,
        l.created_at, l.sent_at, e.name AS enquiry_name' . $from . " ORDER BY l.id DESC LIMIT {$limit} OFFSET {$offset}");
    $st->execute($params);
    jsonOk(array_map(static fn ($r) => crmIntCols($r, ['id', 'enquiry_id', 'attempts']), $st->fetchAll()), crmMeta($page, $limit, $total));
}

if (preg_match('#^/admin/email-logs/(\d+)(/resend)?$#', $path, $m) && in_array($method, ['GET', 'POST'], true)) {
    requireAuth($env);
    ensureMailTables($pdo);
    $id = (int) $m[1];
    if ($method === 'POST' && !empty($m[2])) {
        jsonOk(crmDeliverLog($pdo, $id));
    }
    $st = $pdo->prepare('SELECT l.*, e.name AS enquiry_name FROM email_logs l LEFT JOIN enquiries e ON e.id = l.enquiry_id WHERE l.id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) {
        jsonFail('Email log not found', 404);
    }
    jsonOk(crmIntCols($row, ['id', 'enquiry_id', 'attempts']));
}
