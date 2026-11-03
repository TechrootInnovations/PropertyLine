import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2, CircleSlash, Eye, Inbox, KeyRound, MailCheck, RotateCw, Save, Send, Server, ShieldCheck, XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  Badge, Button, Card, DataTable, EmptyState, Field, FilterTabs, IconAction, Modal, PageHeader, Pagination,
  SearchInput, StatCard, useToast,
} from '../ui';
import { formatDateTime } from '../format';

const PRESETS = [
  { key: 'hostinger', label: 'Hostinger Email', host: 'smtp.hostinger.com', port: 465, encryption: 'ssl', note: 'Create a mailbox (e.g. noreply@yourdomain.com) in hPanel → Emails, then use that address and its password here.' },
  { key: 'gmail', label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, encryption: 'tls', note: 'Turn on 2-Step Verification, then create an App Password (Google Account → Security → App passwords) and paste it as the password.' },
  { key: 'outlook', label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, encryption: 'tls', note: 'Use your full Microsoft 365 email and password (SMTP AUTH must be enabled for the mailbox).' },
  { key: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.in', port: 465, encryption: 'ssl', note: 'Use your Zoho email and an app-specific password if 2FA is on.' },
  { key: 'custom', label: 'Other provider', host: '', port: 587, encryption: 'tls', note: 'Enter the SMTP details from your email provider.' },
];

const TYPE_LABELS = {
  owner_alert: { label: 'Inquiry alert', tone: 'blue' },
  customer_ack: { label: 'Customer confirmation', tone: 'purple' },
  test: { label: 'Test', tone: 'gray' },
};
const STATUS_TONES = { sent: 'green', failed: 'red', queued: 'amber', skipped: 'gray' };
const LOG_TABS = [
  { key: '', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'failed', label: 'Failed' },
  { key: 'skipped', label: 'Skipped' },
];

const blank = {
  mail_enabled: true,
  mail_transport: 'phpmail',
  smtp_host: '',
  smtp_port: 465,
  smtp_encryption: 'ssl',
  smtp_username: '',
  smtp_password: '',
  mail_from_email: '',
  mail_from_name: '',
  notify_email: '',
  send_customer_ack: false,
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="adm-switch">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="adm-switch__track" />
      <span>{label}</span>
    </label>
  );
}

