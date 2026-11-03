/**
 * Email notifications — configurable SMTP with an email transaction log (email_logs).
 * Mirrors crm_routes.php (production PHP API). Requires `npm i nodemailer` to actually send.
 */
const crypto = require('crypto');
const { query } = require('../db/pool');
const config = require('../config');
const { AppError } = require('../utils/response');
const { pagination } = require('../utils/helpers');

const MAIL_KEYS = [
  'mail_enabled', 'mail_transport', 'smtp_host', 'smtp_port', 'smtp_encryption', 'smtp_username',
  'smtp_password', 'mail_from_email', 'mail_from_name', 'notify_email', 'send_customer_ack',
];
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

function key() {
  return crypto.createHash('sha256').update(`${config.jwt.secret}|mail-settings`).digest();
}

function encrypt(plain) {
  if (!plain) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key(), iv);
  return `enc:${Buffer.concat([iv, cipher.update(plain, 'utf8'), cipher.final()]).toString('base64')}`;
}

function decrypt(stored) {
  if (!String(stored || '').startsWith('enc:')) return stored || '';
  try {
    const raw = Buffer.from(stored.slice(4), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key(), raw.subarray(0, 16));
    return Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

async function settingsMap(keys) {
  const rows = await query(
    `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${keys.map((_, i) => `:k${i}`).join(',')})`,
    Object.fromEntries(keys.map((k, i) => [`k${i}`, k]))
  );
  return Object.fromEntries(rows.map((r) => [r.setting_key, String(r.setting_value ?? '')]));
}

async function getConfig() {
  const v = await settingsMap([...MAIL_KEYS, 'email', 'site_name', 'site_url', 'phone']);
  const siteUrl = String(v.site_url || config.frontendUrl || 'https://terranexusproperties.com').replace(/\/$/, '');
  let domain = 'terranexusproperties.com';
  try { domain = new URL(siteUrl).hostname.replace(/^www\./, ''); } catch { /* keep default */ }
  const host = (v.smtp_host || '').trim();
  const transport = (v.mail_transport || (host ? 'smtp' : 'phpmail')) === 'smtp' && host ? 'smtp' : 'phpmail';
  return {
    enabled: v.mail_enabled !== 'false',
    transport,
    smtp_host: host,
    smtp_port: Number(v.smtp_port) || 465,
    smtp_encryption: ['ssl', 'tls', 'none'].includes(v.smtp_encryption) ? v.smtp_encryption : 'ssl',
    smtp_username: (v.smtp_username || '').trim(),
    smtp_password: decrypt(v.smtp_password || ''),
    has_password: !!v.smtp_password,
    from_email: (v.mail_from_email || v.smtp_username || `noreply@${domain}`).trim(),
    from_name: (v.mail_from_name || v.site_name || 'Terranexus Properties').trim(),
    recipients: String(v.notify_email || v.email || '').split(/[,;\s]+/).filter(isEmail),
    customer_ack: v.send_customer_ack === 'true',
    site_name: v.site_name || 'Terranexus Properties',
    site_url: siteUrl,
    phone: v.phone || '',
    raw: v,
  };
}

async function sendRaw(cfg, to, subject, html, replyTo) {
  let nodemailer;
  try { nodemailer = require('nodemailer'); } catch {
    throw new Error('nodemailer is not installed on this server (npm i nodemailer)');
  }
  const transport = cfg.transport === 'smtp'
    ? nodemailer.createTransport({
      host: cfg.smtp_host,
      port: cfg.smtp_port,
      secure: cfg.smtp_encryption === 'ssl',
      requireTLS: cfg.smtp_encryption === 'tls',
      auth: cfg.smtp_username ? { user: cfg.smtp_username, pass: cfg.smtp_password } : undefined,
    })
    : nodemailer.createTransport({ sendmail: true });
  await transport.sendMail({
    from: `"${cfg.from_name}" <${cfg.from_email}>`,
    to: to.join(', '),
    replyTo: replyTo || undefined,
    subject,
    html,
  });
}

async function queueEmail(exec, { enquiryId = null, type, to, subject, html, replyTo = null, status = 'queued', error = null }) {
  const [res] = await exec(
    'INSERT INTO email_logs (enquiry_id, email_type, recipient, subject, body, reply_to, status, error) VALUES (?,?,?,?,?,?,?,?)',
    [enquiryId, type, (to.join(', ') || '-').slice(0, 500), subject.slice(0, 300), html, replyTo, status, error]
  );
  return res.insertId;
}

async function deliverLog(id, cfgIn) {
  const [log] = await query('SELECT * FROM email_logs WHERE id = :id', { id });
  if (!log) throw new AppError('Email log not found', 404);
  const cfg = cfgIn || (await getConfig());
  const to = String(log.recipient).split(',').map((s) => s.trim()).filter(isEmail);
  let error = null;
  try {
    if (!to.length) throw new Error('No valid recipient email address');
    await sendRaw(cfg, to, log.subject, log.body, log.reply_to);
  } catch (err) {
    error = err.message;
  }
  await query(
    `UPDATE email_logs SET status = :status, transport = :transport, error = :error, attempts = attempts + 1,
       sent_at = IF(:status = 'sent', NOW(), sent_at) WHERE id = :id`,
    { status: error ? 'failed' : 'sent', transport: cfg.transport, error, id }
  );
  return { status: error ? 'failed' : 'sent', error, transport: cfg.transport };
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shell(siteName, eyebrow, title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif"><div style="max-width:580px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6eaef"><div style="background:#1f5c52;color:#fff;padding:20px 24px"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e8d5b0">${esc(eyebrow)}</div><div style="font-size:20px;font-weight:bold;margin-top:4px">${esc(title)}</div></div>${inner}<div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px">${esc(siteName)}</div></div></body></html>`;
}

function ownerHtml(cfg, e, property, enquiryId) {
  const rows = [
    ['Inquiry ID', `INQ${String(enquiryId).padStart(6, '0')}`], ['Name', e.name], ['Mobile', e.mobile], ['Email', e.email],
    ['Property', property ? `${property.title} (${property.property_code})` : 'General inquiry'], ['Message', e.message],
  ].filter(([, v]) => v);
  const tr = rows.map(([k, v]) => `<tr><td style="padding:9px 24px;color:#64748b;font-size:13px;width:130px">${esc(k)}</td><td style="padding:9px 24px 9px 0;font-size:14px">${esc(v)}</td></tr>`).join('');
  return shell(cfg.site_name, 'New website inquiry', e.name, `<table style="width:100%;border-collapse:collapse;margin:12px 0">${tr}</table><div style="padding:8px 24px 24px"><a href="${esc(`${cfg.site_url}/admin/enquiries`)}" style="display:inline-block;background:#1f5c52;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px">Open in admin</a></div>`);
}

function customerHtml(cfg, e, property) {
  return shell(cfg.site_name, 'Inquiry received', `Thank you, ${e.name}`, `<div style="padding:22px 24px;color:#334155;font-size:15px;line-height:1.6"><p>Dear ${esc(e.name)},</p><p>Thank you for contacting ${esc(cfg.site_name)}. We have received your inquiry${property ? ` about <strong>${esc(property.title)}</strong>` : ''} and a consultant will get in touch shortly.</p>${cfg.phone ? `<p>For anything urgent, call us on <strong>${esc(cfg.phone)}</strong>.</p>` : ''}<p>Warm regards,<br>${esc(cfg.site_name)}</p></div>`);
}

/** Queues owner alert (+ optional customer acknowledgement) using the caller's transaction executor. */
async function queueEnquiryEmails(exec, cfg, enquiryId, e, property) {
  const subject = `New inquiry: ${e.name}${property ? ` - ${property.title}` : ''}`;
  const replyTo = isEmail(e.email) ? e.email : null;
  const html = ownerHtml(cfg, e, property, enquiryId);
  const ids = [];
  if (!cfg.enabled) {
    await queueEmail(exec, { enquiryId, type: 'owner_alert', to: cfg.recipients, subject, html, replyTo, status: 'skipped', error: 'Email notifications are turned off' });
  } else if (!cfg.recipients.length) {
    await queueEmail(exec, { enquiryId, type: 'owner_alert', to: [], subject, html, replyTo, status: 'failed', error: 'No notification email configured' });
  } else {
    ids.push(await queueEmail(exec, { enquiryId, type: 'owner_alert', to: cfg.recipients, subject, html, replyTo }));
  }
  if (cfg.enabled && cfg.customer_ack && replyTo) {
    ids.push(await queueEmail(exec, {
      enquiryId, type: 'customer_ack', to: [e.email], subject: `We received your inquiry - ${cfg.site_name}`,
      html: customerHtml(cfg, e, property), replyTo: cfg.recipients[0] || null,
    }));
  }
  return ids;
}

async function getSettings() {
  const cfg = await getConfig();
  const [stats] = await query(`SELECT COUNT(*) AS total, COALESCE(SUM(status='sent'),0) AS sent, COALESCE(SUM(status='failed'),0) AS failed,
    COALESCE(SUM(status='queued'),0) AS queued, COALESCE(SUM(status='skipped'),0) AS skipped FROM email_logs`);
  return {
    mail_enabled: cfg.enabled,
    mail_transport: cfg.raw.mail_transport || (cfg.smtp_host ? 'smtp' : 'phpmail'),
    smtp_host: cfg.smtp_host,
    smtp_port: cfg.smtp_port,
    smtp_encryption: cfg.smtp_encryption,
    smtp_username: cfg.smtp_username,
    has_password: cfg.has_password,
    mail_from_email: cfg.raw.mail_from_email || '',
    mail_from_name: cfg.raw.mail_from_name || '',
    notify_email: cfg.raw.notify_email || '',
    send_customer_ack: cfg.customer_ack,
    effective: { transport: cfg.transport, from: `${cfg.from_name} <${cfg.from_email}>`, recipients: cfg.recipients },
    stats: Object.fromEntries(Object.entries(stats || {}).map(([k, v]) => [k, Number(v) || 0])),
  };
}

async function saveSettings(b) {
  const values = {
    mail_enabled: b.mail_enabled ? 'true' : 'false',
    mail_transport: b.mail_transport === 'smtp' ? 'smtp' : 'phpmail',
    smtp_host: String(b.smtp_host || '').trim(),
    smtp_port: String(Math.max(1, Math.min(65535, Number(b.smtp_port) || 465))),
    smtp_encryption: ['ssl', 'tls', 'none'].includes(b.smtp_encryption) ? b.smtp_encryption : 'ssl',
    smtp_username: String(b.smtp_username || '').trim(),
    mail_from_email: String(b.mail_from_email || '').trim(),
    mail_from_name: String(b.mail_from_name || '').trim(),
    notify_email: String(b.notify_email || '').trim(),
    send_customer_ack: b.send_customer_ack ? 'true' : 'false',
  };
  const bad = values.notify_email.split(/[,;\s]+/).find((a) => a && !isEmail(a));
  if (bad) throw new AppError(`Invalid notification email: ${bad}`, 422);
  if (values.mail_from_email && !isEmail(values.mail_from_email)) throw new AppError('Invalid "from" email address', 422);
  if (values.mail_transport === 'smtp' && !values.smtp_host) throw new AppError('SMTP host is required when SMTP is selected', 422);
  if (b.clear_password) values.smtp_password = '';
  else if (b.smtp_password) values.smtp_password = encrypt(String(b.smtp_password));
  for (const [k, v] of Object.entries(values)) {
    await query(
      `INSERT INTO site_settings (setting_group, setting_key, setting_value, value_type, is_public)
       VALUES (:g, :k, :v, 'string', 0)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_group = VALUES(setting_group), is_public = 0`,
      { g: k === 'notify_email' ? 'contact' : 'mail', k, v }
    );
  }
  return { saved: true };
}

async function sendTest(toIn) {
  const cfg = await getConfig();
  const to = String(toIn || cfg.recipients[0] || '').trim();
  if (!isEmail(to)) throw new AppError('Enter a valid email address to send the test to', 422);
  const html = shell(cfg.site_name, 'Test email', 'Email delivery is working', `<div style="padding:22px 24px;color:#334155">This is a test from your website admin. Sent via ${esc(cfg.transport.toUpperCase())}.</div>`);
  const exec = async (sql, params) => [await query(sql, params)];
  const logId = await queueEmail(exec, { type: 'test', to: [to], subject: `Test email - ${cfg.site_name}`, html });
  return { ...(await deliverLog(logId, cfg)), log_id: logId, to };
}

async function listLogs(filters = {}) {
  const { page, limit, offset } = pagination(filters, { page: 1, limit: 20 });
  const where = ['1=1'];
  const params = {};
  if (filters.status) { where.push('l.status = :status'); params.status = filters.status; }
  if (filters.email_type) { where.push('l.email_type = :type'); params.type = filters.email_type; }
  if (filters.q) { where.push('(l.recipient LIKE :q OR l.subject LIKE :q OR e.name LIKE :q)'); params.q = `%${filters.q}%`; }
  const from = `FROM email_logs l LEFT JOIN enquiries e ON e.id = l.enquiry_id WHERE ${where.join(' AND ')}`;
  const [{ total }] = await query(`SELECT COUNT(*) AS total ${from}`, params);
  const rows = await query(
    `SELECT l.id, l.enquiry_id, l.email_type, l.recipient, l.subject, l.status, l.transport, l.error, l.attempts,
            l.created_at, l.sent_at, e.name AS enquiry_name ${from} ORDER BY l.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return { items: rows, meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) || 1 } };
}

async function getLog(id) {
  const [row] = await query('SELECT l.*, e.name AS enquiry_name FROM email_logs l LEFT JOIN enquiries e ON e.id = l.enquiry_id WHERE l.id = :id', { id });
  if (!row) throw new AppError('Email log not found', 404);
  return row;
}

module.exports = {
  getConfig, queueEnquiryEmails, deliverLog, getSettings, saveSettings, sendTest, listLogs, getLog,
};
