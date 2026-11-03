/**
 * Imports sql/property_catalog.json (categories, property types, type fields).
 * Safe to re-run: upserts only, never deletes listings.  Usage: npm run import:catalog
 * (Regenerate the JSON from the Excel workbook with sql/build_catalog.js — needs `npm i xlsx`.)
 */
const path = require('path');
const { query, pool } = require('./pool');
const { ensureSchema } = require('./ensureSchema');

async function importCatalog() {
  await ensureSchema();
  const catalog = require(path.join(__dirname, '../../sql/property_catalog.json'));

  for (const c of catalog.categories) {
    await query(
      `INSERT INTO property_categories (name, slug, icon, description, sort_order, is_active, deleted_at)
       VALUES (:name, :slug, :icon, :description, :sort, 1, NULL)
       ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), description=VALUES(description),
         sort_order=VALUES(sort_order), is_active=1, deleted_at=NULL`,
      { name: c.name, slug: c.slug, icon: c.icon || null, description: c.description || null, sort: c.sort_order }
    );
    const [{ id: categoryId }] = await query('SELECT id FROM property_categories WHERE slug = :slug LIMIT 1', { slug: c.slug });
    for (const t of c.types) {
      await query(
        `INSERT INTO property_types (category_id, name, slug, sort_order, is_active, deleted_at)
         VALUES (:categoryId, :name, :slug, :sort, 1, NULL)
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), name=VALUES(name),
           sort_order=VALUES(sort_order), is_active=1, deleted_at=NULL`,
        { categoryId, name: t.name, slug: t.slug, sort: t.sort_order }
      );
    }
  }

  for (const f of catalog.fields) {
    await query(
      `INSERT INTO property_field_definitions
         (main_category, sub_category, section, field_name, field_key, field_type, options, is_required, sort_order, is_active)
       VALUES (:main, :sub, :section, :name, :fkey, :ftype, :options, :required, :sort, 1)
       ON DUPLICATE KEY UPDATE main_category=VALUES(main_category), section=VALUES(section), field_name=VALUES(field_name),
         field_type=VALUES(field_type), options=VALUES(options), is_required=VALUES(is_required),
         sort_order=VALUES(sort_order), is_active=1`,
      {
        main: f.main_category,
        sub: f.sub_category,
        section: f.section || 'Details',
        name: f.field_name,
        fkey: f.field_key,
        ftype: f.field_type || 'text',
        options: f.options ? JSON.stringify(f.options) : null,
        required: f.required ? 1 : 0,
        sort: f.sort_order,
      }
    );
  }

  for (const o of catalog.master_options || []) {
    await query(
      'INSERT IGNORE INTO master_options (master_type, name, value, sort_order, is_active) VALUES (:t, :n, :v, :s, 1)',
      { t: o.master_type, n: o.name, v: o.value, s: o.sort_order }
    );
  }

  const types = catalog.categories.reduce((n, c) => n + c.types.length, 0);
  console.log(`Imported ${catalog.categories.length} categories, ${types} types, ${catalog.fields.length} fields.`);
}

if (require.main === module) {
  importCatalog()
    .catch((err) => {
      console.error('Catalog import failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { importCatalog };
