const { query } = require('../db/pool');
const { toSlug } = require('../utils/helpers');
const { AppError } = require('../utils/response');

async function listCategories(activeOnly = true) {
  return query(
    `SELECT id, name, slug, icon, image_url, description, sort_order, is_active
     FROM property_categories
     WHERE deleted_at IS NULL ${activeOnly ? 'AND is_active = 1' : ''}
     ORDER BY sort_order, name`
  );
}

async function listTypes(categoryId = null, activeOnly = true) {
  const params = {};
  let sql = `SELECT t.id, t.category_id, t.name, t.slug, t.icon, t.sort_order, t.is_active,
                    c.name AS category_name
             FROM property_types t
             LEFT JOIN property_categories c ON c.id = t.category_id
             WHERE t.deleted_at IS NULL`;
  if (activeOnly) sql += ' AND t.is_active = 1';
  if (categoryId) {
    sql += ' AND t.category_id = :categoryId';
    params.categoryId = categoryId;
  }
  sql += ' ORDER BY t.sort_order, t.name';
  return query(sql, params);
}

async function listLocations(opts = {}) {
  const { popularOnly = false, activeOnly = true } = opts;
  let sql = `SELECT id, name, slug, city, state, country, pincode, latitude, longitude,
                    image_url, is_popular, property_count_cache, sort_order, is_active
             FROM locations WHERE deleted_at IS NULL`;
  if (activeOnly) sql += ' AND is_active = 1';
  if (popularOnly) sql += ' AND is_popular = 1';
  sql += ' ORDER BY sort_order, name';
  return query(sql);
}

/**
 * Amenities with their linked property types. An amenity with no linked types
 * applies to every type. Pass typeId to get only amenities valid for that type.
 */
async function listAmenities(activeOnly = true, typeId = null) {
  const params = {};
  let typeSql = '';
  if (typeId) {
    typeSql = `AND (
      NOT EXISTS (SELECT 1 FROM amenity_property_types x WHERE x.amenity_id = a.id)
      OR EXISTS (SELECT 1 FROM amenity_property_types x WHERE x.amenity_id = a.id AND x.type_id = :typeId)
    )`;
    params.typeId = Number(typeId);
  }
  const rows = await query(
    `SELECT a.id, a.name, a.slug, a.icon, a.amenity_group, a.sort_order, a.is_active,
            GROUP_CONCAT(DISTINCT apt.type_id ORDER BY apt.type_id) AS type_ids_csv,
            GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') AS type_names
     FROM amenities a
     LEFT JOIN amenity_property_types apt ON apt.amenity_id = a.id
     LEFT JOIN property_types t ON t.id = apt.type_id AND t.deleted_at IS NULL
     WHERE a.deleted_at IS NULL ${activeOnly ? 'AND a.is_active = 1' : ''} ${typeSql}
     GROUP BY a.id, a.name, a.slug, a.icon, a.amenity_group, a.sort_order, a.is_active
     ORDER BY a.sort_order, a.name`,
    params
  );
  return rows.map(({ type_ids_csv, ...row }) => ({
    ...row,
    type_ids: type_ids_csv ? String(type_ids_csv).split(',').map(Number).filter(Boolean) : [],
  }));
}

