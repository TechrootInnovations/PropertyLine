const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../db/pool');
const { toSlug, pagination, formatIndianPrice } = require('../utils/helpers');
const { AppError } = require('../utils/response');

function mapProperty(row, currencySymbol = '₹') {
  if (!row) return null;
  const displayPrice =
    row.price_display ||
    (row.purpose === 'rent'
      ? row.monthly_rent != null
        ? `${formatIndianPrice(row.monthly_rent, currencySymbol)}/mo`
        : null
      : formatIndianPrice(row.price, currencySymbol));

  return {
    ...row,
    is_featured: !!row.is_featured,
    price_formatted: displayPrice,
  };
}

async function searchProperties(filters = {}, opts = {}) {
  const { page, limit, offset } = pagination(filters);
  const where = ['p.deleted_at IS NULL'];
  const params = {};

  if (!opts.includeDrafts) {
    where.push(`p.status = 'published'`);
  } else if (filters.status) {
    where.push('p.status = :status');
    params.status = filters.status;
  }

  if (filters.purpose) {
    where.push('p.purpose = :purpose');
    params.purpose = filters.purpose;
  }
  if (filters.category || filters.category_id) {
    if (filters.category_id) {
      where.push('p.category_id = :category_id');
      params.category_id = filters.category_id;
    } else {
      where.push('c.slug = :category');
      params.category = filters.category;
    }
  }
  if (filters.type || filters.type_id) {
    if (filters.type_id) {
      where.push('p.type_id = :type_id');
      params.type_id = filters.type_id;
    } else {
      where.push('t.slug = :type');
      params.type = filters.type;
    }
  }
  if (filters.location || filters.location_id) {
    if (filters.location_id) {
      where.push('p.location_id = :location_id');
      params.location_id = filters.location_id;
    } else {
      where.push('(l.slug = :location OR p.locality LIKE :locationLike OR p.city LIKE :locationLike)');
      params.location = filters.location;
      params.locationLike = `%${filters.location}%`;
    }
  }
  if (filters.q) {
    const adminQ = opts.includeDrafts
      ? ' OR p.locality LIKE :qLike OR p.city LIKE :qLike OR t.name LIKE :qLike OR l.name LIKE :qLike OR s.name LIKE :qLike OR s.phone LIKE :qLike'
      : '';
    where.push(`(MATCH(p.title, p.short_description, p.locality, p.city, p.address) AGAINST (:q IN BOOLEAN MODE) OR p.title LIKE :qLike OR p.property_code LIKE :qLike${adminQ})`);
    params.q = `${String(filters.q).replace(/[+\-><()~*"@]/g, ' ').trim()}*`;
    params.qLike = `%${filters.q}%`;
  }
  if (opts.includeDrafts && filters.seller_id) {
    where.push('p.seller_id = :seller_id');
    params.seller_id = Number(filters.seller_id);
  }
  if (filters.min_price) {
    where.push('COALESCE(p.price, p.monthly_rent, 0) >= :min_price');
    params.min_price = Number(filters.min_price);
  }
  if (filters.max_price) {
    where.push('COALESCE(p.price, p.monthly_rent, 0) <= :max_price');
    params.max_price = Number(filters.max_price);
  }
  if (filters.bedrooms) {
    if (String(filters.bedrooms).endsWith('+')) {
      where.push('p.bedrooms >= :bedrooms');
      params.bedrooms = Number(String(filters.bedrooms).replace('+', ''));
    } else {
      where.push('p.bedrooms = :bedrooms');
      params.bedrooms = Number(filters.bedrooms);
    }
  }
  if (filters.min_area) {
    where.push('COALESCE(p.carpet_area, p.builtup_area, p.plot_area, 0) >= :min_area');
    params.min_area = Number(filters.min_area);
  }
  if (filters.max_area) {
    where.push('COALESCE(p.carpet_area, p.builtup_area, p.plot_area, 0) <= :max_area');
    params.max_area = Number(filters.max_area);
  }
  if (filters.furnishing) {
    where.push('p.furnishing = :furnishing');
    params.furnishing = filters.furnishing;
  }
  if (filters.possession) {
    where.push('p.possession_status = :possession');
    params.possession = filters.possession;
  }
  if (filters.featured === '1' || filters.featured === 'true') {
    where.push('p.is_featured = 1');
  }
  if (filters.amenity_ids) {
    const ids = String(filters.amenity_ids)
      .split(',')
      .map((x) => Number(x))
      .filter(Boolean);
    if (ids.length) {
      where.push(`p.id IN (
        SELECT property_id FROM property_amenities
        WHERE amenity_id IN (${ids.map((_, i) => `:am${i}`).join(',')})
        GROUP BY property_id HAVING COUNT(DISTINCT amenity_id) = ${ids.length}
      )`);
      ids.forEach((id, i) => {
        params[`am${i}`] = id;
      });
    }
  }

  const sortMap = {
    created: 'p.created_at DESC, p.id DESC',
    newest: 'p.published_at DESC, p.id DESC',
    price_asc: 'COALESCE(p.price, p.monthly_rent) ASC',
    price_desc: 'COALESCE(p.price, p.monthly_rent) DESC',
    featured: 'p.is_featured DESC, p.published_at DESC',
  };
  const orderBy = sortMap[filters.sort] || (opts.includeDrafts ? sortMap.created : sortMap.newest);
  const whereSql = where.join(' AND ');
  // Seller/owner details are admin-only
  const sellerJoin = opts.includeDrafts ? 'LEFT JOIN sellers s ON s.id = p.seller_id' : '';
  const sellerCols = opts.includeDrafts
    ? ', p.seller_id, s.name AS seller_name, s.phone AS seller_phone, p.enquiries_count, p.created_at'
    : '';

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM properties p
     JOIN property_categories c ON c.id = p.category_id
     JOIN property_types t ON t.id = p.type_id
     LEFT JOIN locations l ON l.id = p.location_id
     ${sellerJoin}
     WHERE ${whereSql}`,
    params
  );

  const rows = await query(
    `SELECT p.id, p.uuid, p.property_code, p.title, p.slug, p.purpose, p.status,
            p.is_featured, p.short_description, p.price, p.price_display, p.monthly_rent,
            p.currency, p.bedrooms, p.bathrooms, p.carpet_area, p.builtup_area, p.plot_area,
            p.area_unit, p.furnishing, p.possession_status, p.main_image, p.locality, p.city,
            p.state, p.views_count, p.published_at, p.type_id, p.location_id,
            c.name AS category_name, c.slug AS category_slug,
            t.name AS type_name, t.slug AS type_slug,
            l.name AS location_name, l.slug AS location_slug${sellerCols}
     FROM properties p
     JOIN property_categories c ON c.id = p.category_id
     JOIN property_types t ON t.id = p.type_id
     LEFT JOIN locations l ON l.id = p.location_id
     ${sellerJoin}
     WHERE ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  const total = Number(countRows[0].total);
  return {
    items: rows.map((r) => mapProperty(r)),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getPropertyBySlugOrId(slugOrId, { bumpViews = false, admin = false } = {}) {
  const isNumeric = /^\d+$/.test(String(slugOrId));
  const rows = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
            t.name AS type_name, t.slug AS type_slug,
            l.name AS location_name, l.slug AS location_slug
     FROM properties p
     JOIN property_categories c ON c.id = p.category_id
     JOIN property_types t ON t.id = p.type_id
     LEFT JOIN locations l ON l.id = p.location_id
     WHERE p.deleted_at IS NULL
       AND (${isNumeric ? 'p.id = :key OR p.property_code = :code' : 'p.slug = :key OR p.property_code = :key'})
       ${admin ? '' : "AND p.status = 'published'"}
     LIMIT 1`,
    isNumeric
      ? { key: Number(slugOrId), code: String(slugOrId) }
      : { key: String(slugOrId) }
  );
  if (!rows.length) throw new AppError('Property not found.', 404);

  const property = mapProperty(rows[0]);
  const images = await query(
    `SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order
     FROM property_images WHERE property_id = :id AND deleted_at IS NULL
     ORDER BY is_primary DESC, sort_order ASC`,
    { id: property.id }
  );
  const amenities = await query(
    `SELECT a.id, a.name, a.slug, a.icon, a.amenity_group
     FROM property_amenities pa
     JOIN amenities a ON a.id = pa.amenity_id AND a.deleted_at IS NULL
     WHERE pa.property_id = :id
     ORDER BY a.sort_order`,
    { id: property.id }
  );

  property.extra_attributes = parseExtras(property.extra_attributes);
  property.extra_details = await resolveExtraDetails(property.type_name, property.extra_attributes);
  property.amenity_ids = amenities.map((a) => a.id);

  if (!admin) delete property.extra_attributes;

  if (admin && property.seller_id) {
    const sellers = await query(
      'SELECT id, name, company_name, phone, email FROM sellers WHERE id = :id',
      { id: property.seller_id }
    ).catch(() => []);
    property.seller = sellers[0] || null;
  }

  if (bumpViews) {
    await query('UPDATE properties SET views_count = views_count + 1 WHERE id = :id', {
      id: property.id,
    });
    property.views_count += 1;
  }

  const related = await query(
    `SELECT id, title, slug, purpose, price, monthly_rent, price_display, main_image,
            bedrooms, bathrooms, carpet_area, locality, city, is_featured
     FROM properties
     WHERE deleted_at IS NULL AND status = 'published' AND id != :id
       AND (location_id = :location_id OR type_id = :type_id OR purpose = :purpose)
     ORDER BY is_featured DESC, published_at DESC
     LIMIT 4`,
    {
      id: property.id,
      location_id: property.location_id,
      type_id: property.type_id,
      purpose: property.purpose,
    }
  );

  return {
    ...property,
    images,
    amenities,
    related: related.map((r) => mapProperty(r)),
  };
}

function parseExtras(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function humanizeKey(key) {
  return String(key)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Turns stored extra_attributes into labelled rows using the type's field catalog,
 * so the public site can show "Additional details" grouped by section.
 */
async function resolveExtraDetails(typeName, extras) {
  const entries = Object.entries(extras || {}).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim() !== ''
  );
  if (!entries.length) return [];

  let defs = [];
  if (typeName) {
    defs = await query(
      `SELECT field_key, field_name, section, sort_order, field_type FROM property_field_definitions
       WHERE sub_category = :typeName AND is_active = 1`,
      { typeName }
    ).catch(() => []);
  }
  const byKey = new Map(defs.map((d) => [d.field_key, d]));

  return entries
    .map(([key, value]) => {
      const def = byKey.get(key);
      const type = def?.field_type || 'text';
      const text = Array.isArray(value) ? value.join(', ') : String(value);
      return {
        key,
        label: def?.field_name || humanizeKey(key),
        section: def?.section || 'Additional Details',
        type,
        // documents stay private: the public page only learns they exist
        value: type === 'upload' ? 'Available' : text,
        sort_order: def ? Number(def.sort_order) : 9999,
      };
    })
    .filter((d) => !(d.type === 'yesno' && d.value.trim().toLowerCase() === 'no'))
    .sort((a, b) => a.sort_order - b.sort_order);
}

function serializeExtras(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return JSON.stringify(typeof value === 'string' ? parseExtras(value) : value);
}

async function nextPropertyCode() {
  const rows = await query(
    `SELECT property_code FROM properties
     WHERE property_code REGEXP '^PROP-[0-9]+$'
     ORDER BY id DESC LIMIT 1`
  );
  let next = 1001;
  if (rows.length) {
    const n = Number(String(rows[0].property_code).replace('PROP-', ''));
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `PROP-${next}`;
}

async function createProperty(payload, adminId) {
  return withTransaction(async (conn) => {
    const code = payload.property_code || (await nextPropertyCode());
    let slug = payload.slug || toSlug(payload.title);
    const uuid = uuidv4();

    const existing = await conn.execute(
      'SELECT id FROM properties WHERE slug = ? AND deleted_at IS NULL',
      [slug]
    );
    if (existing[0].length) slug = `${slug}-${Date.now().toString(36)}`;

    const [result] = await conn.execute(
      `INSERT INTO properties (
        uuid, property_code, title, slug, purpose, category_id, type_id, location_id, seller_id,
        status, is_featured, short_description, description,
        price, price_display, price_negotiable, currency, maintenance_charges,
        security_deposit, monthly_rent, other_charges,
        bedrooms, bathrooms, balconies, carpet_area, builtup_area, plot_area, area_unit,
        floor_number, total_floors, property_age, facing, furnishing, parking, possession_status,
        address, locality, city, state, pincode, landmark, latitude, longitude, map_url,
        show_exact_location, extra_attributes,
        main_image, video_url, youtube_url, virtual_tour_url, seo_title, seo_description, seo_keywords,
        published_at, created_by, updated_by
      ) VALUES (
        ?,?,?,?,?,?,?,?,?,
        ?,?,?,?,
        ?,?,?,?,?,
        ?,?,?,
        ?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,
        ?,?,
        ?,?,?,?,?,?,?,
        ?,?,?
      )`,
      [
        uuid,
        code,
        payload.title,
        slug,
        payload.purpose,
        payload.category_id,
        payload.type_id,
        payload.location_id || null,
        payload.seller_id || null,
        payload.status || 'draft',
        payload.is_featured ? 1 : 0,
        payload.short_description || null,
        payload.description || null,
        payload.price ?? null,
        payload.price_display || null,
        payload.price_negotiable ? 1 : 0,
        payload.currency || 'INR',
        payload.maintenance_charges ?? null,
        payload.security_deposit ?? null,
        payload.monthly_rent ?? null,
        payload.other_charges ?? null,
        payload.bedrooms ?? null,
        payload.bathrooms ?? null,
        payload.balconies ?? null,
        payload.carpet_area ?? null,
        payload.builtup_area ?? null,
        payload.plot_area ?? null,
        payload.area_unit || 'sqft',
        payload.floor_number || null,
        payload.total_floors ?? null,
        payload.property_age || null,
        payload.facing || null,
        payload.furnishing || 'na',
        payload.parking || null,
        payload.possession_status || 'na',
        payload.address || null,
        payload.locality || null,
        payload.city || null,
        payload.state || 'Maharashtra',
        payload.pincode || null,
        payload.landmark || null,
        payload.latitude ?? null,
        payload.longitude ?? null,
        payload.map_url || null,
        payload.show_exact_location === undefined ? 1 : (payload.show_exact_location ? 1 : 0),
        serializeExtras(payload.extra_attributes) ?? null,
        payload.main_image || null,
        payload.video_url || null,
        payload.youtube_url || null,
        payload.virtual_tour_url || null,
        payload.seo_title || null,
        payload.seo_description || null,
        payload.seo_keywords || null,
        (payload.status || 'draft') === 'published' ? new Date() : null,
        adminId,
        adminId,
      ]
    );

    const propertyId = result.insertId;
    if (Array.isArray(payload.amenity_ids)) {
      for (const amenityId of payload.amenity_ids) {
        await conn.execute(
          'INSERT IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?, ?)',
          [propertyId, amenityId]
        );
      }
    }

    return propertyId;
  }).then(async (id) => {
    const extra = {};
    for (const k of ['brochure_url', 'floor_plan_url', 'rera_number', 'youtube_url', 'extra_attributes', 'show_exact_location', 'seller_id']) {
      if (payload[k] !== undefined) extra[k] = payload[k];
    }
    if (['brochure_url', 'floor_plan_url', 'rera_number'].some((k) => extra[k] !== undefined)) {
      await query(
        'UPDATE properties SET brochure_url = :brochure_url, floor_plan_url = :floor_plan_url, rera_number = :rera_number WHERE id = :id',
        {
          id,
          brochure_url: extra.brochure_url || null,
          floor_plan_url: extra.floor_plan_url || null,
          rera_number: extra.rera_number || null,
        }
      );
    }
    return getPropertyBySlugOrId(id, { admin: true });
  });
}

async function updateProperty(id, payload, adminId) {
  const existing = await query(
    'SELECT id, slug FROM properties WHERE id = :id AND deleted_at IS NULL',
    { id }
  );
  if (!existing.length) throw new AppError('Property not found.', 404);

  const fields = [];
  const params = { id, adminId };
  const allow = [
    'title', 'purpose', 'category_id', 'type_id', 'location_id', 'seller_id', 'status', 'is_featured',
    'short_description', 'description', 'price', 'price_display', 'price_negotiable',
    'currency', 'maintenance_charges', 'security_deposit', 'monthly_rent', 'other_charges',
    'bedrooms', 'bathrooms', 'balconies', 'carpet_area', 'builtup_area', 'plot_area',
    'area_unit', 'floor_number', 'total_floors', 'property_age', 'facing', 'furnishing',
    'parking', 'possession_status', 'address', 'locality', 'city', 'state', 'pincode',
    'landmark', 'latitude', 'longitude', 'map_url', 'show_exact_location', 'extra_attributes',
    'main_image', 'video_url', 'youtube_url', 'virtual_tour_url', 'seo_title', 'seo_description', 'seo_keywords',
    'brochure_url', 'floor_plan_url', 'rera_number',
  ];

  for (const key of allow) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = :${key}`);
      if (key === 'is_featured' || key === 'price_negotiable' || key === 'show_exact_location') {
        params[key] = payload[key] ? 1 : 0;
      } else if (key === 'extra_attributes') {
        params[key] = serializeExtras(payload[key]);
      } else {
        params[key] = payload[key];
      }
    }
  }

  if (payload.title && !payload.slug) {
    fields.push('slug = :slug');
    params.slug = toSlug(payload.title);
  } else if (payload.slug) {
    fields.push('slug = :slug');
    params.slug = toSlug(payload.slug);
  }

  if (payload.status === 'published') {
    fields.push('published_at = COALESCE(published_at, NOW())');
  }

  fields.push('updated_by = :adminId');
  if (!fields.length) throw new AppError('No fields to update', 400);

  await query(`UPDATE properties SET ${fields.join(', ')} WHERE id = :id`, params);

  if (Array.isArray(payload.amenity_ids)) {
    await query('DELETE FROM property_amenities WHERE property_id = :id', { id });
    for (const amenityId of payload.amenity_ids) {
      await query(
        'INSERT INTO property_amenities (property_id, amenity_id) VALUES (:id, :amenityId)',
        { id, amenityId }
      );
    }
  }

  return getPropertyBySlugOrId(id, { admin: true });
}

