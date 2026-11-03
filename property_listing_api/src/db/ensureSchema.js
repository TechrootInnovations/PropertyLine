/**
 * Idempotent runtime schema upgrades (safe on every boot, MySQL 5.7+/8 & MariaDB).
 * Adds the columns/tables needed by admin features without dropping any data.
 */
const { query } = require('./pool');

async function columnInfo(table, column) {
  const rows = await query(
    `SELECT DATA_TYPE AS dataType FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { table, column }
  );
  return rows[0] || null;
}

async function addColumn(table, column, definition) {
  if (await columnInfo(table, column)) return;
  await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function run() {
  // Sellers (older installs may not have it yet)
  await query(`
    CREATE TABLE IF NOT EXISTS sellers (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Properties: columns used by the property form
  await addColumn('properties', 'seller_id', 'INT UNSIGNED DEFAULT NULL AFTER location_id');
  await addColumn('properties', 'extra_attributes', 'JSON DEFAULT NULL');
  await addColumn('properties', 'show_exact_location', 'TINYINT(1) NOT NULL DEFAULT 1');
  await addColumn('properties', 'youtube_url', 'VARCHAR(500) DEFAULT NULL');
  await addColumn('properties', 'brochure_url', 'VARCHAR(500) DEFAULT NULL');
  await addColumn('properties', 'floor_plan_url', 'VARCHAR(500) DEFAULT NULL');
  await addColumn('properties', 'rera_number', 'VARCHAR(120) DEFAULT NULL');
  await query(`
    CREATE TABLE IF NOT EXISTS property_field_definitions (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await addColumn('property_field_definitions', 'options', 'TEXT NULL');

  // Email transaction log (owner alerts, customer acknowledgements, tests)
  await query(`
    CREATE TABLE IF NOT EXISTS email_logs (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Amenity ↔ property type mapping (no rows = amenity applies to every type)
  await query(`
    CREATE TABLE IF NOT EXISTS amenity_property_types (
      amenity_id INT UNSIGNED NOT NULL,
      type_id INT UNSIGNED NOT NULL,
      PRIMARY KEY (amenity_id, type_id),
      KEY idx_apt_type (type_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Enquiries: CRM fields
  const status = await columnInfo('enquiries', 'status');
  if (status && status.dataType === 'enum') {
    await query(`ALTER TABLE enquiries MODIFY status VARCHAR(30) NOT NULL DEFAULT 'new'`);
  }
  await addColumn('enquiries', 'city', 'VARCHAR(100) DEFAULT NULL AFTER email');
  await addColumn('enquiries', 'property_type_id', 'INT UNSIGNED DEFAULT NULL AFTER property_title');
  await addColumn('enquiries', 'lead_type', "VARCHAR(30) NOT NULL DEFAULT 'normal' AFTER status");
  await addColumn('enquiries', 'follow_up_date', 'DATE DEFAULT NULL AFTER lead_type');
  await addColumn('enquiries', 'source', "VARCHAR(30) NOT NULL DEFAULT 'website' AFTER follow_up_date");
  await addColumn('enquiries', 'created_by', 'BIGINT UNSIGNED DEFAULT NULL');

  // Follow-up / communication history (date-wise conversation log)
  await query(`
    CREATE TABLE IF NOT EXISTS enquiry_followups (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

let ready = null;

function ensureSchema() {
  if (!ready) {
    ready = run().catch((err) => {
      ready = null;
      console.error('Schema upgrade failed:', err.message);
      throw err;
    });
  }
  return ready;
}

module.exports = { ensureSchema };
