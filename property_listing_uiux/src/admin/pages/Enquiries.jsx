import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarClock, CalendarDays, CircleCheck, Eye, Mail, MapPin, MessageSquarePlus, MessageSquareText, Pencil,
  Phone, Plus, RotateCcw, Trash2, UserRound,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  Badge, Button, Card, DataTable, EmptyState, Field, FilterTabs, IconAction, Modal, OptionBadge, PageHeader,
  Pagination, SearchInput, SearchSelect, Select, Toolbar, cleanParams, useToast,
} from '../ui';
import {
  CONTACT_MODES, ENQUIRY_STATUSES, ENQUIRY_TABS, LEAD_TYPES, findOption, humanize,
} from '../constants';
import {
  dueState, formatDate, formatDateTime, inqCode, telHref, toInputDate, todayInputDate,
} from '../format';

const FILTER_KEYS = ['tab', 'q', 'type_id', 'lead_type', 'property_id', 'date_from', 'date_to'];

const statusOptions = ENQUIRY_STATUSES.map(({ value, label }) => ({ value, label }));
const leadOptions = LEAD_TYPES.map(({ value, label }) => ({ value, label }));

/** Remote property search for the inquiry form. */
async function searchProperties(q) {
  const res = await api.adminProperties(cleanParams({ q, limit: 20, sort: 'created' }));
  return (res.data || []).map((p) => ({
    value: p.id,
    label: p.title,
    sub: [p.property_code, p.type_name, p.location_name || p.city].filter(Boolean).join(' · '),
    type_id: p.type_id,
  }));
}

/* ——— Add / edit inquiry ——— */

const blankEnquiry = {
  name: '',
  mobile: '',
  email: '',
  city: '',
  property_id: '',
  property_type_id: '',
  lead_type: 'normal',
  status: 'new',
  follow_up_date: '',
  preferred_contact: 'any',
  message: '',
};