async function setAmenityTypes(amenityId, typeIds) {
  if (!Array.isArray(typeIds)) return;
  const ids = [...new Set(typeIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  await query('DELETE FROM amenity_property_types WHERE amenity_id = :amenityId', { amenityId });
  for (const typeId of ids) {
    await query(
      'INSERT IGNORE INTO amenity_property_types (amenity_id, type_id) VALUES (:amenityId, :typeId)',
      { amenityId, typeId }
    );
  }
}

function toActiveFlag(value, defaultActive = true) {
  if (value === undefined || value === null || value === '') return defaultActive ? 1 : 0;
  if (value === false || value === 0 || value === '0') return 0;
  return 1;
}

async function upsertCategory(data, id = null) {
  const slug = data.slug || toSlug(data.name);
  if (id) {
    await query(
      `UPDATE property_categories SET name=:name, slug=:slug, icon=:icon,
        description=:description, sort_order=:sort_order, is_active=:is_active
       WHERE id=:id AND deleted_at IS NULL`,
      {
        name: data.name,
        slug,
        icon: data.icon || null,
        description: data.description || null,
        sort_order: data.sort_order || 0,
        is_active: toActiveFlag(data.is_active, true),
        id,
      }
    );
    return getById('property_categories', id);
  }
  const result = await query(
    `INSERT INTO property_categories (name, slug, icon, description, sort_order, is_active)
     VALUES (:name, :slug, :icon, :description, :sort_order, :is_active)`,
    {
      name: data.name,
      slug,
      icon: data.icon || null,
      description: data.description || null,
      sort_order: data.sort_order || 0,
      is_active: toActiveFlag(data.is_active, true),
    }
  );
  return getById('property_categories', result.insertId);
}

async function upsertType(data, id = null) {
  const slug = data.slug || toSlug(data.name);
  if (id) {
    await query(
      `UPDATE property_types SET category_id=:category_id, name=:name, slug=:slug,
        icon=:icon, sort_order=:sort_order, is_active=:is_active
       WHERE id=:id AND deleted_at IS NULL`,
      {
        category_id: data.category_id,
        name: data.name,
        slug,
        icon: data.icon || null,
        sort_order: data.sort_order || 0,
        is_active: toActiveFlag(data.is_active, true),
        id,
      }
    );
    return getById('property_types', id);
  }
  const result = await query(
    `INSERT INTO property_types (category_id, name, slug, icon, sort_order, is_active)
     VALUES (:category_id, :name, :slug, :icon, :sort_order, :is_active)`,
    {
      category_id: data.category_id,
      name: data.name,
      slug,
      icon: data.icon || null,
      sort_order: data.sort_order || 0,
      is_active: toActiveFlag(data.is_active, true),
    }
  );
  return getById('property_types', result.insertId);
}

async function upsertLocation(data, id = null) {
  const slug = data.slug || toSlug(data.name);
  const payload = {
    name: data.name,
    slug,
    city: data.city || 'Navi Mumbai',
    state: data.state || 'Maharashtra',
    country: data.country || 'India',
    pincode: data.pincode || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    image_url: data.image_url || null,
    is_popular: data.is_popular === true || data.is_popular === 1 || data.is_popular === '1' ? 1 : 0,
    sort_order: data.sort_order || 0,
    is_active: toActiveFlag(data.is_active, true),
  };
  if (id) {
    await query(
      `UPDATE locations SET name=:name, slug=:slug, city=:city, state=:state, country=:country,
        pincode=:pincode, latitude=:latitude, longitude=:longitude, image_url=:image_url,
        is_popular=:is_popular, sort_order=:sort_order, is_active=:is_active
       WHERE id=:id AND deleted_at IS NULL`,
      { ...payload, id }
    );
    return getById('locations', id);
  }
  const result = await query(
    `INSERT INTO locations (name, slug, city, state, country, pincode, latitude, longitude,
      image_url, is_popular, sort_order, is_active)
     VALUES (:name,:slug,:city,:state,:country,:pincode,:latitude,:longitude,
      :image_url,:is_popular,:sort_order,:is_active)`,
    payload
  );
  return getById('locations', result.insertId);
}

async function upsertAmenity(data, id = null) {
  const slug = data.slug || toSlug(data.name);
  if (id) {
    await query(
      `UPDATE amenities SET name=:name, slug=:slug, icon=:icon, amenity_group=:amenity_group,
        sort_order=:sort_order, is_active=:is_active WHERE id=:id AND deleted_at IS NULL`,
      {
        name: data.name,
        slug,
        icon: data.icon || null,
        amenity_group: data.amenity_group || 'general',
        sort_order: data.sort_order || 0,
        is_active: toActiveFlag(data.is_active, true),
        id,
      }
    );
    await setAmenityTypes(id, data.type_ids);
    return getById('amenities', id);
  }
  const result = await query(
    `INSERT INTO amenities (name, slug, icon, amenity_group, sort_order, is_active)
     VALUES (:name,:slug,:icon,:amenity_group,:sort_order,:is_active)`,
    {
      name: data.name,
      slug,
      icon: data.icon || null,
      amenity_group: data.amenity_group || 'general',
      sort_order: data.sort_order || 0,
      is_active: toActiveFlag(data.is_active, true),
    }
  );
  await setAmenityTypes(result.insertId, data.type_ids);
  return getById('amenities', result.insertId);
}

const MASTER_OPTION_TYPES = [
  'purpose',
  'status',
  'facing',
  'furnishing',
  'possession_status',
  'area_unit',
  'price_type',
];

const DEFAULT_MASTER_OPTIONS = [
  ['purpose', 'Sale', 'sale', 1],
  ['purpose', 'Rent', 'rent', 2],
  ['status', 'Draft', 'draft', 1],
  ['status', 'Published', 'published', 2],
  ['status', 'Sold', 'sold', 3],
  ['status', 'Rented', 'rented', 4],
  ['status', 'Inactive', 'inactive', 5],
  ['status', 'Expired', 'expired', 6],
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
];

let masterOptionsReady = false;

async function ensureMasterOptions() {
  if (masterOptionsReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS master_options (
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
      UNIQUE KEY uk_master_type_value (master_type, value),
      KEY idx_master_type_active (master_type, is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const existing = await query('SELECT COUNT(*) AS cnt FROM master_options WHERE deleted_at IS NULL');
  if (!Number(existing[0]?.cnt)) {
    for (const [master_type, name, value, sort_order] of DEFAULT_MASTER_OPTIONS) {
      await query(
        `INSERT IGNORE INTO master_options (master_type, name, value, sort_order, is_active)
         VALUES (:master_type, :name, :value, :sort_order, 1)`,
        { master_type, name, value, sort_order }
      );
    }
  }
  masterOptionsReady = true;
}

async function listOptions(masterType = null, activeOnly = true) {
  await ensureMasterOptions();
  const params = {};
  let sql = `SELECT id, master_type, name, value, sort_order, is_active
             FROM master_options WHERE deleted_at IS NULL`;
  if (masterType) {
    sql += ' AND master_type = :masterType';
    params.masterType = masterType;
  }
  if (activeOnly) sql += ' AND is_active = 1';
  sql += ' ORDER BY master_type, sort_order, name';
  return query(sql, params);
}

async function upsertOption(data, id = null) {
  await ensureMasterOptions();
  const masterType = String(data.master_type || '').trim();
  if (!MASTER_OPTION_TYPES.includes(masterType)) {
    throw new AppError(`Invalid master type. Allowed: ${MASTER_OPTION_TYPES.join(', ')}`, 400);
  }
  const name = String(data.name || '').trim();
  if (!name) throw new AppError('Name is required', 400);
  const value = String(data.value || toSlug(name) || '').trim();
  if (!value) throw new AppError('Value is required', 400);

  const payload = {
    master_type: masterType,
    name,
    value,
    sort_order: data.sort_order || 0,
    is_active: toActiveFlag(data.is_active, true),
  };

  if (id) {
    await query(
      `UPDATE master_options SET master_type=:master_type, name=:name, value=:value,
        sort_order=:sort_order, is_active=:is_active
       WHERE id=:id AND deleted_at IS NULL`,
      { ...payload, id }
    );
    return getById('master_options', id);
  }

  const result = await query(
    `INSERT INTO master_options (master_type, name, value, sort_order, is_active)
     VALUES (:master_type, :name, :value, :sort_order, :is_active)`,
    payload
  );
  return getById('master_options', result.insertId);
}

async function ensureSellersTable() {
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
}

async function listSellers(activeOnly = true) {
  await ensureSellersTable();
  return query(
    `SELECT * FROM sellers WHERE deleted_at IS NULL ${activeOnly ? 'AND is_active = 1' : ''}
     ORDER BY sort_order, name`
  );
}

async function upsertSeller(data, id = null) {
  await ensureSellersTable();
  if (!String(data.name || '').trim()) throw new AppError('Name is required', 400);
  const payload = {
    name: String(data.name).trim(),
    company_name: data.company_name || null,
    phone: data.phone || null,
    whatsapp: data.whatsapp || null,
    email: data.email || null,
    rera_number: data.rera_number || null,
    address: data.address || null,
    notes: data.notes || null,
    sort_order: data.sort_order || 0,
    is_active: toActiveFlag(data.is_active, true),
  };
  if (id) {
    await query(
      `UPDATE sellers SET name=:name, company_name=:company_name, phone=:phone, whatsapp=:whatsapp,
        email=:email, rera_number=:rera_number, address=:address, notes=:notes,
        sort_order=:sort_order, is_active=:is_active WHERE id=:id AND deleted_at IS NULL`,
      { ...payload, id }
    );
    return getById('sellers', id);
  }
  const result = await query(
    `INSERT INTO sellers (name, company_name, phone, whatsapp, email, rera_number, address, notes, sort_order, is_active)
     VALUES (:name,:company_name,:phone,:whatsapp,:email,:rera_number,:address,:notes,:sort_order,:is_active)`,
    payload
  );
  return getById('sellers', result.insertId);
}

async function listFieldDefinitions(subCategory = null) {
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
  const params = {};
  let sql = `SELECT * FROM property_field_definitions WHERE is_active = 1`;
  if (subCategory) {
    sql += ' AND sub_category = :subCategory';
    params.subCategory = subCategory;
  }
  sql += ' ORDER BY sort_order, field_name';
  const rows = await query(sql, params);
  return rows.map((r) => {
    let options = [];
    try { options = r.options ? JSON.parse(r.options) : []; } catch { options = []; }
    return { ...r, options };
  });
}

async function softDelete(table, id) {
  const allowed = ['property_categories', 'property_types', 'locations', 'amenities', 'master_options', 'sellers'];
  if (!allowed.includes(table)) throw new AppError('Invalid table', 400);
  if (table === 'master_options') await ensureMasterOptions();
  if (table === 'sellers') await ensureSellersTable();
  const result = await query(
    `UPDATE ${table} SET deleted_at = NOW(), is_active = 0 WHERE id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (!result.affectedRows) throw new AppError('Record not found', 404);
  return true;
}

async function getById(table, id) {
  const rows = await query(`SELECT * FROM ${table} WHERE id = :id AND deleted_at IS NULL`, { id });
  if (!rows.length) throw new AppError('Record not found', 404);
  return rows[0];
}

module.exports = {
  MASTER_OPTION_TYPES,
  listCategories,
  listTypes,
  listLocations,
  listAmenities,
  listOptions,
  listSellers,
  listFieldDefinitions,
  upsertCategory,
  upsertType,
  upsertLocation,
  upsertAmenity,
  upsertOption,
  upsertSeller,
  softDelete,
};