async function softDeleteProperty(id) {
  const result = await query(
    `UPDATE properties SET deleted_at = NOW(), status = 'inactive' WHERE id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (!result.affectedRows) throw new AppError('Property not found.', 404);
  return true;
}

async function addImages(propertyId, files, baseUrl) {
  const exists = await query(
    'SELECT id FROM properties WHERE id = :id AND deleted_at IS NULL',
    { id: propertyId }
  );
  if (!exists.length) throw new AppError('Property not found.', 404);

  const saved = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const url = `${baseUrl}/uploads/properties/${file.filename}`;
    const result = await query(
      `INSERT INTO property_images (property_id, image_url, alt_text, is_primary, sort_order)
       VALUES (:propertyId, :url, :alt, :isPrimary, :sort)`,
      {
        propertyId,
        url,
        alt: file.originalname,
        isPrimary: i === 0 ? 1 : 0,
        sort: i,
      }
    );
    if (i === 0) {
      await query('UPDATE properties SET main_image = :url WHERE id = :propertyId', {
        url,
        propertyId,
      });
    }
    saved.push({ id: result.insertId, image_url: url });
  }
  return saved;
}

async function listImages(propertyId) {
  return query(
    `SELECT id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order
     FROM property_images WHERE property_id = :id AND deleted_at IS NULL
     ORDER BY is_primary DESC, sort_order ASC`,
    { id: propertyId }
  );
}

async function setPrimaryImage(propertyId, imageId) {
  const rows = await query(
    'SELECT image_url FROM property_images WHERE id = :imageId AND property_id = :propertyId AND deleted_at IS NULL',
    { imageId, propertyId }
  );
  if (!rows.length) throw new AppError('Image not found.', 404);
  await query('UPDATE property_images SET is_primary = (id = :imageId) WHERE property_id = :propertyId', {
    imageId,
    propertyId,
  });
  await query('UPDATE properties SET main_image = :url WHERE id = :propertyId', {
    url: rows[0].image_url,
    propertyId,
  });
  return { images: await listImages(propertyId) };
}

async function deleteImage(propertyId, imageId) {
  const rows = await query(
    'SELECT is_primary FROM property_images WHERE id = :imageId AND property_id = :propertyId AND deleted_at IS NULL',
    { imageId, propertyId }
  );
  if (!rows.length) throw new AppError('Image not found.', 404);
  await query('UPDATE property_images SET deleted_at = NOW(), is_primary = 0 WHERE id = :imageId', { imageId });
  if (rows[0].is_primary) {
    const next = await listImages(propertyId);
    if (next.length) return setPrimaryImage(propertyId, next[0].id);
    await query('UPDATE properties SET main_image = NULL WHERE id = :propertyId', { propertyId });
  }
  return { images: await listImages(propertyId) };
}

async function getFeatured(limit = 6) {
  const { items } = await searchProperties({ featured: '1', limit, sort: 'featured' });
  return items;
}

async function getLatest(limit = 6) {
  const { items } = await searchProperties({ limit, sort: 'newest' });
  return items;
}

async function listPublishedForSitemap() {
  return query(
    `SELECT slug, updated_at, published_at
     FROM properties
     WHERE deleted_at IS NULL AND status = 'published' AND slug IS NOT NULL AND slug != ''
     ORDER BY COALESCE(updated_at, published_at, created_at) DESC`
  );
}

module.exports = {
  searchProperties,
  getPropertyBySlugOrId,
  createProperty,
  updateProperty,
  softDeleteProperty,
  addImages,
  listImages,
  setPrimaryImage,
  deleteImage,
  getFeatured,
  getLatest,
  listPublishedForSitemap,
  mapProperty,
};