function EnquiryFormModal({ open, enquiry, types, onClose, onSaved }) {
  const notify = useToast();
  const isEdit = !!enquiry?.id;
  const [form, setForm] = useState(blankEnquiry);
  const [propertyLabel, setPropertyLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (enquiry) {
      setForm({
        ...blankEnquiry,
        ...Object.fromEntries(Object.keys(blankEnquiry).map((k) => [k, enquiry[k] ?? blankEnquiry[k]])),
        property_type_id: enquiry.property_type_id || enquiry.type_id || '',
        follow_up_date: toInputDate(enquiry.follow_up_date),
      });
      setPropertyLabel(enquiry.property_name || '');
    } else {
      setForm(blankEnquiry);
      setPropertyLabel('');
    }
  }, [open, enquiry]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      ...form,
      property_id: form.property_id ? Number(form.property_id) : null,
      property_type_id: form.property_type_id ? Number(form.property_type_id) : null,
      follow_up_date: form.follow_up_date || null,
    };
    try {
      if (isEdit) await api.adminUpdateEnquiry(enquiry.id, payload);
      else await api.adminCreateEnquiry(payload);
      notify(isEdit ? 'Inquiry updated' : 'Inquiry added');
      onSaved();
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])));
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit Inquiry' : 'Add Inquiry'}
      subtitle={isEdit ? `${inqCode(enquiry.id)} · created ${formatDateTime(enquiry.created_at)}` : 'Record a walk-in, phone call or referral lead.'}
    >
      <form className="adm-form-grid" onSubmit={save}>
        <Field label="Customer name" required error={errors.name}>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Contact number" required error={errors.mobile}>
          <input required value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="10-digit mobile" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="City">
          <input value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Interested property" full hint="Search by property name, code, type or location.">
          <SearchSelect
            value={form.property_id}
            selectedLabel={propertyLabel}
            loadOptions={searchProperties}
            placeholder="Search property (optional)…"
            onChange={(v, opt) => {
              setPropertyLabel(opt?.label || '');
              setForm((f) => ({
                ...f,
                property_id: v,
                property_type_id: opt?.type_id ? String(opt.type_id) : f.property_type_id,
              }));
            }}
          />
        </Field>
        <Field label="Property type">
          <select value={form.property_type_id || ''} onChange={(e) => set('property_type_id', e.target.value)}>
            <option value="">Select type</option>
            {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Lead type">
          <select value={form.lead_type} onChange={(e) => set('lead_type', e.target.value)}>
            {leadOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Inquiry status">
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Next follow-up date">
          <input type="date" value={form.follow_up_date || ''} onChange={(e) => set('follow_up_date', e.target.value)} />
        </Field>
        <Field label="Preferred contact">
          <select value={form.preferred_contact} onChange={(e) => set('preferred_contact', e.target.value)}>
            <option value="any">Any</option>
            <option value="call">Call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </Field>
        <Field label="Requirement / message" full>
          <textarea rows={3} value={form.message || ''} onChange={(e) => set('message', e.target.value)} placeholder="Budget, preferred area, timeline…" />
        </Field>
        <div className="adm-form-actions is-full">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} icon={isEdit ? Pencil : Plus}>{isEdit ? 'Update Inquiry' : 'Save Inquiry'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ——— Conversation history ——— */

function HistoryItem({ item }) {
  const status = findOption(ENQUIRY_STATUSES, item.status);
  const mode = findOption(CONTACT_MODES, item.contact_mode);
  return (
    <li className="adm-history__item">
      <div className="adm-history__top">
        <span className="adm-history__date">{formatDateTime(item.created_at)}</span>
        <Badge tone="gray">{(item.admin_name || item.admin_role || 'Admin').toUpperCase()}</Badge>
      </div>
      <p className="adm-history__comment">{item.comment}</p>
      {item.client_feedback && (
        <div className="adm-history__feedback">
          <span>Client feedback</span>
          <p>{item.client_feedback}</p>
        </div>
      )}
      <div className="adm-history__chips">
        {status && <Badge tone="gray" icon={CircleCheck}>Status → {status.label}</Badge>}
        {mode && <Badge tone="blue">{mode.label}</Badge>}
        {item.next_follow_up_date && <Badge tone="amber" icon={CalendarDays}>Next: {formatDate(item.next_follow_up_date)}</Badge>}
      </div>
    </li>
  );
}

function History({ items, loading }) {
  if (loading) return <div className="adm-history"><span className="adm-shimmer" /><span className="adm-shimmer" /></div>;
  if (!items.length) {
    return <EmptyState icon={MessageSquareText} title="No conversation yet" text="Follow-ups you record will appear here, newest first." />;
  }
  return <ul className="adm-history">{items.map((f) => <HistoryItem key={f.id} item={f} />)}</ul>;
}

/* ——— Follow-up modal (matches reference) ——— */

function FollowUpModal({ open, enquiry, onClose, onSaved }) {
  const notify = useToast();
  const [form, setForm] = useState({ comment: '', client_feedback: '', contact_mode: 'call', next_follow_up_date: '', status: 'in_progress' });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !enquiry) return;
    setForm({
      comment: '',
      client_feedback: '',
      contact_mode: 'call',
      next_follow_up_date: '',
      status: enquiry.status === 'new' ? 'in_progress' : enquiry.status,
    });
    setLoading(true);
    api.adminFollowUps(enquiry.id)
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open, enquiry]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.comment.trim()) return;
    setSaving(true);
    try {
      const res = await api.adminAddFollowUp(enquiry.id, { ...form, next_follow_up_date: form.next_follow_up_date || null });
      setHistory(res.data?.followups || []);
      notify('Follow-up saved');
      onSaved(res.data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!enquiry) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Add Follow Up"
      subtitle={`Recording for: ${enquiry.name} · ${inqCode(enquiry.id)}`}
      bodyClassName="adm-split"
    >
      <form className="adm-split__main" onSubmit={save}>
        <div className="adm-split__scroll">
        <Field label="Comment / Notes" required>
          <textarea rows={4} required value={form.comment} onChange={(e) => set('comment', e.target.value)} placeholder="What happened in this follow up?" />
        </Field>
        <Field label="Client feedback">
          <textarea rows={3} value={form.client_feedback} onChange={(e) => set('client_feedback', e.target.value)} placeholder="What did the client say? (budget, liked / disliked, objections…)" />
        </Field>
        <div className="adm-form-grid">
          <Field label="Contact mode">
            <select value={form.contact_mode} onChange={(e) => set('contact_mode', e.target.value)}>
              {CONTACT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Next follow up date">
            <input type="date" min={todayInputDate()} value={form.next_follow_up_date} onChange={(e) => set('next_follow_up_date', e.target.value)} />
          </Field>
          <Field label="Inquiry status" full>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        </div>
        <div className="adm-form-actions adm-form-actions--split">
          <Button variant="ghost" size="lg" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="blue" size="lg" loading={saving}>Save Follow Up</Button>
        </div>
      </form>
      <aside className="adm-split__side">
        <span className="adm-side-title">Conversation history</span>
        <History items={history} loading={loading} />
      </aside>
    </Modal>
  );
}

