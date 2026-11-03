const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../db/pool');
const mailService = require('./mailService');
const { pagination } = require('../utils/helpers');
const { AppError } = require('../utils/response');

const ENQUIRY_STATUSES = ['new', 'in_progress', 'contacted', 'converted', 'closed', 'spam'];
const OPEN_STATUSES = ['new', 'in_progress', 'contacted'];
const LEAD_TYPES = ['normal', 'hot', 'warm', 'cold'];

const OPEN_SQL = `e.status IN (${OPEN_STATUSES.map((s) => `'${s}'`).join(',')})`;

/** Tab → SQL condition (all conditions use the `e` alias). */
const TAB_CONDITIONS = {
  today: 'DATE(e.created_at) = CURDATE()',
  pending: OPEN_SQL,
  followup: `e.follow_up_date IS NOT NULL AND e.follow_up_date <= CURDATE() AND ${OPEN_SQL}`,
  converted: "e.status = 'converted'",
  closed: "e.status = 'closed'",
};

const BASE_FROM = `
  FROM enquiries e
  LEFT JOIN properties p ON p.id = e.property_id
  LEFT JOIN property_types t ON t.id = COALESCE(e.property_type_id, p.type_id)`;

function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

async function findProperty(payload) {
  if (!payload.property_id && !payload.property_slug && !payload.property_code) return null;
  const rows = await query(
    `SELECT id, property_code, title, type_id FROM properties
     WHERE deleted_at IS NULL AND (
       id = :id OR slug = :slug OR property_code = :code
     ) LIMIT 1`,
    {
      id: payload.property_id || 0,
      slug: payload.property_slug || '',
      code: payload.property_code || '',
    }
  );
  return rows[0] || null;
}

async function createEnquiry(payload, meta = {}) {
  const property = await findProperty(payload);
  const status = ENQUIRY_STATUSES.includes(payload.status) ? payload.status : 'new';
  const leadType = LEAD_TYPES.includes(payload.lead_type) ? payload.lead_type : 'normal';
  const isWebsite = !meta.adminId;
  const mailCfg = isWebsite ? await mailService.getConfig() : null;

  // Inquiry + its email log rows are committed together; delivery runs after commit.
  const { id, emailIds } = await withTransaction(async (conn) => {
    const exec = (sql, params) => conn.execute(sql, params);
    const [result] = await exec(
      `INSERT INTO enquiries (
        uuid, enquiry_type, property_id, property_code, property_title, property_type_id,
        name, mobile, email, city, preferred_contact, message, status, lead_type,
        follow_up_date, source, created_by,
        ip_address, user_agent, source_page, utm_source, utm_medium, utm_campaign
      ) VALUES (
        :uuid, :enquiry_type, :property_id, :property_code, :property_title, :property_type_id,
        :name, :mobile, :email, :city, :preferred_contact, :message, :status, :lead_type,
        :follow_up_date, :source, :created_by,
        :ip, :ua, :source_page, :utm_source, :utm_medium, :utm_campaign
      )`,
      {
        uuid: uuidv4(),
        enquiry_type: payload.enquiry_type || (property ? 'property' : 'contact'),
        property_id: property?.id || null,
        property_code: property?.property_code || null,
        property_title: property?.title || payload.property_title || null,
        property_type_id: property?.type_id || payload.property_type_id || null,
        name: payload.name,
        mobile: payload.mobile,
        email: payload.email || null,
        city: payload.city || null,
        preferred_contact: payload.preferred_contact || 'any',
        message: payload.message || null,
        status,
        lead_type: leadType,
        follow_up_date: normalizeDate(payload.follow_up_date),
        source: meta.source || 'website',
        created_by: meta.adminId || null,
        ip: meta.ip || null,
        ua: meta.userAgent || null,
        source_page: meta.sourcePage || null,
        utm_source: payload.utm_source || null,
        utm_medium: payload.utm_medium || null,
        utm_campaign: payload.utm_campaign || null,
      }
    );
    if (property?.id) {
      await exec('UPDATE properties SET enquiries_count = enquiries_count + 1 WHERE id = :id', { id: property.id });
    }
    const ids = isWebsite
      ? await mailService.queueEnquiryEmails(exec, mailCfg, result.insertId, payload, property)
      : [];
    return { id: result.insertId, emailIds: ids };
  });

  for (const logId of emailIds) {
    mailService.deliverLog(logId, mailCfg).catch((err) => console.error('Inquiry email failed:', err.message));
  }

  return { id, message: 'Enquiry submitted successfully.' };
}