export default function EmailSettings() {
  const notify = useToast();
  const [form, setForm] = useState(blank);
  const [meta, setMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logMeta, setLogMeta] = useState({});
  const [logQuery, setLogQuery] = useState({ status: '', q: '', page: 1, limit: 20 });
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [resending, setResending] = useState(null);

  const loadSettings = useCallback(() => {
    api.adminMailSettings()
      .then((res) => {
        const d = res.data || {};
        setForm({ ...blank, ...d, smtp_password: '' });
        setMeta(d);
      })
      .catch((err) => notify(err.message, 'error'));
  }, [notify]);

  const loadLogs = useCallback(() => {
    setLoadingLogs(true);
    api.adminEmailLogs(logQuery)
      .then((res) => {
        setLogs(res.data || []);
        setLogMeta(res.meta || {});
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoadingLogs(false));
  }, [logQuery, notify]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const applyPreset = (p) => setForm((f) => ({
    ...f,
    mail_transport: 'smtp',
    smtp_host: p.host || f.smtp_host,
    smtp_port: p.port,
    smtp_encryption: p.encryption,
  }));
  const activePreset = PRESETS.find((p) => p.host && p.host === form.smtp_host) || (form.smtp_host ? PRESETS[4] : null);

  const save = async () => {
    setSaving(true);
    try {
      await api.adminSaveMailSettings(form);
      notify('Email settings saved');
      loadSettings();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.adminTestMail(testTo);
      setTestResult(res.data);
      notify(res.data?.status === 'sent' ? `Test email sent to ${res.data.to}` : 'Test email failed — see the error below', res.data?.status === 'sent' ? 'success' : 'error');
      loadLogs();
      loadSettings();
    } catch (err) {
      setTestResult({ status: 'failed', error: err.message });
      notify(err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const resend = async (row) => {
    setResending(row.id);
    try {
      const res = await api.adminResendEmail(row.id);
      notify(res.data?.status === 'sent' ? 'Email re-sent successfully' : `Resend failed: ${res.data?.error || 'unknown error'}`, res.data?.status === 'sent' ? 'success' : 'error');
      loadLogs();
      loadSettings();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setResending(null);
    }
  };

  const openLog = async (row) => {
    try {
      const res = await api.adminEmailLog(row.id);
      setViewing(res.data);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const stats = meta?.stats || {};
  const effective = meta?.effective || {};
  const isSmtp = form.mail_transport === 'smtp';
  const offset = ((logMeta.page || 1) - 1) * (logMeta.limit || 20);

  return (
    <div className="adm-page adm-page--wide">
      <PageHeader
        title="Email & Notifications"
        subtitle="Inquiry alerts to your team, optional confirmation emails to customers, and a full log of every email sent."
        actions={<Button icon={Save} loading={saving} onClick={save}>Save settings</Button>}
      />

      <div className="adm-stat-grid">
        <StatCard icon={CheckCircle2} tone="green" label="Delivered" value={stats.sent ?? '…'} hint="Emails accepted by the mail server" />
        <StatCard icon={XCircle} tone="red" label="Failed" value={stats.failed ?? '…'} hint="Open the log to see why & resend" onClick={() => setLogQuery((q) => ({ ...q, status: 'failed', page: 1 }))} />
        <StatCard icon={CircleSlash} tone="gray" label="Skipped" value={stats.skipped ?? '…'} hint="Notifications were turned off" />
        <StatCard icon={Inbox} tone="blue" label="Total logged" value={stats.total ?? '…'} hint="Every email attempt is recorded" />
      </div>

      <div className="mail-grid">
        <div className="mail-col">
          <Card
            title="Notifications"
            subtitle="Who should receive an email when someone submits an inquiry on the website."
            actions={<Badge tone={form.mail_enabled ? 'green' : 'gray'}>{form.mail_enabled ? 'On' : 'Off'}</Badge>}
          >
            <div className="adm-form-grid">
              <div className="is-full"><Toggle checked={form.mail_enabled} onChange={(v) => set('mail_enabled', v)} label="Send email notifications for new website inquiries" /></div>
              <Field label="Notify these email addresses" full hint="Separate several addresses with commas. Leave empty to use the main email from Website Info.">
                <input value={form.notify_email} onChange={(e) => set('notify_email', e.target.value)} placeholder="owner@example.com, sales@example.com" />
              </Field>
              <div className="is-full">
                <Toggle checked={form.send_customer_ack} onChange={(v) => set('send_customer_ack', v)} label="Also send customers a “we received your inquiry” email (when they enter an email)" />
              </div>
            </div>
          </Card>

          <Card title="Sending method" subtitle="An email account (SMTP) gives the most reliable delivery and avoids spam folders.">
            <div className="mail-methods">
              <button type="button" className={`mail-method${isSmtp ? ' is-on' : ''}`} onClick={() => set('mail_transport', 'smtp')}>
                <span className="mail-method__icon"><ShieldCheck size={20} /></span>
                <span><strong>Email account (SMTP)</strong><small>Recommended — sends from your own mailbox</small></span>
              </button>
              <button type="button" className={`mail-method${!isSmtp ? ' is-on' : ''}`} onClick={() => set('mail_transport', 'phpmail')}>
                <span className="mail-method__icon"><Server size={20} /></span>
                <span><strong>Server mail (basic)</strong><small>No setup, but may land in spam</small></span>
              </button>
            </div>

            {isSmtp && (
              <>
                <div className="mail-presets">
                  {PRESETS.map((p) => (
                    <button key={p.key} type="button" className={activePreset?.key === p.key ? 'is-on' : ''} onClick={() => applyPreset(p)}>{p.label}</button>
                  ))}
                </div>
                {activePreset && <p className="adm-alert tone-blue mail-note"><KeyRound size={15} /> {activePreset.note}</p>}
                <div className="adm-form-grid adm-form-grid--3">
                  <Field label="SMTP host" full><input value={form.smtp_host} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.hostinger.com" /></Field>
                  <Field label="Port"><input type="number" value={form.smtp_port} onChange={(e) => set('smtp_port', e.target.value)} /></Field>
                  <Field label="Security">
                    <select value={form.smtp_encryption} onChange={(e) => set('smtp_encryption', e.target.value)}>
                      <option value="ssl">SSL (port 465)</option>
                      <option value="tls">STARTTLS (port 587)</option>
                      <option value="none">None (not recommended)</option>
                    </select>
                  </Field>
                  <Field label="Username (email address)"><input value={form.smtp_username} onChange={(e) => set('smtp_username', e.target.value)} placeholder="noreply@yourdomain.com" autoComplete="off" /></Field>
                  <Field label="Password" full hint={meta?.has_password ? 'A password is saved (stored encrypted). Leave blank to keep it.' : 'Stored encrypted — never shown again after saving.'}>
                    <input type="password" value={form.smtp_password} onChange={(e) => set('smtp_password', e.target.value)} placeholder={meta?.has_password ? '•••••••• saved' : 'Mailbox or app password'} autoComplete="new-password" />
                  </Field>
                </div>
              </>
            )}

            <div className="adm-form-grid" style={{ marginTop: 16 }}>
              <Field label="From name" hint="Shown as the sender name"><input value={form.mail_from_name} onChange={(e) => set('mail_from_name', e.target.value)} placeholder="Terranexus Properties" /></Field>
              <Field label="From email" hint={isSmtp ? 'Usually the same as the SMTP username' : 'Should be an address on your domain'}>
                <input value={form.mail_from_email} onChange={(e) => set('mail_from_email', e.target.value)} placeholder="noreply@terranexusproperties.com" />
              </Field>
            </div>
            <div className="adm-form-actions">
              <Button icon={Save} loading={saving} onClick={save}>Save settings</Button>
            </div>
          </Card>
        </div>

        <div className="mail-col">
          <Card title="Current delivery" subtitle="What will happen for the next inquiry (after saving).">
            <dl className="mail-dl">
              <div><dt>Status</dt><dd><Badge tone={meta?.mail_enabled ? 'green' : 'gray'}>{meta?.mail_enabled ? 'Notifications on' : 'Notifications off'}</Badge></dd></div>
              <div><dt>Method</dt><dd>{effective.transport === 'smtp' ? `SMTP · ${meta?.smtp_host || ''}:${meta?.smtp_port || ''}` : 'Server mail (PHP mail)'}</dd></div>
              <div><dt>From</dt><dd>{effective.from || '—'}</dd></div>
              <div><dt>Alerts go to</dt><dd>{effective.recipients?.length ? effective.recipients.join(', ') : <span className="adm-muted">No address — add one above</span>}</dd></div>
              <div><dt>Customer email</dt><dd>{meta?.send_customer_ack ? 'Yes' : 'No'}</dd></div>
            </dl>
          </Card>

          <Card title="Send a test email" subtitle="Save your settings first, then check the inbox (and spam folder).">
            <div className="mail-test">
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={effective.recipients?.[0] || 'you@example.com'} />
              <Button icon={Send} loading={testing} onClick={sendTest}>Send test</Button>
            </div>
            {testResult && (
              <div className={`adm-alert ${testResult.status === 'sent' ? 'tone-green' : 'tone-red'} mail-result`}>
                {testResult.status === 'sent' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>
                  {testResult.status === 'sent'
                    ? `Delivered to the mail server for ${testResult.to}. Check the inbox in a minute.`
                    : `Failed: ${testResult.error || 'unknown error'}`}
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card
        title="Email log"
        subtitle="Every email the website has tried to send, newest first."
        actions={<SearchInput value={logQuery.q} onChange={(q) => setLogQuery((s) => ({ ...s, q, page: 1 }))} placeholder="Search recipient, subject, customer…" />}
        flush
      >
        <div className="mail-log-tabs">
          <FilterTabs
            items={LOG_TABS.map((t) => ({ ...t, key: t.key || 'all' }))}
            value={logQuery.status || 'all'}
            onChange={(k) => setLogQuery((s) => ({ ...s, status: k === 'all' ? '' : k, page: 1 }))}
          />
        </div>
        <DataTable
          loading={loadingLogs}
          rows={logs}
          empty={<EmptyState icon={MailCheck} title="No emails yet" text="Inquiry alerts and test emails will appear here." />}
          columns={[
            { key: 'sr', header: '#', width: 48, render: (_r, i) => <span className="adm-muted">{offset + i + 1}</span> },
            { key: 'created_at', header: 'Date', render: (r) => <span className="adm-nowrap">{formatDateTime(r.created_at)}</span> },
            {
              key: 'email_type',
              header: 'Type',
              render: (r) => {
                const t = TYPE_LABELS[r.email_type] || { label: r.email_type, tone: 'gray' };
                return <Badge tone={t.tone}>{t.label}</Badge>;
              },
            },
            {
              key: 'recipient',
              header: 'To',
              render: (r) => (
                <div className="adm-cell-stack">
                  <span className="adm-truncate" title={r.recipient}>{r.recipient}</span>
                  {r.enquiry_name && <small>Inquiry: {r.enquiry_name}</small>}
                </div>
              ),
            },
            { key: 'subject', header: 'Subject', render: (r) => <span className="adm-truncate" title={r.subject}>{r.subject}</span> },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <div className="adm-cell-stack">
                  <Badge tone={STATUS_TONES[r.status] || 'gray'}>{r.status}</Badge>
                  {r.error && <small className="mail-error" title={r.error}>{r.error}</small>}
                </div>
              ),
            },
            { key: 'attempts', header: 'Tries', align: 'center', render: (r) => r.attempts },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (r) => (
                <div className="adm-actions">
                  <IconAction icon={Eye} label="View email" tone="teal" onClick={() => openLog(r)} />
                  {r.status !== 'sent' && r.recipient !== '-' && (
                    resending === r.id
                      ? <span className="adm-spinner" />
                      : <IconAction icon={RotateCw} label="Resend" tone="amber" onClick={() => resend(r)} />
                  )}
                </div>
              ),
            },
          ]}
        />
        <Pagination
          meta={logMeta}
          onPage={(page) => setLogQuery((s) => ({ ...s, page }))}
          onLimit={(limit) => setLogQuery((s) => ({ ...s, limit, page: 1 }))}
        />
      </Card>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing?.subject || 'Email'}
        subtitle={viewing ? `To ${viewing.recipient} · ${formatDateTime(viewing.created_at)} · ${viewing.status}${viewing.transport ? ` via ${viewing.transport}` : ''}` : ''}
      >
        {viewing && (
          <>
            {viewing.error && <div className="adm-alert tone-red" style={{ marginBottom: 14 }}><XCircle size={16} /> {viewing.error}</div>}
            <iframe className="mail-preview" title="Email preview" sandbox="" srcDoc={viewing.body || '<p>No content</p>'} />
            {viewing.status !== 'sent' && viewing.recipient !== '-' && (
              <div className="adm-form-actions" style={{ marginTop: 14 }}>
                <Button icon={RotateCw} loading={resending === viewing.id} onClick={async () => { await resend(viewing); setViewing(null); }}>Resend now</Button>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
