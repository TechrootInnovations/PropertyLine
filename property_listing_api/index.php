<?php
/**
 * Terranexus Properties API (PHP) â€” works on Hostinger Premium shared hosting.
 * Routes under /api/* â†’ this file. Reads credentials from .env next to this file.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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
        $env[trim($k)] = trim($v, " \t\"'");
    }
    return $env;
}

function jsonOk($data = null, $meta = null, int $status = 200): void
{
    http_response_code($status);
    $body = ['success' => true, 'data' => $data];
    if ($meta !== null) {
        $body['meta'] = $meta;
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonFail(string $message, int $status = 400, $extra = null): void
{
    http_response_code($status);
    $body = ['success' => false, 'message' => $message];
    if ($extra !== null) {
        $body['details'] = $extra;
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function db(array $env): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $host = $env['DB_HOST'] ?? 'localhost';
    $name = $env['DB_NAME'] ?? '';
    $user = $env['DB_USER'] ?? '';
    $pass = $env['DB_PASSWORD'] ?? '';
    $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function bodyJson(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function b64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function jwtEncode(array $payload, string $secret): string
{
    $header = b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + 60 * 60 * 24 * 7;
    $body = b64url(json_encode($payload));
    $sig = b64url(hash_hmac('sha256', "{$header}.{$body}", $secret, true));
    return "{$header}.{$body}.{$sig}";
}

function jwtDecode(string $token, string $secret): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$h, $p, $s] = $parts;
    $check = b64url(hash_hmac('sha256', "{$h}.{$p}", $secret, true));
    if (!hash_equals($check, $s)) {
        return null;
    }
    $payload = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
        return null;
    }
    return $payload;
}

function requireAuth(array $env): array
{
    $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(\S+)/i', $hdr, $m)) {
        jsonFail('Unauthorized', 401);
    }
    $payload = jwtDecode($m[1], $env['JWT_SECRET'] ?? 'dev');
    if (!$payload || empty($payload['sub'])) {
        jsonFail('Unauthorized', 401);
    }
    return $payload;
}

function toSlug(string $text): string
{
    $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $text) ?? '', '-'));
    return $slug !== '' ? $slug : 'item-' . substr(bin2hex(random_bytes(3)), 0, 6);
}

function toActiveFlag($value, bool $default = true): int
{
    if ($value === null || $value === '') {
        return $default ? 1 : 0;
    }
    if ($value === false || $value === 0 || $value === '0' || $value === 'false') {
        return 0;
    }
    return 1;
}

function fetchById(PDO $pdo, string $table, int $id): ?array
{
    $allowed = ['property_categories', 'property_types', 'locations', 'amenities', 'master_options', 'sellers'];
    if (!in_array($table, $allowed, true)) {
        return null;
    }
    $st = $pdo->prepare("SELECT * FROM {$table} WHERE id = ? AND deleted_at IS NULL LIMIT 1");
    $st->execute([$id]);
    $row = $st->fetch();
    return $row ?: null;
}

function softDeleteRow(PDO $pdo, string $table, int $id): void
{
    $allowed = ['property_categories', 'property_types', 'locations', 'amenities', 'master_options', 'sellers'];
    if (!in_array($table, $allowed, true)) {
        jsonFail('Invalid table', 400);
    }
    $st = $pdo->prepare("UPDATE {$table} SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND deleted_at IS NULL");
    $st->execute([$id]);
    if (!$st->rowCount()) {
        jsonFail('Record not found', 404);
    }
}

function ensureMasterTables(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }
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
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS master_options (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      master_type VARCHAR(60) NOT NULL,
      name VARCHAR(120) NOT NULL,
      value VARCHAR(120) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_master_type_value (master_type, value)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
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

    $cols = [
        'seller_id' => 'INT UNSIGNED DEFAULT NULL',
        'extra_attributes' => 'JSON DEFAULT NULL',
        'show_exact_location' => 'TINYINT(1) NOT NULL DEFAULT 1',
        'price_type' => 'VARCHAR(40) DEFAULT NULL',
        'is_verified' => 'TINYINT(1) NOT NULL DEFAULT 0',
        'youtube_url' => 'VARCHAR(500) DEFAULT NULL',
        'district' => 'VARCHAR(100) DEFAULT NULL',
    ];
    foreach ($cols as $col => $def) {
        $chk = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $chk->execute(['properties', $col]);
        if (!(int) $chk->fetchColumn()) {
            $pdo->exec("ALTER TABLE properties ADD COLUMN {$col} {$def}");
        }
    }
    $done = true;
}

function hydrateSettings(array $rows): array
{
    $out = [];
    foreach ($rows as $row) {
        $g = $row['setting_group'];
        if (!isset($out[$g])) {
            $out[$g] = [];
        }
        $value = $row['setting_value'];
        if ($row['value_type'] === 'number') {
            $value = (float) $value;
        } elseif ($row['value_type'] === 'boolean') {
            $value = $value === 'true' || $value === '1';
        } elseif ($row['value_type'] === 'json') {
            $decoded = json_decode((string) $value, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $value = $decoded;
            }
        }
        $out[$g][$row['setting_key']] = $value;
    }
    return $out;
}

$env = loadEnv(__DIR__ . '/.env');
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH) ?: '/';
// Strip /api prefix (PassengerBaseURI or rewrite)
$path = preg_replace('#^/api#', '', $path) ?: '/';
$path = rtrim($path, '/') ?: '/';

try {
    $pdo = db($env);

    // GET /health
    if ($method === 'GET' && $path === '/health') {
        echo json_encode(['ok' => true, 'service' => 'terranexusproperties-api', 'engine' => 'php']);
        exit;
    }

    // Admin CRM, amenity types, admin listing search & property details (overrides legacy handlers below)
    require __DIR__ . '/crm_routes.php';

    // GET /sitemap.xml — Google SEO
    if ($method === 'GET' && ($path === '/sitemap.xml' || $path === '/sitemap')) {
        $st = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'site_url' LIMIT 1");
        $st->execute();
        $siteUrl = rtrim((string) ($st->fetchColumn() ?: 'https://terranexusproperties.com'), '/');

        $staticPaths = [
            ['loc' => '/', 'changefreq' => 'daily', 'priority' => '1.0'],
            ['loc' => '/properties', 'changefreq' => 'daily', 'priority' => '0.9'],
            ['loc' => '/about', 'changefreq' => 'monthly', 'priority' => '0.6'],
            ['loc' => '/contact', 'changefreq' => 'monthly', 'priority' => '0.6'],
            ['loc' => '/services', 'changefreq' => 'monthly', 'priority' => '0.6'],
            ['loc' => '/team', 'changefreq' => 'monthly', 'priority' => '0.5'],
            ['loc' => '/blog', 'changefreq' => 'weekly', 'priority' => '0.7'],
            ['loc' => '/privacy-policy', 'changefreq' => 'yearly', 'priority' => '0.3'],
            ['loc' => '/terms-and-conditions', 'changefreq' => 'yearly', 'priority' => '0.3'],
        ];
        $blogRaw = json_decode((string) (crmSetting($pdo, 'blog_posts') ?? ''), true);
        foreach ((is_array($blogRaw) ? $blogRaw : []) as $post) {
            if (!empty($post['slug']) && ($post['published'] ?? true)) {
                $staticPaths[] = ['loc' => '/blog/' . $post['slug'], 'changefreq' => 'monthly', 'priority' => '0.6'];
            }
        }
        $props = $pdo->query(
            "SELECT slug, updated_at, published_at FROM properties
             WHERE deleted_at IS NULL AND status = 'published' AND slug IS NOT NULL AND slug != ''
             ORDER BY COALESCE(updated_at, published_at, created_at) DESC"
        )->fetchAll();

        $escape = static function (string $s): string {
            return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        };
        $toDate = static function ($d): string {
            if (!$d) {
                return date('Y-m-d');
            }
            $ts = strtotime((string) $d);
            return $ts ? date('Y-m-d', $ts) : date('Y-m-d');
        };

        $urls = [];
        foreach ($staticPaths as $p) {
            $urls[] = '  <url>
    <loc>' . $escape($siteUrl . $p['loc']) . '</loc>
    <changefreq>' . $p['changefreq'] . '</changefreq>
    <priority>' . $p['priority'] . '</priority>
  </url>';
        }
        foreach ($props as $p) {
            $urls[] = '  <url>
    <loc>' . $escape($siteUrl . '/property/' . $p['slug']) . '</loc>
    <lastmod>' . $toDate($p['updated_at'] ?: $p['published_at']) . '</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>';
        }

        header('Content-Type: application/xml; charset=utf-8');
        echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        echo implode("\n", $urls) . "\n";
        echo '</urlset>';
        exit;
    }

    // GET /settings
    if ($method === 'GET' && $path === '/settings') {
        $rows = $pdo->query('SELECT setting_group, setting_key, setting_value, value_type FROM site_settings WHERE is_public = 1')->fetchAll();
        jsonOk(hydrateSettings($rows));
    }

    // GET /home
    if ($method === 'GET' && $path === '/home') {
        $settings = hydrateSettings(
            $pdo->query('SELECT setting_group, setting_key, setting_value, value_type FROM site_settings WHERE is_public = 1')->fetchAll()
        );
        $categories = $pdo->query('SELECT id, name, slug, icon, image_url, description, sort_order FROM property_categories WHERE deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name')->fetchAll();
        $types = $pdo->query('SELECT id, category_id, name, slug, icon, sort_order, is_active FROM property_types WHERE deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name')->fetchAll();
        $locations = $pdo->query('SELECT id, name, slug, city, state, is_popular, property_count_cache FROM locations WHERE deleted_at IS NULL AND is_active = 1 AND is_popular = 1 ORDER BY sort_order, name')->fetchAll();
        $testimonials = $pdo->query('SELECT id, name, role, avatar_url, rating, message FROM testimonials WHERE is_active = 1 AND deleted_at IS NULL ORDER BY sort_order')->fetchAll();
        $blocks = $pdo->query('SELECT block_key, title, subtitle, body, image_url, cta_label, cta_url, extra_json, sort_order FROM content_blocks WHERE is_active = 1 ORDER BY sort_order')->fetchAll();
        $featured = $pdo->query("SELECT * FROM v_property_list WHERE status = 'published' AND is_featured = 1 ORDER BY published_at DESC LIMIT 8")->fetchAll();
        $latest = $pdo->query("SELECT * FROM v_property_list WHERE status = 'published' ORDER BY published_at DESC LIMIT 8")->fetchAll();
        jsonOk([
            'settings' => $settings,
            'categories' => $categories,
            'types' => $types,
            'locations' => $locations,
            'testimonials' => $testimonials,
            'blocks' => $blocks,
            'featured' => $featured,
            'latest' => $latest,
        ]);
    }

    // GET /categories
    if ($method === 'GET' && $path === '/categories') {
        $rows = $pdo->query('SELECT id, name, slug, icon, image_url, description, sort_order, is_active FROM property_categories WHERE deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name')->fetchAll();
        jsonOk($rows);
    }

    // GET /types
    if ($method === 'GET' && $path === '/types') {
        $sql = 'SELECT id, category_id, name, slug, icon, sort_order, is_active FROM property_types WHERE deleted_at IS NULL AND is_active = 1';
        $params = [];
        if (!empty($_GET['category_id'])) {
            $sql .= ' AND category_id = ?';
            $params[] = (int) $_GET['category_id'];
        }
        $sql .= ' ORDER BY sort_order, name';
        $st = $pdo->prepare($sql);
        $st->execute($params);
        jsonOk($st->fetchAll());
    }

    // GET /locations
    if ($method === 'GET' && $path === '/locations') {
        $sql = 'SELECT id, name, slug, city, state, country, pincode, latitude, longitude, image_url, is_popular, property_count_cache, sort_order, is_active FROM locations WHERE deleted_at IS NULL AND is_active = 1';
        if (!empty($_GET['popular'])) {
            $sql .= ' AND is_popular = 1';
        }
        $sql .= ' ORDER BY sort_order, name';
        jsonOk($pdo->query($sql)->fetchAll());
    }

    // GET /amenities
    if ($method === 'GET' && $path === '/amenities') {
        $rows = $pdo->query('SELECT id, name, slug, icon, amenity_group, sort_order, is_active FROM amenities WHERE deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name')->fetchAll();
        jsonOk($rows);
    }

    // GET /properties
    if ($method === 'GET' && $path === '/properties') {
        // v_property_list already filters deleted rows
        $where = ["status = 'published'"];
        $params = [];
        if (!empty($_GET['purpose'])) {
            $where[] = 'purpose = ?';
            $params[] = $_GET['purpose'];
        }
        if (!empty($_GET['category'])) {
            $where[] = 'category_slug = ?';
            $params[] = $_GET['category'];
        }
        if (!empty($_GET['category_id'])) {
            $where[] = 'category_slug = (SELECT slug FROM property_categories WHERE id = ? LIMIT 1)';
            $params[] = (int) $_GET['category_id'];
        }
        if (!empty($_GET['type'])) {
            $where[] = 'type_slug = ?';
            $params[] = $_GET['type'];
        }
        if (!empty($_GET['type_id'])) {
            $where[] = 'type_slug = (SELECT slug FROM property_types WHERE id = ? LIMIT 1)';
            $params[] = (int) $_GET['type_id'];
        }
        if (!empty($_GET['location'])) {
            $where[] = '(location_slug = ? OR locality LIKE ? OR city LIKE ?)';
            $params[] = $_GET['location'];
            $params[] = '%' . $_GET['location'] . '%';
            $params[] = '%' . $_GET['location'] . '%';
        }
        if (!empty($_GET['location_id'])) {
            $where[] = 'location_slug = (SELECT slug FROM locations WHERE id = ? LIMIT 1)';
            $params[] = (int) $_GET['location_id'];
        }
        if (!empty($_GET['city'])) {
            $where[] = 'city LIKE ?';
            $params[] = '%' . $_GET['city'] . '%';
        }
        if (!empty($_GET['locality'])) {
            $where[] = 'locality LIKE ?';
            $params[] = '%' . $_GET['locality'] . '%';
        }
        if (!empty($_GET['q'])) {
            $where[] = '(title LIKE ? OR locality LIKE ? OR city LIKE ? OR property_code LIKE ?)';
            $q = '%' . $_GET['q'] . '%';
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
        }
        if (!empty($_GET['bedrooms'])) {
            $beds = $_GET['bedrooms'];
            if (str_ends_with((string) $beds, '+')) {
                $where[] = 'bedrooms >= ?';
                $params[] = (int) rtrim((string) $beds, '+');
            } else {
                $where[] = 'bedrooms = ?';
                $params[] = (int) $beds;
            }
        }
        if (!empty($_GET['min_price'])) {
            $where[] = 'COALESCE(price, monthly_rent, 0) >= ?';
            $params[] = (float) $_GET['min_price'];
        }
        if (!empty($_GET['max_price'])) {
            $where[] = 'COALESCE(price, monthly_rent, 0) <= ?';
            $params[] = (float) $_GET['max_price'];
        }
        if (isset($_GET['featured']) && $_GET['featured'] !== '') {
            $where[] = 'is_featured = ?';
            $params[] = (int) $_GET['featured'];
        }
        $sort = $_GET['sort'] ?? 'newest';
        $orderBy = match ($sort) {
            'price_asc' => 'COALESCE(price, monthly_rent, 0) ASC',
            'price_desc' => 'COALESCE(price, monthly_rent, 0) DESC',
            'featured' => 'is_featured DESC, published_at DESC',
            default => 'published_at DESC',
        };
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 12)));
        $offset = ($page - 1) * $limit;
        $sqlWhere = implode(' AND ', $where);
        $countSt = $pdo->prepare("SELECT COUNT(*) FROM v_property_list WHERE {$sqlWhere}");
        $countSt->execute($params);
        $total = (int) $countSt->fetchColumn();
        $st = $pdo->prepare("SELECT * FROM v_property_list WHERE {$sqlWhere} ORDER BY {$orderBy} LIMIT {$limit} OFFSET {$offset}");
        $st->execute($params);
        jsonOk($st->fetchAll(), [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'totalPages' => (int) ceil($total / max(1, $limit)),
        ]);
    }

    // GET /properties/:slug
    if ($method === 'GET' && preg_match('#^/properties/([^/]+)$#', $path, $m)) {
        $st = $pdo->prepare(
            "SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                    t.name AS type_name, t.slug AS type_slug,
                    l.name AS location_name, l.slug AS location_slug
             FROM properties p
             JOIN property_categories c ON c.id = p.category_id AND c.deleted_at IS NULL
             JOIN property_types t ON t.id = p.type_id AND t.deleted_at IS NULL
             LEFT JOIN locations l ON l.id = p.location_id AND l.deleted_at IS NULL
             WHERE p.deleted_at IS NULL AND p.slug = ? AND p.status = ?
             LIMIT 1"
        );
        $st->execute([$m[1], 'published']);
        $row = $st->fetch();
        if (!$row) {
            jsonFail('Property not found.', 404);
        }
        $img = $pdo->prepare('SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order FROM property_images WHERE property_id = ? AND deleted_at IS NULL ORDER BY sort_order');
        $img->execute([$row['id']]);
        $row['images'] = $img->fetchAll();
        $pdo->prepare('UPDATE properties SET views_count = views_count + 1 WHERE id = ?')->execute([(int) $row['id']]);
        jsonOk($row);
    }

    // POST /enquiries
    if ($method === 'POST' && $path === '/enquiries') {
        $b = bodyJson();
        $name = trim((string) ($b['name'] ?? ''));
        $mobile = trim((string) ($b['mobile'] ?? ''));
        if ($name === '' || $mobile === '') {
            jsonFail('Name and mobile are required', 422);
        }
        $uuid = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
        $st = $pdo->prepare('INSERT INTO enquiries (uuid, enquiry_type, property_id, property_code, property_title, name, mobile, email, preferred_contact, message, ip_address, user_agent, source_page) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $st->execute([
            $uuid,
            $b['enquiry_type'] ?? 'property',
            $b['property_id'] ?? null,
            $b['property_code'] ?? null,
            $b['property_title'] ?? null,
            $name,
            $mobile,
            $b['email'] ?? null,
            $b['preferred_contact'] ?? 'any',
            $b['message'] ?? null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
            $b['source_page'] ?? null,
        ]);
        jsonOk(['message' => 'Enquiry submitted successfully.', 'id' => (int) $pdo->lastInsertId()], null, 201);
    }

    // POST /admin/login
    if ($method === 'POST' && $path === '/admin/login') {
        $b = bodyJson();
        $email = trim((string) ($b['email'] ?? ''));
        $password = (string) ($b['password'] ?? '');
        $st = $pdo->prepare('SELECT id, uuid, name, email, phone, role, password_hash, is_active FROM admin_users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
        $st->execute([$email]);
        $user = $st->fetch();
        if (!$user || !(int) $user['is_active'] || !password_verify($password, $user['password_hash'])) {
            jsonFail('Invalid email or password', 401);
        }
        $pdo->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);
        unset($user['password_hash']);
        $token = jwtEncode(['sub' => (int) $user['id'], 'role' => $user['role']], $env['JWT_SECRET'] ?? 'dev');
        jsonOk(['token' => $token, 'user' => $user]);
    }

    // GET /admin/me
    if ($method === 'GET' && $path === '/admin/me') {
        $auth = requireAuth($env);
        $st = $pdo->prepare('SELECT id, uuid, name, email, phone, role, avatar_url, last_login_at, created_at FROM admin_users WHERE id = ? AND deleted_at IS NULL');
        $st->execute([(int) $auth['sub']]);
        $user = $st->fetch();
        if (!$user) {
            jsonFail('User not found', 404);
        }
        jsonOk($user);
    }

    // GET /admin/dashboard
    if ($method === 'GET' && $path === '/admin/dashboard') {
        requireAuth($env);
        $stats = [
            'properties' => (int) $pdo->query("SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL")->fetchColumn(),
            'published' => (int) $pdo->query("SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL AND status = 'published'")->fetchColumn(),
            'enquiries_new' => (int) $pdo->query("SELECT COUNT(*) FROM enquiries WHERE deleted_at IS NULL AND status = 'new'")->fetchColumn(),
            'enquiries_total' => (int) $pdo->query("SELECT COUNT(*) FROM enquiries WHERE deleted_at IS NULL")->fetchColumn(),
        ];
        jsonOk($stats);
    }

    // GET /admin/properties
    if ($method === 'GET' && $path === '/admin/properties') {
        requireAuth($env);
        $limit = min(100, max(1, (int) ($_GET['limit'] ?? 50)));
        $st = $pdo->query("SELECT * FROM v_property_list ORDER BY id DESC LIMIT {$limit}");
        jsonOk($st->fetchAll());
    }

    // POST /admin/properties
    if ($method === 'POST' && $path === '/admin/properties') {
        $auth = requireAuth($env);
        ensureMasterTables($pdo);
        $b = bodyJson();
        $title = trim((string) ($b['title'] ?? ''));
        if ($title === '') {
            jsonFail('Title is required', 422);
        }
        $slug = toSlug((string) ($b['slug'] ?? $title));
        $code = $b['property_code'] ?? ('PROP-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)));
        $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        $status = $b['status'] ?? 'draft';
        $extra = $b['extra_attributes'] ?? null;
        if (is_array($extra)) {
            $extra = json_encode($extra, JSON_UNESCAPED_UNICODE);
        }
        $st = $pdo->prepare(
            'INSERT INTO properties (
              uuid, property_code, title, slug, purpose, category_id, type_id, location_id, seller_id,
              status, is_featured, short_description, description, price, monthly_rent, plot_area,
              bedrooms, bathrooms, carpet_area, builtup_area, area_unit, facing, furnishing, possession_status,
              city, locality, address, landmark, pincode, state, latitude, longitude, map_url,
              show_exact_location, video_url, youtube_url, virtual_tour_url, seo_title, seo_description,
              extra_attributes, created_by, published_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $st->execute([
            $uuid,
            $code,
            $title,
            $slug,
            $b['purpose'] ?? 'sale',
            (int) ($b['category_id'] ?? 1),
            (int) ($b['type_id'] ?? 1),
            $b['location_id'] !== null && $b['location_id'] !== '' ? (int) $b['location_id'] : null,
            $b['seller_id'] !== null && $b['seller_id'] !== '' ? (int) $b['seller_id'] : null,
            $status,
            !empty($b['is_featured']) ? 1 : 0,
            $b['short_description'] ?? null,
            $b['description'] ?? null,
            $b['price'] ?? null,
            $b['monthly_rent'] ?? null,
            $b['plot_area'] ?? null,
            $b['bedrooms'] ?? null,
            $b['bathrooms'] ?? null,
            $b['carpet_area'] ?? null,
            $b['builtup_area'] ?? null,
            $b['area_unit'] ?? 'sqft',
            $b['facing'] ?? null,
            $b['furnishing'] ?? 'na',
            $b['possession_status'] ?? 'na',
            $b['city'] ?? null,
            $b['locality'] ?? null,
            $b['address'] ?? null,
            $b['landmark'] ?? null,
            $b['pincode'] ?? null,
            $b['state'] ?? 'Maharashtra',
            $b['latitude'] !== null && $b['latitude'] !== '' ? $b['latitude'] : null,
            $b['longitude'] !== null && $b['longitude'] !== '' ? $b['longitude'] : null,
            $b['map_url'] ?? null,
            isset($b['show_exact_location']) ? toActiveFlag($b['show_exact_location'], true) : 1,
            $b['video_url'] ?? null,
            $b['youtube_url'] ?? null,
            $b['virtual_tour_url'] ?? null,
            $b['seo_title'] ?? null,
            $b['seo_description'] ?? null,
            $extra,
            (int) $auth['sub'],
            $status === 'published' ? date('Y-m-d H:i:s') : null,
        ]);
        $newId = (int) $pdo->lastInsertId();
        crmSaveExtraColumns($pdo, $newId, $b);
        if (!empty($b['amenity_ids']) && is_array($b['amenity_ids'])) {
            $ai = $pdo->prepare('INSERT IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?,?)');
            foreach ($b['amenity_ids'] as $aid) {
                $ai->execute([$newId, (int) $aid]);
            }
        }
        jsonOk(['id' => $newId, 'slug' => $slug, 'property_code' => $code], null, 201);
    }

    // GET /admin/properties/:id
    if ($method === 'GET' && preg_match('#^/admin/properties/(\d+)$#', $path, $m)) {
        requireAuth($env);
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
        $img = $pdo->prepare('SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order FROM property_images WHERE property_id = ? AND deleted_at IS NULL ORDER BY sort_order, id');
        $img->execute([(int) $row['id']]);
        $row['images'] = $img->fetchAll();
        jsonOk($row);
    }

    // PUT /admin/properties/:id
    if ($method === 'PUT' && preg_match('#^/admin/properties/(\d+)$#', $path, $m)) {
        requireAuth($env);
        ensureMasterTables($pdo);
        $id = (int) $m[1];
        $b = bodyJson();
        $exists = $pdo->prepare('SELECT id, status FROM properties WHERE id = ? AND deleted_at IS NULL');
        $exists->execute([$id]);
        $cur = $exists->fetch();
        if (!$cur) {
            jsonFail('Property not found.', 404);
        }
        $status = $b['status'] ?? $cur['status'];
        $title = trim((string) ($b['title'] ?? ''));
        $slug = toSlug((string) ($b['slug'] ?? $title));
        $extra = $b['extra_attributes'] ?? null;
        if (is_array($extra)) {
            $extra = json_encode($extra, JSON_UNESCAPED_UNICODE);
        }
        $st = $pdo->prepare(
            'UPDATE properties SET
              title = ?, slug = ?, purpose = ?, category_id = ?, type_id = ?, location_id = ?, seller_id = ?,
              status = ?, is_featured = ?, short_description = ?, description = ?,
              price = ?, monthly_rent = ?, plot_area = ?, bedrooms = ?, bathrooms = ?, carpet_area = ?, builtup_area = ?,
              area_unit = ?, facing = ?, furnishing = ?, possession_status = ?,
              city = ?, locality = ?, address = ?, landmark = ?, pincode = ?, state = ?,
              latitude = ?, longitude = ?, map_url = ?, show_exact_location = ?,
              video_url = ?, youtube_url = ?, virtual_tour_url = ?,
              seo_title = ?, seo_description = ?, seo_keywords = ?, extra_attributes = ?,
              published_at = CASE
                WHEN ? = \'published\' AND (published_at IS NULL OR status != \'published\') THEN NOW()
                ELSE published_at
              END,
              updated_at = NOW()
             WHERE id = ?'
        );
        $st->execute([
            $title,
            $slug,
            $b['purpose'] ?? 'sale',
            (int) ($b['category_id'] ?? 1),
            (int) ($b['type_id'] ?? 1),
            $b['location_id'] !== null && $b['location_id'] !== '' ? (int) $b['location_id'] : null,
            $b['seller_id'] !== null && $b['seller_id'] !== '' ? (int) $b['seller_id'] : null,
            $status,
            !empty($b['is_featured']) ? 1 : 0,
            $b['short_description'] ?? null,
            $b['description'] ?? null,
            $b['price'] ?? null,
            $b['monthly_rent'] ?? null,
            $b['plot_area'] ?? null,
            $b['bedrooms'] ?? null,
            $b['bathrooms'] ?? null,
            $b['carpet_area'] ?? null,
            $b['builtup_area'] ?? null,
            $b['area_unit'] ?? 'sqft',
            $b['facing'] ?? null,
            $b['furnishing'] ?? 'na',
            $b['possession_status'] ?? 'na',
            $b['city'] ?? null,
            $b['locality'] ?? null,
            $b['address'] ?? null,
            $b['landmark'] ?? null,
            $b['pincode'] ?? null,
            $b['state'] ?? 'Maharashtra',
            $b['latitude'] !== null && $b['latitude'] !== '' ? $b['latitude'] : null,
            $b['longitude'] !== null && $b['longitude'] !== '' ? $b['longitude'] : null,
            $b['map_url'] ?? null,
            isset($b['show_exact_location']) ? toActiveFlag($b['show_exact_location'], true) : 1,
            $b['video_url'] ?? null,
            $b['youtube_url'] ?? null,
            $b['virtual_tour_url'] ?? null,
            $b['seo_title'] ?? null,
            $b['seo_description'] ?? null,
            $b['seo_keywords'] ?? null,
            $extra,
            $status,
            $id,
        ]);
        if (array_key_exists('amenity_ids', $b) && is_array($b['amenity_ids'])) {
            $pdo->prepare('DELETE FROM property_amenities WHERE property_id = ?')->execute([$id]);
            $ai = $pdo->prepare('INSERT IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?,?)');
            foreach ($b['amenity_ids'] as $aid) {
                $ai->execute([$id, (int) $aid]);
            }
        }
        crmSaveExtraColumns($pdo, $id, $b);
        $st2 = $pdo->prepare('SELECT * FROM properties WHERE id = ?');
        $st2->execute([$id]);
        $row = $st2->fetch();
        if (!empty($row['extra_attributes']) && is_string($row['extra_attributes'])) {
            $decoded = json_decode($row['extra_attributes'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $row['extra_attributes'] = $decoded;
            }
        }
        $img = $pdo->prepare('SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order FROM property_images WHERE property_id = ? AND deleted_at IS NULL ORDER BY sort_order, id');
        $img->execute([$id]);
        $row['images'] = $img->fetchAll();
        $am = $pdo->prepare('SELECT amenity_id FROM property_amenities WHERE property_id = ?');
        $am->execute([$id]);
        $row['amenity_ids'] = array_map('intval', array_column($am->fetchAll(), 'amenity_id'));
        jsonOk($row);
    }

    // POST /admin/properties/:id/images
    if ($method === 'POST' && preg_match('#^/admin/properties/(\d+)/images$#', $path, $m)) {
        requireAuth($env);
        $propertyId = (int) $m[1];
        $exists = $pdo->prepare('SELECT id FROM properties WHERE id = ? AND deleted_at IS NULL');
        $exists->execute([$propertyId]);
        if (!$exists->fetch()) {
            jsonFail('Property not found.', 404);
        }

        $files = [];
        if (!empty($_FILES['images']) && is_array($_FILES['images']['name'])) {
            $count = count($_FILES['images']['name']);
            for ($i = 0; $i < $count; $i++) {
                if ((int) $_FILES['images']['error'][$i] !== UPLOAD_ERR_OK) {
                    continue;
                }
                $files[] = [
                    'name' => $_FILES['images']['name'][$i],
                    'tmp_name' => $_FILES['images']['tmp_name'][$i],
                    'type' => $_FILES['images']['type'][$i],
                    'size' => $_FILES['images']['size'][$i],
                ];
            }
        } elseif (!empty($_FILES['images']) && is_string($_FILES['images']['name'])) {
            if ((int) $_FILES['images']['error'] === UPLOAD_ERR_OK) {
                $files[] = [
                    'name' => $_FILES['images']['name'],
                    'tmp_name' => $_FILES['images']['tmp_name'],
                    'type' => $_FILES['images']['type'],
                    'size' => $_FILES['images']['size'],
                ];
            }
        }

        if (!$files) {
            jsonFail('No images uploaded. Use field name images[]', 422);
        }

        $dir = __DIR__ . '/uploads/properties';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            jsonFail('Cannot create upload directory', 500);
        }

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'terranexusproperties.com';
        $baseUrl = $scheme . '://' . $host . '/api';

        $countExisting = (int) $pdo->query("SELECT COUNT(*) FROM property_images WHERE property_id = {$propertyId} AND deleted_at IS NULL")->fetchColumn();
        $saved = [];
        $ins = $pdo->prepare(
            'INSERT INTO property_images (property_id, image_url, alt_text, is_primary, sort_order) VALUES (?,?,?,?,?)'
        );

        foreach ($files as $i => $file) {
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                continue;
            }
            $filename = 'prop' . $propertyId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $dest = $dir . '/' . $filename;
            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                continue;
            }
            @chmod($dest, 0644);
            $url = $baseUrl . '/uploads/properties/' . $filename;
            $isPrimary = ($countExisting === 0 && $i === 0) ? 1 : 0;
            $ins->execute([$propertyId, $url, $file['name'], $isPrimary, $countExisting + $i]);
            if ($isPrimary) {
                $pdo->prepare('UPDATE properties SET main_image = ? WHERE id = ?')->execute([$url, $propertyId]);
            }
            $saved[] = ['id' => (int) $pdo->lastInsertId(), 'image_url' => $url, 'is_primary' => $isPrimary];
        }

        if (!$saved) {
            jsonFail('Upload failed. Allowed: jpg, jpeg, png, webp, gif', 422);
        }

        $img = $pdo->prepare('SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order FROM property_images WHERE property_id = ? AND deleted_at IS NULL ORDER BY sort_order, id');
        $img->execute([$propertyId]);
        jsonOk(['images' => $img->fetchAll(), 'uploaded' => $saved], null, 201);
    }

    // PATCH /admin/properties/:id/images/:imageId
    if ($method === 'PATCH' && preg_match('#^/admin/properties/(\d+)/images/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $propertyId = (int) $m[1];
        $imageId = (int) $m[2];
        $b = bodyJson();
        if (!empty($b['is_primary'])) {
            $pdo->prepare('UPDATE property_images SET is_primary = 0 WHERE property_id = ? AND deleted_at IS NULL')->execute([$propertyId]);
            $pdo->prepare('UPDATE property_images SET is_primary = 1 WHERE id = ? AND property_id = ?')->execute([$imageId, $propertyId]);
            $st = $pdo->prepare('SELECT image_url FROM property_images WHERE id = ?');
            $st->execute([$imageId]);
            $url = $st->fetchColumn();
            if ($url) {
                $pdo->prepare('UPDATE properties SET main_image = ? WHERE id = ?')->execute([$url, $propertyId]);
            }
        }
        $img = $pdo->prepare('SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order FROM property_images WHERE property_id = ? AND deleted_at IS NULL ORDER BY sort_order, id');
        $img->execute([$propertyId]);
        jsonOk(['images' => $img->fetchAll()]);
    }

    // DELETE /admin/properties/:id/images/:imageId
    if ($method === 'DELETE' && preg_match('#^/admin/properties/(\d+)/images/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $propertyId = (int) $m[1];
        $imageId = (int) $m[2];
        $pdo->prepare('UPDATE property_images SET deleted_at = NOW() WHERE id = ? AND property_id = ?')->execute([$imageId, $propertyId]);
        $primary = $pdo->prepare('SELECT image_url FROM property_images WHERE property_id = ? AND deleted_at IS NULL ORDER BY is_primary DESC, sort_order, id LIMIT 1');
        $primary->execute([$propertyId]);
        $url = $primary->fetchColumn() ?: null;
        $pdo->prepare('UPDATE properties SET main_image = ? WHERE id = ?')->execute([$url, $propertyId]);
        $img = $pdo->prepare('SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order FROM property_images WHERE property_id = ? AND deleted_at IS NULL ORDER BY sort_order, id');
        $img->execute([$propertyId]);
        jsonOk(['images' => $img->fetchAll()]);
    }

    // DELETE /admin/properties/:id
    if ($method === 'DELETE' && preg_match('#^/admin/properties/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $pdo->prepare('UPDATE properties SET deleted_at = NOW() WHERE id = ?')->execute([(int) $m[1]]);
        jsonOk(['deleted' => true]);
    }

    // GET /admin/enquiries
    if ($method === 'GET' && $path === '/admin/enquiries') {
        requireAuth($env);
        $limit = min(100, max(1, (int) ($_GET['limit'] ?? 50)));
        $st = $pdo->query("SELECT * FROM enquiries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT {$limit}");
        jsonOk($st->fetchAll());
    }

    // PATCH /admin/enquiries/:id
    if ($method === 'PATCH' && preg_match('#^/admin/enquiries/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $b = bodyJson();
        if (!empty($b['status'])) {
            $pdo->prepare('UPDATE enquiries SET status = ? WHERE id = ?')->execute([$b['status'], (int) $m[1]]);
        }
        jsonOk(['updated' => true]);
    }

    // GET /admin/settings
    if ($method === 'GET' && $path === '/admin/settings') {
        requireAuth($env);
        $rows = $pdo->query('SELECT id, setting_group, setting_key, setting_value, value_type, is_public, updated_at FROM site_settings ORDER BY setting_group, setting_key')->fetchAll();
        jsonOk($rows);
    }

    // PUT /admin/settings
    if ($method === 'PUT' && $path === '/admin/settings') {
        requireAuth($env);
        $b = bodyJson();
        $settings = $b['settings'] ?? $b;
        if (!is_array($settings)) {
            jsonFail('Invalid settings payload', 422);
        }
        $st = $pdo->prepare(
            'INSERT INTO site_settings (setting_group, setting_key, setting_value, value_type, is_public)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value),
               setting_group = VALUES(setting_group),
               value_type = VALUES(value_type),
               is_public = VALUES(is_public)'
        );
        foreach ($settings as $row) {
            if (empty($row['setting_key'])) {
                continue;
            }
            $st->execute([
                $row['setting_group'] ?? 'general',
                $row['setting_key'],
                (string) ($row['setting_value'] ?? ''),
                $row['value_type'] ?? 'string',
                isset($row['is_public']) ? ((int) !!$row['is_public']) : 1,
            ]);
        }
        jsonOk(['updated' => true]);
    }

    // POST /admin/media — site image upload (homepage, etc.)
    if ($method === 'POST' && $path === '/admin/media') {
        requireAuth($env);
        if (empty($_FILES['file']) || (int) ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            jsonFail('No file uploaded. Use field name file', 422);
        }
        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico'], true)) {
            jsonFail('Allowed: jpg, jpeg, png, webp, gif, svg, ico', 422);
        }
        $dir = __DIR__ . '/uploads/site';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            jsonFail('Cannot create upload directory', 500);
        }
        $filename = 'site_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $dest = $dir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            jsonFail('Upload failed', 500);
        }
        @chmod($dest, 0644);
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'terranexusproperties.com';
        $url = $scheme . '://' . $host . '/api/uploads/site/' . $filename;
        jsonOk(['url' => $url, 'filename' => $filename], null, 201);
    }

    // GET /admin/testimonials
    if ($method === 'GET' && $path === '/admin/testimonials') {
        requireAuth($env);
        $rows = $pdo->query('SELECT id, name, role, avatar_url, rating, message, sort_order, is_active FROM testimonials WHERE deleted_at IS NULL ORDER BY sort_order, id DESC')->fetchAll();
        jsonOk($rows);
    }

    // POST /admin/testimonials
    if ($method === 'POST' && $path === '/admin/testimonials') {
        requireAuth($env);
        $b = bodyJson();
        if (trim((string) ($b['name'] ?? '')) === '' || trim((string) ($b['message'] ?? '')) === '') {
            jsonFail('Name and message are required', 422);
        }
        $st = $pdo->prepare('INSERT INTO testimonials (name, role, rating, message, sort_order, is_active) VALUES (?,?,?,?,?,1)');
        $st->execute([
            trim($b['name']),
            $b['role'] ?? null,
            (int) ($b['rating'] ?? 5),
            trim($b['message']),
            (int) ($b['sort_order'] ?? 0),
        ]);
        $id = (int) $pdo->lastInsertId();
        $row = $pdo->query("SELECT * FROM testimonials WHERE id = {$id}")->fetch();
        jsonOk($row, null, 201);
    }

    // DELETE /admin/testimonials/:id
    if ($method === 'DELETE' && preg_match('#^/admin/testimonials/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $pdo->prepare('UPDATE testimonials SET deleted_at = NOW() WHERE id = ?')->execute([(int) $m[1]]);
        jsonOk(['deleted' => true]);
    }

    ensureMasterTables($pdo);

    // ---- Masters: categories ----
    if ($method === 'GET' && $path === '/admin/categories') {
        requireAuth($env);
        jsonOk($pdo->query('SELECT * FROM property_categories WHERE deleted_at IS NULL ORDER BY sort_order, name')->fetchAll());
    }
    if ($method === 'POST' && $path === '/admin/categories') {
        requireAuth($env);
        $b = bodyJson();
        if (trim((string) ($b['name'] ?? '')) === '') {
            jsonFail('Name is required', 422);
        }
        $slug = toSlug((string) ($b['slug'] ?? $b['name']));
        $pdo->prepare(
            'INSERT INTO property_categories (name, slug, icon, description, sort_order, is_active)
             VALUES (?,?,?,?,?,?)'
        )->execute([
            trim($b['name']), $slug, $b['icon'] ?? null, $b['description'] ?? null,
            (int) ($b['sort_order'] ?? 0), toActiveFlag($b['is_active'] ?? true),
        ]);
        jsonOk(fetchById($pdo, 'property_categories', (int) $pdo->lastInsertId()), null, 201);
    }
    if ($method === 'PUT' && preg_match('#^/admin/categories/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $b = bodyJson();
        $id = (int) $m[1];
        $pdo->prepare(
            'UPDATE property_categories SET name=?, slug=?, icon=?, description=?, sort_order=?, is_active=?
             WHERE id=? AND deleted_at IS NULL'
        )->execute([
            trim((string) ($b['name'] ?? '')),
            toSlug((string) ($b['slug'] ?? $b['name'] ?? '')),
            $b['icon'] ?? null,
            $b['description'] ?? null,
            (int) ($b['sort_order'] ?? 0),
            toActiveFlag($b['is_active'] ?? true),
            $id,
        ]);
        jsonOk(fetchById($pdo, 'property_categories', $id));
    }
    if ($method === 'DELETE' && preg_match('#^/admin/categories/(\d+)$#', $path, $m)) {
        requireAuth($env);
        softDeleteRow($pdo, 'property_categories', (int) $m[1]);
        jsonOk(['deleted' => true]);
    }

    // ---- Masters: types ----
    if ($method === 'GET' && $path === '/admin/types') {
        requireAuth($env);
        jsonOk($pdo->query(
            'SELECT t.*, c.name AS category_name
             FROM property_types t
             LEFT JOIN property_categories c ON c.id = t.category_id
             WHERE t.deleted_at IS NULL
             ORDER BY t.sort_order, t.name'
        )->fetchAll());
    }
    if ($method === 'POST' && $path === '/admin/types') {
        requireAuth($env);
        $b = bodyJson();
        if (trim((string) ($b['name'] ?? '')) === '' || empty($b['category_id'])) {
            jsonFail('Name and category_id are required', 422);
        }
        $slug = toSlug((string) ($b['slug'] ?? $b['name']));
        $pdo->prepare(
            'INSERT INTO property_types (category_id, name, slug, icon, sort_order, is_active) VALUES (?,?,?,?,?,?)'
        )->execute([
            (int) $b['category_id'], trim($b['name']), $slug, $b['icon'] ?? null,
            (int) ($b['sort_order'] ?? 0), toActiveFlag($b['is_active'] ?? true),
        ]);
        jsonOk(fetchById($pdo, 'property_types', (int) $pdo->lastInsertId()), null, 201);
    }
    if ($method === 'PUT' && preg_match('#^/admin/types/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $b = bodyJson();
        $id = (int) $m[1];
        $pdo->prepare(
            'UPDATE property_types SET category_id=?, name=?, slug=?, icon=?, sort_order=?, is_active=?
             WHERE id=? AND deleted_at IS NULL'
        )->execute([
            (int) ($b['category_id'] ?? 0),
            trim((string) ($b['name'] ?? '')),
            toSlug((string) ($b['slug'] ?? $b['name'] ?? '')),
            $b['icon'] ?? null,
            (int) ($b['sort_order'] ?? 0),
            toActiveFlag($b['is_active'] ?? true),
            $id,
        ]);
        jsonOk(fetchById($pdo, 'property_types', $id));
    }
    if ($method === 'DELETE' && preg_match('#^/admin/types/(\d+)$#', $path, $m)) {
        requireAuth($env);
        softDeleteRow($pdo, 'property_types', (int) $m[1]);
        jsonOk(['deleted' => true]);
    }

    // ---- Masters: locations ----
    if ($method === 'GET' && $path === '/admin/locations') {
        requireAuth($env);
        jsonOk($pdo->query('SELECT * FROM locations WHERE deleted_at IS NULL ORDER BY sort_order, name')->fetchAll());
    }
    if ($method === 'POST' && $path === '/admin/locations') {
        requireAuth($env);
        $b = bodyJson();
        if (trim((string) ($b['name'] ?? '')) === '') {
            jsonFail('Name is required', 422);
        }
        $slug = toSlug((string) ($b['slug'] ?? $b['name']));
        $pdo->prepare(
            'INSERT INTO locations (name, slug, city, state, country, pincode, latitude, longitude, image_url, is_popular, sort_order, is_active)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            trim($b['name']), $slug,
            $b['city'] ?? $b['name'],
            $b['state'] ?? 'Maharashtra',
            $b['country'] ?? 'India',
            $b['pincode'] ?? null,
            $b['latitude'] !== '' ? ($b['latitude'] ?? null) : null,
            $b['longitude'] !== '' ? ($b['longitude'] ?? null) : null,
            $b['image_url'] ?? null,
            toActiveFlag($b['is_popular'] ?? false, false),
            (int) ($b['sort_order'] ?? 0),
            toActiveFlag($b['is_active'] ?? true),
        ]);
        jsonOk(fetchById($pdo, 'locations', (int) $pdo->lastInsertId()), null, 201);
    }
    if ($method === 'PUT' && preg_match('#^/admin/locations/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $b = bodyJson();
        $id = (int) $m[1];
        $pdo->prepare(
            'UPDATE locations SET name=?, slug=?, city=?, state=?, country=?, pincode=?, latitude=?, longitude=?,
              image_url=?, is_popular=?, sort_order=?, is_active=? WHERE id=? AND deleted_at IS NULL'
        )->execute([
            trim((string) ($b['name'] ?? '')),
            toSlug((string) ($b['slug'] ?? $b['name'] ?? '')),
            $b['city'] ?? '',
            $b['state'] ?? 'Maharashtra',
            $b['country'] ?? 'India',
            $b['pincode'] ?? null,
            $b['latitude'] !== '' ? ($b['latitude'] ?? null) : null,
            $b['longitude'] !== '' ? ($b['longitude'] ?? null) : null,
            $b['image_url'] ?? null,
            toActiveFlag($b['is_popular'] ?? false, false),
            (int) ($b['sort_order'] ?? 0),
            toActiveFlag($b['is_active'] ?? true),
            $id,
        ]);
        jsonOk(fetchById($pdo, 'locations', $id));
    }
    if ($method === 'DELETE' && preg_match('#^/admin/locations/(\d+)$#', $path, $m)) {
        requireAuth($env);
        softDeleteRow($pdo, 'locations', (int) $m[1]);
        jsonOk(['deleted' => true]);
    }

    // ---- Masters: amenities ----
    if ($method === 'GET' && $path === '/admin/amenities') {
        requireAuth($env);
        jsonOk($pdo->query('SELECT * FROM amenities WHERE deleted_at IS NULL ORDER BY sort_order, name')->fetchAll());
    }
    if ($method === 'POST' && $path === '/admin/amenities') {
        requireAuth($env);
        $b = bodyJson();
        if (trim((string) ($b['name'] ?? '')) === '') {
            jsonFail('Name is required', 422);
        }
        $slug = toSlug((string) ($b['slug'] ?? $b['name']));
        $pdo->prepare(
            'INSERT INTO amenities (name, slug, icon, amenity_group, sort_order, is_active) VALUES (?,?,?,?,?,?)'
        )->execute([
            trim($b['name']), $slug, $b['icon'] ?? null, $b['amenity_group'] ?? 'general',
            (int) ($b['sort_order'] ?? 0), toActiveFlag($b['is_active'] ?? true),
        ]);
        jsonOk(fetchById($pdo, 'amenities', (int) $pdo->lastInsertId()), null, 201);
    }
    if ($method === 'PUT' && preg_match('#^/admin/amenities/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $b = bodyJson();
        $id = (int) $m[1];
        $pdo->prepare(
            'UPDATE amenities SET name=?, slug=?, icon=?, amenity_group=?, sort_order=?, is_active=?
             WHERE id=? AND deleted_at IS NULL'
        )->execute([
            trim((string) ($b['name'] ?? '')),
            toSlug((string) ($b['slug'] ?? $b['name'] ?? '')),
            $b['icon'] ?? null,
            $b['amenity_group'] ?? 'general',
            (int) ($b['sort_order'] ?? 0),
            toActiveFlag($b['is_active'] ?? true),
            $id,
        ]);
        jsonOk(fetchById($pdo, 'amenities', $id));
    }
    if ($method === 'DELETE' && preg_match('#^/admin/amenities/(\d+)$#', $path, $m)) {
        requireAuth($env);
        softDeleteRow($pdo, 'amenities', (int) $m[1]);
        jsonOk(['deleted' => true]);
    }

    // ---- Masters: sellers ----
    if ($method === 'GET' && ($path === '/admin/sellers' || $path === '/sellers')) {
        if ($path === '/admin/sellers') {
            requireAuth($env);
        }
        $activeOnly = $path === '/sellers';
        $sql = 'SELECT * FROM sellers WHERE deleted_at IS NULL';
        if ($activeOnly) {
            $sql .= ' AND is_active = 1';
        }
        $sql .= ' ORDER BY sort_order, name';
        jsonOk($pdo->query($sql)->fetchAll());
    }
    if ($method === 'POST' && $path === '/admin/sellers') {
        requireAuth($env);
        $b = bodyJson();
        if (trim((string) ($b['name'] ?? '')) === '') {
            jsonFail('Name is required', 422);
        }
        $pdo->prepare(
            'INSERT INTO sellers (name, company_name, phone, whatsapp, email, rera_number, address, notes, sort_order, is_active)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            trim($b['name']),
            $b['company_name'] ?? null,
            $b['phone'] ?? null,
            $b['whatsapp'] ?? null,
            $b['email'] ?? null,
            $b['rera_number'] ?? null,
            $b['address'] ?? null,
            $b['notes'] ?? null,
            (int) ($b['sort_order'] ?? 0),
            toActiveFlag($b['is_active'] ?? true),
        ]);
        jsonOk(fetchById($pdo, 'sellers', (int) $pdo->lastInsertId()), null, 201);
    }
    if ($method === 'PUT' && preg_match('#^/admin/sellers/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $b = bodyJson();
        $id = (int) $m[1];
        $pdo->prepare(
            'UPDATE sellers SET name=?, company_name=?, phone=?, whatsapp=?, email=?, rera_number=?, address=?, notes=?,
              sort_order=?, is_active=? WHERE id=? AND deleted_at IS NULL'
        )->execute([
            trim((string) ($b['name'] ?? '')),
            $b['company_name'] ?? null,
            $b['phone'] ?? null,
            $b['whatsapp'] ?? null,
            $b['email'] ?? null,
            $b['rera_number'] ?? null,
            $b['address'] ?? null,
            $b['notes'] ?? null,
            (int) ($b['sort_order'] ?? 0),
            toActiveFlag($b['is_active'] ?? true),
            $id,
        ]);
        jsonOk(fetchById($pdo, 'sellers', $id));
    }
    if ($method === 'DELETE' && preg_match('#^/admin/sellers/(\d+)$#', $path, $m)) {
        requireAuth($env);
        softDeleteRow($pdo, 'sellers', (int) $m[1]);
        jsonOk(['deleted' => true]);
    }

    // ---- Masters: options ----
    if ($method === 'GET' && ($path === '/options' || $path === '/admin/options')) {
        if ($path === '/admin/options') {
            requireAuth($env);
        }
        $sql = 'SELECT id, master_type, name, value, sort_order, is_active FROM master_options WHERE deleted_at IS NULL';
        $params = [];
        if (!empty($_GET['type'])) {
            $sql .= ' AND master_type = ?';
            $params[] = $_GET['type'];
        }
        if ($path === '/options') {
            $sql .= ' AND is_active = 1';
        }
        $sql .= ' ORDER BY master_type, sort_order, name';
        $st = $pdo->prepare($sql);
        $st->execute($params);
        jsonOk($st->fetchAll());
    }
    if ($method === 'POST' && $path === '/admin/options') {
        requireAuth($env);
        $b = bodyJson();
        $type = trim((string) ($b['master_type'] ?? ''));
        $name = trim((string) ($b['name'] ?? ''));
        if ($type === '' || $name === '') {
            jsonFail('master_type and name are required', 422);
        }
        $value = trim((string) ($b['value'] ?? toSlug($name)));
        $pdo->prepare(
            'INSERT INTO master_options (master_type, name, value, sort_order, is_active) VALUES (?,?,?,?,?)'
        )->execute([$type, $name, $value, (int) ($b['sort_order'] ?? 0), toActiveFlag($b['is_active'] ?? true)]);
        jsonOk(fetchById($pdo, 'master_options', (int) $pdo->lastInsertId()), null, 201);
    }
    if ($method === 'PUT' && preg_match('#^/admin/options/(\d+)$#', $path, $m)) {
        requireAuth($env);
        $b = bodyJson();
        $id = (int) $m[1];
        $pdo->prepare(
            'UPDATE master_options SET master_type=?, name=?, value=?, sort_order=?, is_active=?
             WHERE id=? AND deleted_at IS NULL'
        )->execute([
            trim((string) ($b['master_type'] ?? '')),
            trim((string) ($b['name'] ?? '')),
            trim((string) ($b['value'] ?? '')),
            (int) ($b['sort_order'] ?? 0),
            toActiveFlag($b['is_active'] ?? true),
            $id,
        ]);
        jsonOk(fetchById($pdo, 'master_options', $id));
    }
    if ($method === 'DELETE' && preg_match('#^/admin/options/(\d+)$#', $path, $m)) {
        requireAuth($env);
        softDeleteRow($pdo, 'master_options', (int) $m[1]);
        jsonOk(['deleted' => true]);
    }

    // Field definitions for type-specific Excel fields
    if ($method === 'GET' && ($path === '/field-definitions' || $path === '/admin/field-definitions')) {
        if ($path === '/admin/field-definitions') {
            requireAuth($env);
        }
        $sql = 'SELECT * FROM property_field_definitions WHERE is_active = 1';
        $params = [];
        if (!empty($_GET['sub_category'])) {
            $sql .= ' AND sub_category = ?';
            $params[] = $_GET['sub_category'];
        } elseif (!empty($_GET['type'])) {
            $sql .= ' AND sub_category = ?';
            $params[] = $_GET['type'];
        }
        $sql .= ' ORDER BY sort_order, field_name';
        $st = $pdo->prepare($sql);
        $st->execute($params);
        jsonOk($st->fetchAll());
    }

    jsonFail('Not found', 404);
} catch (Throwable $e) {
    jsonFail('Server error: ' . $e->getMessage(), 500);
}