function buildFilters(filters) {
  const where = ['e.deleted_at IS NULL'];
  const params = {};

  if (filters.status) {
    where.push('e.status = :status');
    params.status = filters.status;
  }
  if (filters.enquiry_type) {
    where.push('e.enquiry_type = :enquiry_type');
    params.enquiry_type = filters.enquiry_type;
  }
  if (filters.lead_type) {
    where.push('e.lead_type = :lead_type');
    params.lead_type = filters.lead_type;
  }
  if (filters.type_id) {
    where.push('COALESCE(e.property_type_id, p.type_id) = :type_id');
    params.type_id = Number(filters.type_id);
  }
  if (filters.property_id) {
    where.push('e.property_id = :property_id');
    params.property_id = Number(filters.property_id);
  }
  const from = normalizeDate(filters.date_from);
  if (from) {
    where.push('DATE(e.created_at) >= :date_from');
    params.date_from = from;
  }
  const to = normalizeDate(filters.date_to);
  if (to) {
    where.push('DATE(e.created_at) <= :date_to');
    params.date_to = to;
  }
  if (filters.q) {
    where.push(`(
      e.name LIKE :q OR e.mobile LIKE :q OR e.email LIKE :q OR e.city LIKE :q
      OR e.property_title LIKE :q OR e.property_code LIKE :q
      OR p.title LIKE :q OR t.name LIKE :q
      OR CONCAT('INQ', LPAD(e.id, 6, '0')) LIKE :q
    )`);
    params.q = `%${String(filters.q).trim()}%`;
  }
  return { where, params };
}

async function listEnquiries(filters = {}) {
  const { page, limit, offset } = pagination(filters, { page: 1, limit: 20 });
  const { where, params } = buildFilters(filters);

  // Tab counts respect search/type filters but not the tab itself
  const baseWhere = where.join(' AND ');
  const countsRows = await query(
    `SELECT COUNT(*) AS \`all\`,
       COALESCE(SUM(${TAB_CONDITIONS.today}), 0) AS today,
       COALESCE(SUM(${TAB_CONDITIONS.pending}), 0) AS pending,
       COALESCE(SUM(${TAB_CONDITIONS.followup}), 0) AS followup,
       COALESCE(SUM(${TAB_CONDITIONS.converted}), 0) AS converted,
       COALESCE(SUM(${TAB_CONDITIONS.closed}), 0) AS closed
     ${BASE_FROM}
     WHERE ${baseWhere}`,
    params
  );
  const counts = Object.fromEntries(
    Object.entries(countsRows[0] || {}).map(([k, v]) => [k, Number(v) || 0])
  );

  if (filters.tab && TAB_CONDITIONS[filters.tab]) where.push(TAB_CONDITIONS[filters.tab]);
  const whereSql = where.join(' AND ');

  const countRows = await query(`SELECT COUNT(*) AS total ${BASE_FROM} WHERE ${whereSql}`, params);
  const rows = await query(
    `SELECT e.*,
            DATE_FORMAT(e.follow_up_date, '%Y-%m-%d') AS follow_up_date,
            COALESCE(p.title, e.property_title) AS property_name,
            p.slug AS property_slug,
            t.id AS type_id, t.name AS type_name,
            (SELECT COUNT(*) FROM enquiry_followups f WHERE f.enquiry_id = e.id) AS followups_count
     ${BASE_FROM}
     WHERE ${whereSql}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  const total = Number(countRows[0].total);
  return {
    items: rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      counts,
    },
  };
}

async function listFollowUps(enquiryId) {
  return query(
    `SELECT f.*, DATE_FORMAT(f.next_follow_up_date, '%Y-%m-%d') AS next_follow_up_date,
            a.name AS admin_name, a.role AS admin_role
     FROM enquiry_followups f
     LEFT JOIN admin_users a ON a.id = f.created_by
     WHERE f.enquiry_id = :id
     ORDER BY f.created_at DESC, f.id DESC`,
    { id: enquiryId }
  );
}

async function getEnquiry(id) {
  const rows = await query(
    `SELECT e.*,
            DATE_FORMAT(e.follow_up_date, '%Y-%m-%d') AS follow_up_date,
            COALESCE(p.title, e.property_title) AS property_name,
            p.slug AS property_slug,
            t.id AS type_id, t.name AS type_name
     ${BASE_FROM}
     WHERE e.id = :id AND e.deleted_at IS NULL
     LIMIT 1`,
    { id }
  );
  if (!rows.length) throw new AppError('Enquiry not found', 404);
  const emailLogs = await query(
    'SELECT id, email_type, recipient, status, error, attempts, created_at, sent_at FROM email_logs WHERE enquiry_id = :id ORDER BY id',
    { id }
  ).catch(() => []);
  return { ...rows[0], followups: await listFollowUps(id), email_logs: emailLogs };
}

async function updateEnquiry(id, payload) {
  const fields = [];
  const params = { id };

  if (payload.status !== undefined && !ENQUIRY_STATUSES.includes(payload.status)) {
    throw new AppError(`Invalid status. Allowed: ${ENQUIRY_STATUSES.join(', ')}`, 400);
  }
  if (payload.lead_type !== undefined && !LEAD_TYPES.includes(payload.lead_type)) {
    throw new AppError(`Invalid lead type. Allowed: ${LEAD_TYPES.join(', ')}`, 400);
  }

  const editable = [
    'status', 'admin_notes', 'assigned_to', 'preferred_contact',
    'name', 'mobile', 'email', 'city', 'message', 'lead_type',
  ];
  for (const key of editable) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = :${key}`);
      params[key] = payload[key] === '' && key !== 'name' && key !== 'mobile' ? null : payload[key];
    }
  }
  if (payload.follow_up_date !== undefined) {
    fields.push('follow_up_date = :follow_up_date');
    params.follow_up_date = normalizeDate(payload.follow_up_date);
  }
  if (payload.property_id !== undefined) {
    const property = payload.property_id ? await findProperty({ property_id: payload.property_id }) : null;
    fields.push(
      'property_id = :property_id',
      'property_code = :property_code',
      'property_title = :property_title',
      "enquiry_type = IF(:property_id IS NULL, enquiry_type, 'property')"
    );
    params.property_id = property?.id || null;
    params.property_code = property?.property_code || null;
    params.property_title = property?.title || null;
    if (payload.property_type_id === undefined && property) {
      fields.push('property_type_id = :property_type_id');
      params.property_type_id = property.type_id;
    }
  }
  if (payload.property_type_id !== undefined) {
    fields.push('property_type_id = :property_type_id');
    params.property_type_id = payload.property_type_id ? Number(payload.property_type_id) : null;
  }
  if (payload.status && ['contacted', 'converted', 'closed'].includes(payload.status)) {
    fields.push('responded_at = COALESCE(responded_at, NOW())');
  }
  if (!fields.length) throw new AppError('No fields to update', 400);

  const result = await query(
    `UPDATE enquiries SET ${fields.join(', ')} WHERE id = :id AND deleted_at IS NULL`,
    params
  );
  if (!result.affectedRows) throw new AppError('Enquiry not found', 404);
  const rows = await query('SELECT * FROM enquiries WHERE id = :id', { id });
  return rows[0];
}