/* ——— View inquiry ——— */

function ViewModal({ open, enquiryId, onClose, onFollowUp, onEdit }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!open || !enquiryId) return;
    setData(null);
    api.adminEnquiry(enquiryId).then((res) => setData(res.data)).catch(() => setData(false));
  }, [open, enquiryId]);

  const lead = data ? findOption(LEAD_TYPES, data.lead_type) : null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={data ? data.name : 'Inquiry'}
      subtitle={data ? `${inqCode(data.id)} · received ${formatDateTime(data.created_at)} · via ${humanize(data.source || 'website')}` : 'Loading…'}
      bodyClassName="adm-split"
    >
      {data === null && <div className="adm-split__main"><span className="adm-shimmer" /><span className="adm-shimmer" /></div>}
      {data === false && <EmptyState title="Could not load inquiry" />}
      {data && (
        <>
          <div className="adm-split__main">
            <div className="adm-split__scroll">
            <div className="adm-detail-chips">
              <OptionBadge list={ENQUIRY_STATUSES} value={data.status} />
              {lead && <Badge tone={lead.tone}>{lead.label} lead</Badge>}
              {data.follow_up_date && <Badge tone="amber" icon={CalendarClock}>Follow up {formatDate(data.follow_up_date)}</Badge>}
            </div>
            <dl className="adm-dl">
              <div><dt><Phone size={14} /> Contact</dt><dd><a href={telHref(data.mobile)}>{data.mobile}</a></dd></div>
              <div><dt><Mail size={14} /> Email</dt><dd>{data.email || '—'}</dd></div>
              <div><dt><MapPin size={14} /> City</dt><dd>{data.city || '—'}</dd></div>
              <div><dt><UserRound size={14} /> Prefers</dt><dd>{humanize(data.preferred_contact)}</dd></div>
              <div className="is-full">
                <dt>Property</dt>
                <dd>
                  {data.property_name || 'General inquiry'}
                  {data.property_code && <Badge tone="green">{data.property_code}</Badge>}
                  {data.type_name && <Badge tone="gray">{data.type_name}</Badge>}
                  {data.property_slug && (
                    <a className="adm-link" href={`/property/${data.property_slug}`} target="_blank" rel="noreferrer"> View listing</a>
                  )}
                </dd>
              </div>
              <div className="is-full"><dt>Message</dt><dd className="adm-pre">{data.message || '—'}</dd></div>
              {data.admin_notes && <div className="is-full"><dt>Admin notes</dt><dd className="adm-pre">{data.admin_notes}</dd></div>}
              {data.email_logs?.length > 0 && (
                <div className="is-full">
                  <dt>Email notifications</dt>
                  <dd className="inq-mail">
                    {data.email_logs.map((m) => (
                      <Badge key={m.id} tone={m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : 'gray'}>
                        {m.email_type === 'customer_ack' ? 'Customer email' : 'Owner alert'}: {m.status}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            </div>
            <div className="adm-form-actions">
              <Button variant="ghost" icon={Phone} href={telHref(data.mobile)}>Call</Button>
              <Button variant="ghost" icon={Pencil} onClick={() => onEdit(data)}>Edit</Button>
              <Button icon={MessageSquarePlus} onClick={() => onFollowUp(data)}>Add Follow Up</Button>
            </div>
          </div>
          <aside className="adm-split__side">
            <span className="adm-side-title">Conversation history</span>
            <History items={data.followups || []} />
          </aside>
        </>
      )}
    </Modal>
  );
}

/* ——— Page ——— */

export default function Enquiries() {
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [formModal, setFormModal] = useState({ open: false, enquiry: null });
  const [followUp, setFollowUp] = useState(null);
  const [viewId, setViewId] = useState(null);

  const state = {
    page: Number(params.get('page')) || 1,
    limit: Number(params.get('limit')) || 20,
    ...Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])),
  };
  const tab = state.tab || 'all';
  const query = params.toString();

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v == null || (k === 'tab' && v === 'all')) next.delete(k);
      else next.set(k, String(v));
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.adminTypes()
      .then((res) => setTypes((res.data || []).map((t) => ({ value: String(t.id), label: t.name }))))
      .catch(() => setTypes([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.adminEnquiries(cleanParams(state))
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (row, status) => {
    try {
      await api.adminUpdateEnquiry(row.id, { status });
      notify(`Status set to ${findOption(ENQUIRY_STATUSES, status)?.label || status}`);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete inquiry from ${row.name}?`)) return;
    try {
      await api.adminDeleteEnquiry(row.id);
      notify('Inquiry deleted');
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const counts = meta.counts || {};
  const tabs = ENQUIRY_TABS.map((t) => ({ ...t, count: counts[t.key] ?? (t.key === 'all' ? meta.total : undefined) }));
  const advancedActive = ['type_id', 'lead_type', 'property_id', 'date_from', 'date_to'].some((k) => state[k]);
  const offset = ((meta.page || 1) - 1) * (meta.limit || state.limit);

  const columns = [
    { key: 'sr', header: '#', width: 48, render: (_r, i) => <span className="adm-muted">{offset + i + 1}</span> },
    { key: 'id', header: 'Inq ID', render: (r) => <Badge tone="green" className="adm-mono">{inqCode(r.id)}</Badge> },
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <button type="button" className="adm-name-btn" onClick={() => setViewId(r.id)}>
          {String(r.name || '').toUpperCase()}
        </button>
      ),
    },
    {
      key: 'mobile',
      header: 'Contact / Email',
      render: (r) => (
        <div className="adm-cell-stack adm-contact-cell">
          <a href={telHref(r.mobile)}>{r.mobile || '—'}</a>
          <small title={r.email || ''}>{r.email || 'No email'}</small>
        </div>
      ),
    },
    { key: 'city', header: 'City', render: (r) => <span className="adm-muted">{r.city || '—'}</span> },
    {
      key: 'property_name',
      header: 'Property',
      render: (r) => (
        <div className="adm-cell-stack">
          <span className="adm-tag adm-truncate adm-truncate--sm" title={r.property_name || ''}>{r.property_name || 'General'}</span>
          {r.type_name && <small>{r.type_name}</small>}
        </div>
      ),
    },
    {
      key: 'lead_type',
      header: 'Type',
      render: (r) => {
        const lead = findOption(LEAD_TYPES, r.lead_type || 'normal');
        return <Badge tone={lead?.tone || 'gray'} className="adm-caps-badge">{lead?.label || r.lead_type}</Badge>;
      },
    },
    {
      key: 'follow_up_date',
      header: 'Follow Up',
      render: (r) => {
        if (!r.follow_up_date) return <span className="adm-muted">—</span>;
        const due = dueState(r.follow_up_date);
        const open = ['new', 'in_progress', 'contacted'].includes(r.status);
        return (
          <div className="adm-cell-stack">
            <strong className="adm-nowrap">{formatDate(r.follow_up_date)}</strong>
            {open && (
              <small className={`adm-due adm-due--${due}`}>
                {due === 'overdue' ? 'Overdue' : due === 'today' ? 'Today' : 'Pending'}
              </small>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const opt = findOption(ENQUIRY_STATUSES, r.status);
        return (
          <select
            className={`adm-status-select tone-${opt?.tone || 'gray'}`}
            value={r.status}
            onChange={(e) => setStatus(r, e.target.value)}
            aria-label="Change status"
          >
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      },
    },
    { key: 'created_at', header: 'Date', render: (r) => <span className="adm-muted adm-nowrap" title={formatDateTime(r.created_at)}>{formatDate(r.created_at)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="adm-actions">
          <IconAction icon={Phone} label={`Call ${r.mobile}`} tone="blue" href={telHref(r.mobile)} />
          <IconAction icon={MessageSquarePlus} label="Add follow up" tone="green" onClick={() => setFollowUp(r)} />
          <IconAction icon={Eye} label="View" tone="teal" onClick={() => setViewId(r.id)} />
          <IconAction icon={Pencil} label="Edit" tone="amber" onClick={() => setFormModal({ open: true, enquiry: r })} />
          <IconAction icon={Trash2} label="Delete" tone="red" onClick={() => remove(r)} />
        </div>
      ),
    },
  ];

  return (
    <div className="adm-page adm-page--wide">
      <PageHeader
        title="Inquiries"
        subtitle="Manage and track all incoming inquiries, follow-ups and client feedback."
        actions={<Button icon={Plus} variant="success" onClick={() => setFormModal({ open: true, enquiry: null })}>Add Inquiry</Button>}
      />

      <Card bodyClassName="adm-filter-card">
        <div className="adm-filter-row">
          <FilterTabs items={tabs} value={tab} onChange={(key) => update({ tab: key })} />
          <SearchInput
            className="adm-search--wide"
            value={state.q}
            onChange={(q) => update({ q })}
            placeholder="Search name, phone, ID, property or type…"
          />
        </div>
        <Toolbar>
          <Select value={state.type_id} onChange={(v) => update({ type_id: v })} options={types} placeholder="All property types" />
          <Select value={state.lead_type} onChange={(v) => update({ lead_type: v })} options={leadOptions} placeholder="All lead types" />
          <label className="adm-date-filter">
            From
            <input type="date" value={state.date_from} onChange={(e) => update({ date_from: e.target.value })} />
          </label>
          <label className="adm-date-filter">
            To
            <input type="date" value={state.date_to} onChange={(e) => update({ date_to: e.target.value })} />
          </label>
          {state.property_id && <Badge tone="teal">Filtered by property #{state.property_id}</Badge>}
          {advancedActive && (
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={() => update({ type_id: '', lead_type: '', property_id: '', date_from: '', date_to: '' })}
            >
              Reset filters
            </Button>
          )}
        </Toolbar>
      </Card>

      <Card flush>
        <DataTable
          loading={loading}
          rows={rows}
          columns={columns}
          rowClassName={(r) => (dueState(r.follow_up_date) === 'overdue' && ['new', 'in_progress', 'contacted'].includes(r.status) ? 'is-attention' : '')}
          empty={(
            <EmptyState
              icon={MessageSquareText}
              title="No inquiries found"
              text={state.q || advancedActive || tab !== 'all' ? 'Try another tab, search or filter.' : 'Inquiries from the website and the ones you add will show here.'}
            />
          )}
        />
        <Pagination meta={meta} onPage={(page) => update({ page })} onLimit={(limit) => update({ limit })} />
      </Card>

      <EnquiryFormModal
        open={formModal.open}
        enquiry={formModal.enquiry}
        types={types}
        onClose={() => setFormModal({ open: false, enquiry: null })}
        onSaved={() => { setFormModal({ open: false, enquiry: null }); load(); }}
      />
      <FollowUpModal
        open={!!followUp}
        enquiry={followUp}
        onClose={() => setFollowUp(null)}
        onSaved={() => { setFollowUp(null); load(); }}
      />
      <ViewModal
        open={!!viewId}
        enquiryId={viewId}
        onClose={() => setViewId(null)}
        onFollowUp={(row) => { setViewId(null); setFollowUp(row); }}
        onEdit={(row) => { setViewId(null); setFormModal({ open: true, enquiry: row }); }}
      />
    </div>
  );
}
