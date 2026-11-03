const { query } = require('../db/pool');
const { AppError } = require('../utils/response');

async function getPublicSettings() {
  const rows = await query(
    `SELECT setting_group, setting_key, setting_value, value_type
     FROM site_settings WHERE is_public = 1`
  );
  return hydrate(rows);
}

async function getAllSettings() {
  const rows = await query(
    `SELECT id, setting_group, setting_key, setting_value, value_type, is_public, updated_at
     FROM site_settings ORDER BY setting_group, setting_key`
  );
  return rows;
}

async function upsertSettings(entries) {
  for (const e of entries) {
    await query(
      `INSERT INTO site_settings (setting_group, setting_key, setting_value, value_type, is_public)
       VALUES (:group, :key, :value, :type, :isPublic)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value),
         value_type = VALUES(value_type), setting_group = VALUES(setting_group)`,
      {
        group: e.setting_group || 'general',
        key: e.setting_key,
        value: e.setting_value == null ? '' : String(e.setting_value),
        type: e.value_type || 'string',
        isPublic: e.is_public == null ? 1 : e.is_public ? 1 : 0,
      }
    );
  }
  return getPublicSettings();
}

function hydrate(rows) {
  const out = {};
  for (const row of rows) {
    if (!out[row.setting_group]) out[row.setting_group] = {};
    let value = row.setting_value;
    if (row.value_type === 'number') value = Number(value);
    if (row.value_type === 'boolean') value = value === 'true' || value === '1';
    if (row.value_type === 'json') {
      try {
        value = JSON.parse(value);
      } catch {
        /* keep string */
      }
    }
    out[row.setting_group][row.setting_key] = value;
  }
  return out;
}

async function getContentBlocks() {
  return query(
    `SELECT block_key, title, subtitle, body, image_url, cta_label, cta_url, extra_json, sort_order
     FROM content_blocks WHERE is_active = 1 ORDER BY sort_order ASC`
  );
}

async function getTestimonials() {
  return query(
    `SELECT id, name, role, avatar_url, rating, message
     FROM testimonials WHERE is_active = 1 AND deleted_at IS NULL
     ORDER BY sort_order ASC`
  );
}

async function updateContentBlock(blockKey, payload) {
  const result = await query(
    `UPDATE content_blocks SET
      title = COALESCE(:title, title),
      subtitle = COALESCE(:subtitle, subtitle),
      body = COALESCE(:body, body),
      image_url = COALESCE(:image_url, image_url),
      cta_label = COALESCE(:cta_label, cta_label),
      cta_url = COALESCE(:cta_url, cta_url),
      is_active = COALESCE(:is_active, is_active)
     WHERE block_key = :blockKey`,
    { ...payload, blockKey }
  );
  if (!result.affectedRows) throw new AppError('Content block not found', 404);
  return true;
}

async function listAllTestimonials() {
  return query(
    `SELECT id, name, role, avatar_url, rating, message, sort_order, is_active
     FROM testimonials WHERE deleted_at IS NULL
     ORDER BY sort_order ASC, id DESC`
  );
}

async function createTestimonial(body) {
  const result = await query(
    `INSERT INTO testimonials (name, role, rating, message, sort_order, is_active)
     VALUES (:name, :role, :rating, :message, :sort_order, 1)`,
    {
      name: body.name,
      role: body.role || null,
      rating: Number(body.rating) || 5,
      message: body.message,
      sort_order: Number(body.sort_order) || 0,
    }
  );
  const rows = await query(`SELECT * FROM testimonials WHERE id = :id`, { id: result.insertId });
  return rows[0];
}

async function deleteTestimonial(id) {
  await query(`UPDATE testimonials SET deleted_at = NOW() WHERE id = :id`, { id });
  return true;
}

module.exports = {
  getPublicSettings,
  getAllSettings,
  upsertSettings,
  getContentBlocks,
  getTestimonials,
  updateContentBlock,
  listAllTestimonials,
  createTestimonial,
  deleteTestimonial,
};