async function addFollowUp(enquiryId, payload, adminId) {
  const comment = String(payload.comment || '').trim();
  if (!comment) throw new AppError('Comment is required', 422);

  const rows = await query(
    'SELECT id, status FROM enquiries WHERE id = :id AND deleted_at IS NULL',
    { id: enquiryId }
  );
  if (!rows.length) throw new AppError('Enquiry not found', 404);
  const previous = rows[0].status;

  const status = payload.status || previous;
  if (!ENQUIRY_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Allowed: ${ENQUIRY_STATUSES.join(', ')}`, 400);
  }
  const nextDate = normalizeDate(payload.next_follow_up_date);

  await query(
    `INSERT INTO enquiry_followups
      (enquiry_id, comment, client_feedback, contact_mode, previous_status, status, next_follow_up_date, created_by)
     VALUES (:enquiryId, :comment, :feedback, :mode, :previous, :status, :nextDate, :adminId)`,
    {
      enquiryId,
      comment,
      feedback: String(payload.client_feedback || '').trim() || null,
      mode: payload.contact_mode || null,
      previous,
      status,
      nextDate,
      adminId: adminId || null,
    }
  );

  await query(
    `UPDATE enquiries
     SET status = :status, follow_up_date = :nextDate,
         responded_at = COALESCE(responded_at, NOW())
     WHERE id = :id`,
    { status, nextDate, id: enquiryId }
  );

  return getEnquiry(enquiryId);
}

async function softDeleteEnquiry(id) {
  const result = await query(
    'UPDATE enquiries SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL',
    { id }
  );
  if (!result.affectedRows) throw new AppError('Enquiry not found', 404);
  return true;
}

module.exports = {
  ENQUIRY_STATUSES,
  LEAD_TYPES,
  createEnquiry,
  listEnquiries,
  getEnquiry,
  updateEnquiry,
  addFollowUp,
  listFollowUps,
  softDeleteEnquiry,
};
