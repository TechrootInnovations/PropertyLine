const { query } = require('../db/pool');

const num = (row) =>
  Object.fromEntries(Object.entries(row || {}).map(([k, v]) => [k, Number(v) || 0]));

async function getDashboardStats() {
  const propsRows = await query(`SELECT
      COUNT(*) AS total_properties,
      SUM(status = 'published') AS active_properties,
      SUM(purpose = 'sale' AND status = 'published') AS sale_properties,
      SUM(purpose = 'rent' AND status = 'published') AS rent_properties,
      SUM(is_featured = 1 AND status = 'published') AS featured_properties,
      SUM(status = 'draft') AS draft_properties,
      SUM(status = 'sold') AS sold_properties,
      SUM(status = 'rented') AS rented_properties
     FROM properties WHERE deleted_at IS NULL`);
  const props = num(propsRows[0]);

  const enqRows = await query(`SELECT
      COUNT(*) AS total_enquiries,
      SUM(status = 'new') AS new_enquiries,
      SUM(status = 'in_progress') AS in_progress_enquiries,
      SUM(status IN ('new','in_progress','contacted')) AS pending_enquiries,
      SUM(status = 'converted') AS converted_enquiries,
      SUM(status = 'closed') AS closed_enquiries,
      SUM(DATE(created_at) = CURDATE()) AS today_enquiries,
      SUM(follow_up_date IS NOT NULL AND follow_up_date <= CURDATE()
          AND status IN ('new','in_progress','contacted')) AS followups_due,
      SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS enquiries_last_7_days
     FROM enquiries WHERE deleted_at IS NULL`);
  const enq = num(enqRows[0]);

  // Property counts per type (every active type shows, even with zero listings)
  const byType = (
    await query(`SELECT t.id, t.name, t.slug, t.icon, c.name AS category_name,
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
       ORDER BY t.sort_order, t.name`)
  ).map((r) => ({
    ...r,
    total: Number(r.total) || 0,
    published: Number(r.published) || 0,
    draft: Number(r.draft) || 0,
    sale: Number(r.sale) || 0,
    rent: Number(r.rent) || 0,
  }));

  const recentEnquiries = await query(
    `SELECT id, name, mobile, property_title, property_code, status,
            DATE_FORMAT(follow_up_date, '%Y-%m-%d') AS follow_up_date, created_at
     FROM enquiries WHERE deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 8`
  );

  const upcomingFollowUps = await query(
    `SELECT id, name, mobile, property_title, status,
            DATE_FORMAT(follow_up_date, '%Y-%m-%d') AS follow_up_date
     FROM enquiries
     WHERE deleted_at IS NULL AND follow_up_date IS NOT NULL
       AND status IN ('new','in_progress','contacted')
     ORDER BY follow_up_date ASC LIMIT 6`
  );

  const recentProperties = await query(
    `SELECT id, title, slug, purpose, status, price, monthly_rent, main_image, created_at
     FROM properties WHERE deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 6`
  );

  return {
    properties: props,
    enquiries: enq,
    byType,
    recentEnquiries,
    upcomingFollowUps,
    recentProperties,
  };
}

module.exports = { getDashboardStats };
