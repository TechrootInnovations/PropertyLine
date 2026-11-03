import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2, ExternalLink, MapPin, Pencil, Plus, RotateCcw, Star, Trash2, UserRound,
} from 'lucide-react';
import { api, formatPrice } from '../../lib/api';
import {
  Badge, Button, Card, DataTable, EmptyState, IconAction, PageHeader, Pagination, SearchInput, Select,
  Toolbar, cleanParams, useToast,
} from '../ui';
import { PROPERTY_STATUS_TONES, humanize } from '../constants';
import { formatDate } from '../format';

const FILTER_KEYS = ['q', 'type_id', 'location_id', 'purpose', 'status', 'seller_id'];

export default function Properties() {
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [lookups, setLookups] = useState({ types: [], locations: [], sellers: [], purpose: [], status: [] });

  const state = {
    page: Number(params.get('page')) || 1,
    limit: Number(params.get('limit')) || 20,
    ...Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])),
  };
  const query = params.toString();

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, String(v));
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    Promise.all([
      api.adminTypes().catch(() => ({ data: [] })),
      api.adminLocations().catch(() => ({ data: [] })),
      api.adminSellers().catch(() => ({ data: [] })),
      api.adminOptions().catch(() => ({ data: [] })),
    ]).then(([t, l, s, o]) => {
      const opts = o.data || [];
      setLookups({
        types: (t.data || []).map((x) => ({ value: String(x.id), label: x.name })),
        locations: (l.data || []).map((x) => ({ value: String(x.id), label: x.name })),
        sellers: (s.data || []).map((x) => ({ value: String(x.id), label: x.name })),
        purpose: opts.filter((x) => x.master_type === 'purpose').map((x) => ({ value: x.value, label: x.name })),
        status: opts.filter((x) => x.master_type === 'status').map((x) => ({ value: x.value, label: x.name })),
      });
    });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.adminProperties(cleanParams({ ...state, sort: 'created' }))
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!confirm(`Delete “${row.title}”?`)) return;
    try {
      await api.adminDeleteProperty(row.id);
      notify('Property deleted');
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const activeFilters = FILTER_KEYS.filter((k) => state[k]).length;
  const offset = ((meta.page || 1) - 1) * (meta.limit || state.limit);

  const columns = [
    { key: 'sr', header: 'Sr.', width: 56, render: (_r, i) => <span className="adm-muted">{offset + i + 1}</span> },
    {
      key: 'title',
      header: 'Property',
      render: (r) => (
        <div className="adm-prop-cell">
          {r.main_image ? <img src={r.main_image} alt="" /> : <span className="adm-prop-cell__ph"><Building2 size={16} /></span>}
          <div className="adm-cell-stack">
            <Link to={`/admin/properties/${r.id}`} className="adm-strong-link">{r.title}</Link>
            <small>
              <Badge tone="green">{r.property_code}</Badge>
              {r.is_featured && <Badge tone="amber" icon={Star}>Featured</Badge>}
            </small>
          </div>
        </div>
      ),
    },
    {
      key: 'type_name',
      header: 'Property Type',
      render: (r) => (
        <div className="adm-cell-stack">
          <span className="adm-tag">{r.type_name || '—'}</span>
          <small>{r.category_name}</small>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (r) => (
        <div className="adm-cell-stack">
          <span className="adm-inline-icon"><MapPin size={13} /> {r.location_name || r.city || '—'}</span>
          {r.locality && <small>{r.locality}</small>}
        </div>
      ),
    },
    {
      key: 'seller_name',
      header: 'Seller / Owner',
      render: (r) => (r.seller_name ? (
        <div className="adm-cell-stack">
          <span className="adm-inline-icon"><UserRound size={13} /> {r.seller_name}</span>
          {r.seller_phone && <small>{r.seller_phone}</small>}
        </div>
      ) : <span className="adm-muted">—</span>),
    },
    { key: 'purpose', header: 'Purpose', render: (r) => <span className="adm-caps">{humanize(r.purpose)}</span> },
    { key: 'price', header: 'Price', render: (r) => <strong className="adm-nowrap">{r.price_formatted || formatPrice(r)}</strong> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={PROPERTY_STATUS_TONES[r.status] || 'gray'}>{humanize(r.status)}</Badge>,
    },
    {
      key: 'enquiries_count',
      header: 'Inquiries',
      align: 'center',
      render: (r) => (Number(r.enquiries_count) ? (
        <Link className="adm-count-link" to={`/admin/enquiries?property_id=${r.id}`}>{r.enquiries_count}</Link>
      ) : <span className="adm-muted">0</span>),
    },
    { key: 'created_at', header: 'Added', render: (r) => <span className="adm-muted adm-nowrap">{formatDate(r.created_at)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="adm-actions">
          {r.status === 'published' && (
            <IconAction icon={ExternalLink} label="View on website" tone="teal" href={`/property/${r.slug}`} target="_blank" />
          )}
          <IconAction icon={Pencil} label="Edit" tone="amber" to={`/admin/properties/${r.id}`} />
          <IconAction icon={Trash2} label="Delete" tone="red" onClick={() => remove(r)} />
        </div>
      ),
    },
  ];

  return (
    <div className="adm-page">
      <PageHeader
        title="Properties"
        subtitle="Create, search, edit and publish your property listings."
        actions={<Button icon={Plus} to="/admin/properties/new">Add Property</Button>}
      />

      <Card bodyClassName="adm-filter-card">
        <Toolbar>
          <SearchInput
            className="adm-grow"
            value={state.q}
            onChange={(q) => update({ q })}
            placeholder="Search title, code, location, type or seller…"
          />
          <Select value={state.type_id} onChange={(v) => update({ type_id: v })} options={lookups.types} placeholder="All types" />
          <Select value={state.location_id} onChange={(v) => update({ location_id: v })} options={lookups.locations} placeholder="All locations" />
          <Select value={state.purpose} onChange={(v) => update({ purpose: v })} options={lookups.purpose} placeholder="Any purpose" />
          <Select value={state.status} onChange={(v) => update({ status: v })} options={lookups.status} placeholder="Any status" />
          <Select value={state.seller_id} onChange={(v) => update({ seller_id: v })} options={lookups.sellers} placeholder="All sellers" />
          {activeFilters > 0 && (
            <Button variant="ghost" icon={RotateCcw} onClick={() => setParams({}, { replace: true })}>Reset</Button>
          )}
        </Toolbar>
      </Card>

      <Card flush>
        <DataTable
          loading={loading}
          rows={rows}
          columns={columns}
          empty={(
            <EmptyState
              icon={Building2}
              title={activeFilters ? 'No properties match your filters' : 'No properties yet'}
              text={activeFilters ? 'Try a different search or reset filters.' : 'Create your first listing to get started.'}
              action={!activeFilters && <Button icon={Plus} to="/admin/properties/new">Add Property</Button>}
            />
          )}
        />
        <Pagination
          meta={meta}
          onPage={(page) => update({ page })}
          onLimit={(limit) => update({ limit })}
        />
      </Card>
    </div>
  );
}
