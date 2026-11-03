<?php
/**
 * One-time seed for Terranexus — DELETE this file after running.
 * Visit: https://terranexusproperties.com/api/seed_once.php?key=terra-seed-2026
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

if (($_GET['key'] ?? '') !== 'terra-seed-2026') {
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

try {
    $env = loadEnv(__DIR__ . '/.env');
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $env['DB_HOST'] ?? 'localhost', $env['DB_NAME'] ?? ''),
        $env['DB_USER'] ?? '',
        $env['DB_PASSWORD'] ?? '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $hash = password_hash('Admin@12345', PASSWORD_BCRYPT);
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

    // Upsert admin
    $exists = $pdo->prepare('SELECT id FROM admin_users WHERE email = ? AND deleted_at IS NULL LIMIT 1');
    $exists->execute(['admin@terranexusproperties.com']);
    $row = $exists->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $pdo->prepare('UPDATE admin_users SET password_hash = ?, name = ?, phone = ?, role = ?, is_active = 1 WHERE id = ?')
            ->execute([$hash, 'Site Administrator', '7350196969', 'super_admin', $row['id']]);
        $adminAction = 'updated';
    } else {
        $pdo->prepare('INSERT INTO admin_users (uuid, name, email, phone, password_hash, role, is_active) VALUES (?,?,?,?,?,?,1)')
            ->execute([$uuid, 'Site Administrator', 'admin@terranexusproperties.com', '7350196969', $hash, 'super_admin']);
        $adminAction = 'created';
    }

    // Seed settings if empty
    $settingsCount = (int) $pdo->query('SELECT COUNT(*) FROM site_settings')->fetchColumn();
    if ($settingsCount === 0) {
        $settings = [
            ['brand', 'site_name', 'Terranexus Properties', 'string'],
            ['brand', 'site_tagline', 'Buy · Sell · Rent across India', 'string'],
            ['brand', 'logo_url', '/assets/logo.svg', 'string'],
            ['brand', 'favicon_url', '/assets/favicon.ico', 'string'],
            ['theme', 'primary_color', '#1B64F2', 'color'],
            ['theme', 'secondary_color', '#0F172A', 'color'],
            ['theme', 'accent_color', '#F5B942', 'color'],
            ['theme', 'surface_color', '#F4F7FC', 'color'],
            ['theme', 'enable_3d', 'true', 'boolean'],
            ['contact', 'phone', '+91 73501 96969', 'string'],
            ['contact', 'whatsapp', '917350196969', 'string'],
            ['contact', 'email', 'terranexusproperties@gmail.com', 'string'],
            ['contact', 'address', 'India', 'string'],
            ['features', 'show_whatsapp_float', 'true', 'boolean'],
            ['features', 'show_call_float', 'true', 'boolean'],
            ['features', 'currency_symbol', '₹', 'string'],
            ['features', 'price_format', 'indian', 'string'],
            ['seo', 'default_title', 'Terranexus Properties | Find Your Dream Home', 'string'],
            ['seo', 'default_description', 'Browse sale & rent properties across India with Terranexus Properties.', 'string'],
        ];
        $ins = $pdo->prepare('INSERT INTO site_settings (setting_group, setting_key, setting_value, value_type, is_public) VALUES (?,?,?,?,1)');
        foreach ($settings as $s) {
            $ins->execute($s);
        }
    }

    // Categories
    $catCount = (int) $pdo->query('SELECT COUNT(*) FROM property_categories WHERE deleted_at IS NULL')->fetchColumn();
    if ($catCount === 0) {
        $pdo->exec("INSERT INTO property_categories (name, slug, icon, sort_order) VALUES
            ('Residential','residential','home',1),
            ('Commercial','commercial','building',2),
            ('Industrial','industrial','factory',3),
            ('Land / Plot','land-plot','map',4)");
        $pdo->exec("INSERT INTO property_types (category_id, name, slug, sort_order) VALUES
            (1,'Apartment','apartment',1),(1,'Flat','flat',2),(1,'Villa','villa',3),(1,'Bungalow','bungalow',4),
            (1,'Row House','row-house',5),(1,'Penthouse','penthouse',6),(1,'Studio','studio',7),(1,'Plot','residential-plot-type',8),
            (2,'Office','office',1),(2,'Shop','shop',2),(2,'Showroom','showroom',3),(2,'Warehouse','warehouse',4),
            (2,'Commercial Building','commercial-building',5),(2,'Commercial Plot','commercial-plot-type',6),
            (3,'Industrial Shed','industrial-shed',1),(3,'Industrial Land','industrial-land',2),
            (4,'Residential Plot','residential-plot',1),(4,'Commercial Plot','commercial-plot',2),(4,'Agricultural Land','agricultural-land',3)");
        $pdo->exec("INSERT INTO locations (name, slug, city, state, is_popular, sort_order, latitude, longitude) VALUES
            ('Kharghar','kharghar','Navi Mumbai','Maharashtra',1,1,19.044,73.061),
            ('Panvel','panvel','Navi Mumbai','Maharashtra',1,2,18.9894,73.1175),
            ('Kamothe','kamothe','Navi Mumbai','Maharashtra',1,3,19.0167,73.0967),
            ('Kalamboli','kalamboli','Navi Mumbai','Maharashtra',1,4,19.0333,73.1),
            ('Taloja','taloja','Navi Mumbai','Maharashtra',1,5,19.0756,73.12),
            ('Belapur','belapur','Navi Mumbai','Maharashtra',1,6,19.0237,73.0392),
            ('Ulwe','ulwe','Navi Mumbai','Maharashtra',0,7,18.978,73.03),
            ('Nerul','nerul','Navi Mumbai','Maharashtra',0,8,19.033,73.0197)");
        $pdo->exec("INSERT INTO amenities (name, slug, icon, amenity_group, sort_order) VALUES
            ('Lift','lift','elevator','building',1),('Parking','parking','car','building',2),
            ('Security','security','shield','safety',3),('CCTV','cctv','camera','safety',4),
            ('Gym','gym','dumbbell','lifestyle',5),('Swimming Pool','swimming-pool','pool','lifestyle',6),
            ('Garden','garden','tree','lifestyle',7),('Power Backup','power-backup','zap','utilities',10)");
        $pdo->exec("INSERT INTO content_blocks (block_key, title, subtitle, body, cta_label, cta_url, sort_order) VALUES
            ('hero','Find Your Dream Home','Sale & Rent across India','Premium apartments, villas, shops and plots — curated by Terranexus Properties.','Browse Properties','/properties',1),
            ('about','Your Trusted Property Partner','Pan-India specialists','We help buyers and renters discover the right home.','About Us','/about',2),
            ('cta','Ready to find your next property?','Talk to our consultant today','Call or WhatsApp for site visits.','Enquire Now','/contact',4)");
        $pdo->exec("INSERT INTO testimonials (name, role, rating, message, sort_order) VALUES
            ('Rahul Sharma','Home Buyer, Kharghar',5,'Found a perfect 2 BHK within a week.',1),
            ('Priya Nair','Tenant, Kamothe',5,'Smooth rentals experience.',2),
            ('Amit Patil','Investor, Panvel',5,'Clear documentation support.',3)");
    }

    // Self-delete when possible
    $deleted = @unlink(__FILE__);

    echo json_encode([
        'ok' => true,
        'admin' => $adminAction,
        'login' => [
            'email' => 'admin@terranexusproperties.com',
            'password' => 'Admin@12345',
        ],
        'settings' => (int) $pdo->query('SELECT COUNT(*) FROM site_settings')->fetchColumn(),
        'categories' => (int) $pdo->query('SELECT COUNT(*) FROM property_categories WHERE deleted_at IS NULL')->fetchColumn(),
        'self_deleted' => (bool) $deleted,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
}
